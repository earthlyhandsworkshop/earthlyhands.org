"""Bounded, fictional, offline two-instrument copy-and-verify experiment.

This does NOT connect to Cloudflare or move the live Workshop corpus. A supplied
snapshot is an untrusted representation, not verified source custody.
"""
import hashlib
import json
import sqlite3
from pathlib import Path

SCHEMA = Path(__file__).with_name('schema.sql')


def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


def digest(obj):
    return hashlib.sha256(canonical(obj).encode('utf-8')).hexdigest()


def ensure_db(db):
    db.execute('PRAGMA foreign_keys=ON')
    db.executescript(SCHEMA.read_text(encoding='utf-8'))


def validate(snapshot):
    if set(snapshot) != {'origin_database','instrument','visibility','records'}:
        raise ValueError('invalid_snapshot_shape')
    if snapshot['visibility'] != 'fictional-staging':
        raise ValueError('only_fictional_staging_accepted')
    if not all(isinstance(snapshot[k], str) and 1 <= len(snapshot[k]) <= 150 for k in ('origin_database','instrument')):
        raise ValueError('invalid_origin')
    records = snapshot['records']
    if not isinstance(records, list) or not 1 <= len(records) <= 100:
        raise ValueError('invalid_record_count')
    required = {'origin_table','origin_id','source_road','source_proposition','record_kind',
                'source_standing','hand_label','hand_standing','source_verb',
                'occurrence_order','payload'}
    seen = set()
    for rec in records:
        if not isinstance(rec, dict) or set(rec) != required:
            raise ValueError('invalid_record_shape')
        if not all(isinstance(rec[k], str) and 1 <= len(rec[k]) <= 1024 for k in required - {'payload','occurrence_order'}):
            raise ValueError('invalid_string_field')
        key = (rec['origin_table'], rec['origin_id'])
        if key in seen:
            raise ValueError('duplicate_source_identity')
        seen.add(key)
        if rec['source_standing'] != 'invented-fixture' or rec['hand_standing'] != 'unverified-test-label':
            raise ValueError('unearned_standing')
        if not rec['source_road'].startswith('fiction://'):
            raise ValueError('real_source_not_permitted_in_test')
        if rec['record_kind'] not in ('source-occurrence','source-assertion','interpretation','change-event'):
            raise ValueError('invalid_kind')
        if type(rec['occurrence_order']) is not int or rec['occurrence_order'] < 0:
            raise ValueError('invalid_order')
        if not isinstance(rec['payload'], dict) or not rec['payload']:
            raise ValueError('invalid_payload')
    return True


def copy_one(db, snapshot, fail_after=None):
    """One atomic insert; retry same bytes -> existing; changed origin -> refuse.

    Do not use this function on the live D1; a real copy needs authenticated
    export, permission checking and origin-consistent snapshot receipts.
    """
    validate(snapshot)
    snapshot_hash = digest(snapshot)
    run_id = 'fictional-snapshot-' + snapshot_hash[:40]
    db.execute('BEGIN IMMEDIATE')
    try:
        prior = db.execute('SELECT origin_snapshot_sha256, count_expected FROM bench_crossing_runs_v0 WHERE run_id=?',(run_id,)).fetchone()
        if prior is not None:
            if prior != (snapshot_hash,len(snapshot['records'])):
                raise ValueError('receipt_mismatch')
            # Even a matching run receipt must not mask missing or altered rows.
            actual = db.execute('SELECT COUNT(*) FROM bench_crossing_records_v0 WHERE run_id=?',(run_id,)).fetchone()[0]
            if actual != len(snapshot['records']):
                raise ValueError('partial_receipt')
            db.commit()
            return {'run_id':run_id,'status':'unchanged','count':actual}
        db.execute('INSERT INTO bench_crossing_runs_v0(run_id,origin_database,instrument,origin_snapshot_sha256,count_expected,visibility,receipt_standing) VALUES(?,?,?,?,?,?,?)',
                   (run_id,snapshot['origin_database'],snapshot['instrument'],snapshot_hash,len(snapshot['records']),'fictional-staging','copy-receipt-not-source-authority'))
        for i,rec in enumerate(snapshot['records']):
            payload = canonical(rec['payload'])
            db.execute('INSERT INTO bench_crossing_records_v0(origin_database,origin_table,origin_id,run_id,instrument,source_road,source_proposition,record_kind,source_standing,hand_label,hand_standing,source_verb,occurrence_order,payload_json,payload_sha256) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                (snapshot['origin_database'],rec['origin_table'],rec['origin_id'],run_id,snapshot['instrument'],rec['source_road'],rec['source_proposition'],rec['record_kind'],rec['source_standing'],rec['hand_label'],rec['hand_standing'],rec['source_verb'],rec['occurrence_order'],payload,digest(rec['payload'])))
            if fail_after is not None and i+1==fail_after:
                raise RuntimeError('deliberate_partial_copy_failure')
        db.commit()
        return {'run_id':run_id,'status':'copied','count':len(snapshot['records'])}
    except Exception:
        db.rollback()
        raise


def inspect(db):
    """Simple current read of an already-copied local specimen."""
    rows = db.execute('SELECT origin_database,instrument,record_kind,source_road,source_proposition,origin_id,hand_label,hand_standing,source_verb,receipt_standing FROM bench_glance_v0 ORDER BY instrument,source_proposition,occurrence_order,origin_id').fetchall()
    return rows


def run_cli():
    import argparse
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('sqlite_path',help='Disposable local SQLite destination path')
    p.add_argument('snapshots',nargs='+',help='Locally reviewed synthetic JSON snapshots')
    args=p.parse_args()
    db=sqlite3.connect(args.sqlite_path)
    ensure_db(db)
    for f in args.snapshots:
        snap=json.loads(Path(f).read_text(encoding='utf-8'))
        print(Path(f).name,copy_one(db,snap))
    print('foreign_key_check:',db.execute('PRAGMA foreign_key_check').fetchall())
    for row in inspect(db):
        print(' | '.join(str(v) for v in row))

if __name__=='__main__':
    run_cli()
