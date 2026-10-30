// One-request-per-process local fixture transport. Not a network service,
// identity provider, authenticated RPC, or permission enforcement boundary.
import { readFileSync } from 'node:fs';
import { NightwolfWitnessStore } from './nightwolf-witness.mjs';
const [filename,verb]=process.argv.slice(2);
let witness;
try {
  if (!filename || !['enroll','advance','check','latest'].includes(verb))
    throw new Error('Unknown witness command');
  const input=JSON.parse(readFileSync(0,'utf8'));
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Invalid witness request');
  const fields=Object.keys(input).sort().join(',');
  const expected=verb==='latest'?'mirrorId':
    verb==='advance'?'mirrorId,previousDigest,summary':'mirrorId,summary';
  if (fields!==expected) throw new Error('Unexpected witness request fields');
  witness=new NightwolfWitnessStore(filename,{create:verb==='enroll',
    writable:verb==='enroll'||verb==='advance'});
  const result=verb==='enroll'?witness.enroll(input.mirrorId,input.summary):
    verb==='advance'?witness.advance(input.mirrorId,input.summary,input.previousDigest):
    verb==='check'?witness.check(input.mirrorId,input.summary):
    witness.latest(input.mirrorId);
  process.stdout.write(JSON.stringify({ok:true,result})+'\n');
} catch(error) {
  process.stderr.write('Witness refused: '+error.message+'\n');
  process.exitCode=1;
} finally { witness?.close(); }
