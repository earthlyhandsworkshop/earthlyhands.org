import json
import sqlite3
import unittest
from copy import deepcopy
from pathlib import Path
from bridge import ensure_db, copy_one, inspect, digest, validate

HERE = Path(__file__).parent

def load(name):
    return json.loads((HERE / name).read_text(encoding='utf-8'))

class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(':memory:')
        ensure_db(self.db)
        self.m=load('mullion-fictional.json')
        self.r=load('ravel-fictional.json')

    def test_two_instruments_and_road_home(self):
        self.assertEqual(copy_one(self.db,self.m)['status'],'copied')
        self.assertEqual(copy_one(self.db,self.r)['status'],'copied')
        self.assertEqual(len(inspect(self.db)),7)
        self.assertEqual(self.db.execute('PRAGMA foreign_key_check').fetchall(),[])
        self.assertEqual(self.db.execute('SELECT COUNT(DISTINCT instrument) FROM bench_glance_v0').fetchone()[0],2)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bench_crossing_runs_v0').fetchone()[0],2)
        self.assertEqual(self.db.execute("SELECT origin_id FROM bench_latest_change_by_proposition_v1 WHERE instrument='Mullion'").fetchone()[0],'mtv0-fixture-001-c03')
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM bench_latest_change_by_proposition_v1 WHERE instrument='Ravel'").fetchone()[0],0)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM bench_readings_by_proposition_v1 WHERE instrument='Ravel'").fetchone()[0],2)
        # A historical sentence remains in its own occurrence even after dissent.
        self.assertEqual(self.db.execute("SELECT json_extract(payload_json,'$.words') FROM bench_crossing_records_v0 WHERE origin_id='ravel-fictional-westford-council'").fetchone()[0],
           'The council declined the proposed footbridge at West Ford.')

    def test_retry_does_not_duplicate(self):
        copy_one(self.db,self.m)
        again=copy_one(self.db,self.m)
        self.assertEqual(again['status'],'unchanged')
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bench_crossing_records_v0').fetchone()[0],3)

    def test_atomic_failure_leaves_no_partial_copy(self):
        with self.assertRaisesRegex(RuntimeError,'deliberate_partial_copy_failure'):
            copy_one(self.db,self.r,fail_after=2)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bench_crossing_records_v0').fetchone()[0],0)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bench_crossing_runs_v0').fetchone()[0],0)
        copy_one(self.db,self.r)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bench_crossing_records_v0').fetchone()[0],4)

    def test_stale_origin_record_refused_without_wiping_history(self):
        copy_one(self.db,self.m)
        changed=deepcopy(self.m)
        changed['records'][0]['payload']['meaning']='Completely different assertion'
        with self.assertRaises(sqlite3.IntegrityError):
            copy_one(self.db,changed)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bench_crossing_runs_v0').fetchone()[0],1)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bench_crossing_records_v0').fetchone()[0],3)

    def test_unauthorized_or_promoted_source_refused(self):
        bad=deepcopy(self.r)
        bad['records'][0]['source_standing']='certified-historical-source'
        with self.assertRaisesRegex(ValueError,'unearned_standing'):
            copy_one(self.db,bad)
        bad=deepcopy(self.r)
        bad['records'][0]['source_road']='https://live-private-source.example'
        with self.assertRaisesRegex(ValueError,'real_source_not_permitted_in_test'):
            copy_one(self.db,bad)
        self.assertEqual(len(inspect(self.db)),0)

    def test_duplicate_source_identity_refused(self):
        bad=deepcopy(self.r)
        bad['records'].append(deepcopy(bad['records'][0]))
        with self.assertRaisesRegex(ValueError,'duplicate_source_identity'):
            copy_one(self.db,bad)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bench_crossing_runs_v0').fetchone()[0],0)

    def test_immutable_copy(self):
        copy_one(self.db,self.r)
        with self.assertRaisesRegex(sqlite3.IntegrityError,'bench_crossing_record_immutable'):
            self.db.execute("UPDATE bench_crossing_records_v0 SET hand_label='Changed' WHERE origin_id='ravel-fictional-reading-ravel'")
        with self.assertRaisesRegex(sqlite3.IntegrityError,'bench_run_receipt_immutable'):
            self.db.execute('DELETE FROM bench_crossing_runs_v0')

    def test_two_propositions_stay_separate(self):
        copy_one(self.db,self.r)
        # A newer reading in one proposition does not replace an occurrence
        # belonging to another proposition, or the other instrument.
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM bench_latest_change_by_proposition_v1 WHERE instrument='Ravel'").fetchone()[0],0)
        copy_one(self.db,self.m)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bench_latest_change_by_proposition_v1').fetchone()[0],1)

    def test_old_latest_view_retired_without_erasing_rows(self):
        copy_one(self.db,self.m)
        copy_one(self.db,self.r)
        self.db.execute('CREATE VIEW bench_latest_event_by_proposition_v0 AS SELECT * FROM bench_crossing_records_v0')
        ensure_db(self.db)
        self.assertIsNone(self.db.execute("SELECT name FROM sqlite_master WHERE type='view' AND name='bench_latest_event_by_proposition_v0'").fetchone())
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bench_crossing_records_v0').fetchone()[0],7)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bench_readings_by_proposition_v1').fetchone()[0],2)

    def test_dissent_remains_reading_not_latest_truth(self):
        copy_one(self.db,self.m)
        copy_one(self.db,self.r)
        readings=self.db.execute("SELECT origin_id,source_verb,occurrence_order,payload_json FROM bench_readings_by_proposition_v1 WHERE instrument='Ravel' ORDER BY occurrence_order").fetchall()
        self.assertEqual([(r[0],r[1]) for r in readings],
          [('ravel-fictional-reading-ravel','propose'),('ravel-fictional-reading-second','dissent')])
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM bench_latest_change_by_proposition_v1 WHERE instrument='Ravel'").fetchone()[0],0)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bench_glance_v0').fetchone()[0],7)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bench_readings_by_proposition_v1').fetchone()[0],2)

if __name__=='__main__':
    unittest.main(verbosity=2)
