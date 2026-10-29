import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSourceSnapshot, bindSourceSpan, readSourceSpan, readSelectedSpans,
  SOURCE_SPAN_SCHEMA } from './source-span.mjs';

// Entirely invented source text. Filler simulates a lengthy collaborative finger.
const a = 'Fictional Council correspondence required its committee to heed the People.';
const b = 'Fictional 1850 auditor disallowances will be answered in a future letter.';
const body = 'Invented finger.\n' + a + '\nhttps://nearby.invalid/wrong-source\n' +
  'field note '.repeat(71000) + '\nhttps://nearby.invalid/another-wrong-source\n' + b + '\n';
const snap = makeSourceSnapshot('fictional-finger-01','v7',body);
const at = text => body.indexOf(text);
function bind(id,phrase,source,locator,originalMaker,readingHand,claim,limit) {
  const start=at(phrase);
  return bindSourceSpan({id,snapshot:snap,start,end:start+phrase.length,exactText:phrase,
    originalPointer:source,originalLocator:locator,originalMaker,readingHand,claim,limit});
}
const first = bind('claim-1826',a,'fictional-source:journal-A','face-2','fictional Council recorder',
  'reader-one','Committee answer is subject to its instructions.','Not proof of how the instructions were obtained.');
const second = bind('claim-1850',b,'fictional-source:auditor-B','sheet-7','fictional auditor',
  'reader-two','The response is promised, not performed.','Not evidence of a later amended account.');

test('two claims in a long single body recover distinct source and reader identities',()=>{
  assert.ok(body.length>650000);
  const [x,y]=readSelectedSpans([second,first],[snap],['claim-1826','claim-1850']);
  assert.equal(x.exactText,a);
  assert.equal(y.exactText,b);
  assert.equal(x.source.originalPointer,'fictional-source:journal-A');
  assert.equal(y.source.originalPointer,'fictional-source:auditor-B');
  assert.equal(x.source.originalMaker,'fictional Council recorder');
  assert.equal(y.reading.readingHand,'reader-two');
  assert.equal(x.rightsVerified,false);
  assert.equal(y.originalSourceIndependentlyInspected,false);
});
test('nearby or intervening links cannot become the declared original source',()=>{
  const x=readSourceSpan(first,snap);
  assert.doesNotMatch(x.source.originalPointer,/nearby.invalid/);
  assert.match(body.slice(first.span.end,first.span.end+80),/nearby.invalid/);
  assert.equal(x.source.originalLocator,'face-2');
});
test('stale parent revision, edited body, wrong file ID or false SHA refuse',()=>{
  const changes=[
    {...snap,revision:'v8'},
    makeSourceSnapshot(snap.fileId,snap.revision,body.replace('Invented','Altered')),
    makeSourceSnapshot('someone-else','v7',body),
    {...snap,bodyDigest:'0'.repeat(64)}
  ];
  for(const s of changes) assert.throws(()=>readSourceSpan(first,s),/snapshot|digest mismatch/i);
});
test('exact text must agree with pinned span even if another occurrence matches',()=>{
  const where=body.indexOf(a);
  assert.throws(()=>bindSourceSpan({id:'bad',snapshot:snap,start:where+1,
    end:where+1+a.length,exactText:a,originalPointer:'source:X',
    originalLocator:'1',originalMaker:'clerk',readingHand:'reader',claim:'claim',limit:'limit'}),
    /Unbound or mismatched/);
});
test('repeated phrases remain separate only when their exact offsets are supplied',()=>{
  const twice=makeSourceSnapshot('twice','v1','Intro ' + a + ' middle ' + a + ' end');
  const start1=twice.body.indexOf(a),start2=twice.body.lastIndexOf(a);
  const args={snapshot:twice,exactText:a,originalPointer:'fictional:J',
    originalLocator:'separate-leaf',originalMaker:'writer',readingHand:'reader',claim:'same text',limit:'distinct occurrences'};
  const one=bindSourceSpan({...args,id:'one',start:start1,end:start1+a.length});
  const two=bindSourceSpan({...args,id:'two',start:start2,end:start2+a.length});
  assert.notEqual(one.span.start,two.span.start);
  assert.equal(readSourceSpan(one,twice).exactText,readSourceSpan(two,twice).exactText);
});
test('missing original locator or reading hand refuses rather than guessing',()=>{
  const args={id:'missing',snapshot:snap,start:at(a),end:at(a)+a.length,
    exactText:a,originalPointer:'fictional:J',originalLocator:'page',
    originalMaker:'writer',readingHand:'reader',claim:'claim',limit:'limit'};
  assert.throws(()=>bindSourceSpan({...args,originalLocator:''}),/Unbound/);
  assert.throws(()=>bindSourceSpan({...args,readingHand:null}),/Unbound/);
  assert.throws(()=>bindSourceSpan({...args,originalPointer:null}),/Unbound/);
});
test('metadata mutation, future fields, and duplicate IDs refuse',()=>{
  const edited=structuredClone(first);
  edited.source.originalPointer='fictional:substituted';
  assert.throws(()=>readSourceSpan(edited,snap),/record mismatch/);
  assert.throws(()=>readSourceSpan({...first,unrecognized:'rights grant'},snap),/Unsupported/);
  assert.throws(()=>readSelectedSpans([first,first],[snap],[first.id]),/Duplicate/);
  assert.throws(()=>readSelectedSpans([first],[snap],[first.id,first.id]),/Invalid/);
});
test('valid alternative source claims can be recomputed; a record hash is not authenticity',()=>{
  const other=bind('claim-alternative',a,'fictional-source:disputed','other-face',
    'unknown maker','reader-one','An alternative source is claimed.','Independently unverified.');
  assert.equal(readSourceSpan(other,snap).source.originalPointer,'fictional-source:disputed');
  assert.notEqual(first.recordDigest,other.recordDigest);
  assert.equal(other.schema,SOURCE_SPAN_SCHEMA);
});
test('a UTF-16 offset splitting an emoji is refused, with surrounding text unchanged',()=>{
  const text='before 🧭 after',s=makeSourceSnapshot('emoji','v1',text);
  const middle=text.indexOf('🧭')+1;
  assert.throws(()=>bindSourceSpan({id:'split',snapshot:s,start:middle,end:middle+1,
    exactText:text.slice(middle,middle+1),originalPointer:'fictional:X',originalLocator:'one',
    originalMaker:'writer',readingHand:'reader',claim:'claim',limit:'limit'}),/Unbound/);
});
