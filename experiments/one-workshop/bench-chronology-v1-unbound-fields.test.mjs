// Fictional specimen: exact arrival receipts do not bind all item fields.
// This test characterizes a limitation of v1; it is not permission to use
// untrusted snapshots or an endorsement of changed documentary pointers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { ChronologyV1BenchStore, auditChronologyV1 } from './bench-chronology-v1.mjs';
import { exportChronologyV1Snapshot, importChronologyV1Snapshot }
  from './bench-chronology-v1-backup.mjs';
import { alice, item, workshop } from './bench-sqlite-fixtures.mjs';

test('v1 known limitation: snapshot consistency alone cannot attest source or warning pointers',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'bench-v1-field-boundary-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const db=new ChronologyV1BenchStore(join(dir,'source.db'));
  t.after(()=>db.close());
  db.createBench('old-growth',workshop);
  db.place('old-growth',item(7),alice,0,'place-7');
  const snapshot=join(dir,'snapshot.db');
  const manifest=await exportChronologyV1Snapshot(db,snapshot);
  const revised=join(dir,'revised.db'),dest=join(dir,'returned.db');
  copyFileSync(snapshot,revised);
  const editor=new DatabaseSync(revised);
  try {
    editor.prepare("UPDATE items SET source_id='different-source', warning_ids_json='[]' WHERE item_id='leaf-7'").run();
    assert.equal(auditChronologyV1(editor),true);
    assert.deepEqual(editor.prepare('PRAGMA foreign_key_check').all(),[]);
  } finally {editor.close();}
  const bytes=readFileSync(revised);
  const revisedManifest={...manifest,bytes:bytes.length,
    sha256:createHash('sha256').update(bytes).digest('hex')};
  await importChronologyV1Snapshot(revised,dest,revisedManifest);
  const returned=new ChronologyV1BenchStore(dest);
  try {
    const row=returned.readActive('old-growth',alice).activeItems[0];
    assert.equal(row.itemId,'leaf-7');
    assert.equal(row.sourceId,'different-source');
    assert.deepEqual(row.warningIds,[]);
    assert.equal(auditChronologyV1(returned.db),true);
  } finally {returned.close();}
});
