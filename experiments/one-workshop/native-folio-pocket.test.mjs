import test from 'node:test';
import assert from 'node:assert/strict';
import {carryNativeFolio,recoverNativeFolio} from './native-folio-pocket.mjs';
test('native Public Lands folio survives round trip',()=>{
const text=JSON.stringify({v:1,source:'public-lands-return-3-face-111',format:'Earthly Hands / Public Lands / folio v1',workingReadingEdition:'r4',note:'question',occurrences:[],marks:[]});
assert.equal(recoverNativeFolio(carryNativeFolio(text)),text);
});
