// Nightwolf: isolated fictional one-way mirror. No Cloudflare, credentials,
// real actor authentication, D1 export, R2 API, or live Workshop data.
// A manifest digest checks internal consistency, NOT historical truth or origin.
import { createHash } from 'node:crypto';

export const MIRROR_SCHEMA = 'earthlyhands.nightwolf.mirror-fixture.v0';
const sha = x => createHash('sha256').update(x).digest('hex');
const json = x => JSON.stringify(x);
const copy = x => structuredClone(x);
const id = x => typeof x === 'string' && /^[a-z][a-z0-9:_-]{1,79}$/.test(x);
const digest = x => sha(json(x));

function validateCore(core) {
  if (!core || Object.keys(core).sort().join() !==
      ['actors','events','generation','objects','schema'].sort().join() ||
      core.schema !== MIRROR_SCHEMA || !Number.isSafeInteger(core.generation) ||
      core.generation < 1 || !Array.isArray(core.actors) ||
      !Array.isArray(core.events) || !Array.isArray(core.objects))
    throw new Error('Invalid mirror shape');
  const actors = new Set(), objects = new Set();
  for (const a of core.actors) {
    if (!a || Object.keys(a).sort().join() !== 'id,kind,name' ||
        !id(a.id) || !['human','companion'].includes(a.kind) ||
        typeof a.name !== 'string' || !a.name.trim() || actors.has(a.id))
      throw new Error('Invalid mirror actor');
    actors.add(a.id);
  }
  for (const o of core.objects) {
    if (!o || Object.keys(o).sort().join() !== 'bytes,id,sha256' ||
        !id(o.id) || objects.has(o.id) ||
        typeof o.bytes !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(o.bytes) ||
        o.bytes.length > 1024 * 1024)
      throw new Error('Invalid mirror object');
    const binary = Buffer.from(o.bytes, 'base64');
    if (binary.toString('base64') !== o.bytes || sha(binary) !== o.sha256)
      throw new Error('Mirror binary integrity mismatch');
    objects.add(o.id);
  }
  if (core.events.length !== core.generation) throw new Error('Mirror generation mismatch');
  const events = new Set();
  for (let i=0;i<core.events.length;i++) {
    const e = core.events[i];
    if (!e || Object.keys(e).sort().join() !== 'actorId,body,eventId,objectId,scope,seq' ||
        e.seq !== i+1 || !id(e.eventId) || events.has(e.eventId) ||
        !actors.has(e.actorId) || !objects.has(e.objectId) ||
        typeof e.body !== 'string' || e.body.length > 10000 ||
        (e.scope !== 'workshop' && !actors.has(e.scope.replace(/^private:/,''))) ||
        (e.scope !== 'workshop' && !e.scope.startsWith('private:')))
      throw new Error('Invalid mirror event');
    events.add(e.eventId);
  }
  return core;
}

export function sealMirror(core) {
  const checked = validateCore(copy(core));
  return { core: checked, digest: digest(checked) };
}

export function receiveMirror(current, envelope) {
  if (!envelope || Object.keys(envelope).sort().join() !== 'core,digest' ||
      typeof envelope.digest !== 'string' || !/^[a-f0-9]{64}$/.test(envelope.digest))
    throw new Error('Invalid mirror envelope');
  const core = validateCore(copy(envelope.core));
  if (digest(core) !== envelope.digest) throw new Error('Mirror digest mismatch');
  if (current && (core.generation <= current.core.generation ||
      json(core.events.slice(0,current.core.generation)) !== json(current.core.events) ||
      json(core.actors.slice(0,current.core.actors.length)) !== json(current.core.actors) ||
      json(core.objects.slice(0,current.core.objects.length)) !== json(current.core.objects)))
    throw new Error('Mirror rollback or history rewrite');
  // Caller atomically replaces a complete generation only after this succeeds.
  return { core, digest: envelope.digest };
}

export function visibleEvents(mirror, actorId) {
  if (!mirror.core.actors.some(a => a.id === actorId))
    throw new Error('Unknown mirror actor');
  return copy(mirror.core.events.filter(e =>
    e.scope === 'workshop' || e.scope === 'private:' + actorId));
}
