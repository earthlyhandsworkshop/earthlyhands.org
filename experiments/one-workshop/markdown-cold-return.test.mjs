// Fictional cold return checks. Separate Node process on one machine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, copyFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { RECORD_SCHEMA, rebuildIndex, readDerivedIndex } from './markdown-rebuild.mjs';
const self=fileURLToPath(import.meta.url);
if(process.argv[2]==='--receive') {
  try { rebuildIndex(process.argv[3],process.argv[4]); process.stdout.write(JSON.stringify(readDerivedIndex(process.argv[4]))); }
  catch(e) { process.stderr.write(e.message); process.exitCode=1; }
} else {
  test('fresh process rebuilds from received Markdown without the source database',t=>{
    const root=mkdtempSync(join(tmpdir(),'md-return-'));
    t.after(()=>rmSync(root,{recursive:true,force:true}));
    const source=join(root,'source','leaf-one'),dest=join(root,'received','leaf-one');
    mkdirSync(join(source,'revisions'),{recursive:true});mkdirSync(join(dest,'revisions'),{recursive:true});
    const body=Buffer.from('# Fictional original\r\nCafé\r\n');
    const receipt={schema:RECORD_SCHEMA,id:'leaf-one',sourceClaim:'invented',rightsState:'unknown',publication:null,revisions:[{revision:1,bytes:body.length,sha256:createHash('sha256').update(body).digest('hex')}]};
    writeFileSync(join(source,'record.json'),JSON.stringify(receipt));writeFileSync(join(source,'revisions','0001.md'),body);
    copyFileSync(join(source,'record.json'),join(dest,'record.json'));
    copyFileSync(join(source,'revisions','0001.md'),join(dest,'revisions','0001.md'));
    const result=spawnSync(process.execPath,[self,'--receive',join(root,'received'),join(root,'new.sqlite')],{encoding:'utf8',timeout:20000});
    assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
    assert.equal(JSON.parse(result.stdout)[0].latest_revision,1);
    assert.equal(JSON.parse(result.stdout)[0].public_text,null);
    assert.deepEqual(readFileSync(join(dest,'revisions','0001.md')),body);
  });
}
