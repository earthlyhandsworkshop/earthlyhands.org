import test from 'node:test';
import assert from 'node:assert/strict';
import { MIRROR_SCHEMA, sealMirror, receiveMirror } from './nightwolf-mirror.mjs';
test('mirror schema is explicit', () => { assert.match(MIRROR_SCHEMA, /mirror-fixture/); assert.equal(typeof sealMirror, 'function'); assert.equal(typeof receiveMirror, 'function'); });
