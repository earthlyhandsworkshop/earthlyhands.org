// Research roads v0: a fictional, local SQLite navigation experiment.
// It is NOT a Cloudflare D1 deployment, a truth engine, or an authorization service.
import { DatabaseSync } from 'node:sqlite';

const scopeRule = `scope IN ('workshop','private') AND
  ((scope='workshop' AND owner_id IS NULL) OR (scope='private' AND owner_id IS NOT NULL))`;
const sameScope = (table, key, newKey) =>
  `(SELECT scope || ':' || COALESCE(owner_id,'') FROM ${table} WHERE ${key}=NEW.${newKey}) =
   (NEW.scope || ':' || COALESCE(NEW.owner_id,''))`;

export function openResearchRoads(filename = ':memory:') {
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS sources (
      source_id TEXT PRIMARY KEY, carrier_ref TEXT NOT NULL, revision_ref TEXT NOT NULL,
      scope TEXT NOT NULL, owner_id TEXT,
      CHECK (${scopeRule})
    );
    CREATE TABLE IF NOT EXISTS people (
      person_id TEXT PRIMARY KEY, display_name TEXT NOT NULL,
      scope TEXT NOT NULL, owner_id TEXT,
      CHECK (${scopeRule})
    );
    CREATE TABLE IF NOT EXISTS work (
      work_id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(source_id),
      person_id TEXT REFERENCES people(person_id), literal_name TEXT NOT NULL,
      room_ref TEXT NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('reading','claim','question')),
      words TEXT NOT NULL, actor TEXT NOT NULL,
      corrects_work_id TEXT REFERENCES work(work_id), basis_source_id TEXT REFERENCES sources(source_id),
      scope TEXT NOT NULL, owner_id TEXT,
      CHECK (${scopeRule}),
      CHECK (corrects_work_id IS NULL OR basis_source_id IS NOT NULL),
      CHECK (corrects_work_id IS NULL OR corrects_work_id <> work_id)
    );
    CREATE INDEX IF NOT EXISTS work_names ON work(literal_name,work_id);
    CREATE INDEX IF NOT EXISTS work_source ON work(source_id,work_id);
    CREATE INDEX IF NOT EXISTS work_corrections ON work(corrects_work_id);
    CREATE TABLE IF NOT EXISTS gaps (
      gap_id TEXT PRIMARY KEY, source_id TEXT REFERENCES sources(source_id),
      person_id TEXT REFERENCES people(person_id),
      kind TEXT NOT NULL CHECK (kind IN
        ('blank_source_field','search_no_match','uninspected_source','unresolved_identity')),
      locator_or_query TEXT NOT NULL, actor TEXT NOT NULL,
      scope TEXT NOT NULL, owner_id TEXT,
      CHECK (${scopeRule}),
      CHECK (source_id IS NOT NULL OR person_id IS NOT NULL)
    );
    CREATE INDEX IF NOT EXISTS gaps_source ON gaps(source_id,kind);
    CREATE TABLE IF NOT EXISTS identity_links (
      link_id TEXT PRIMARY KEY,
      left_person_id TEXT NOT NULL REFERENCES people(person_id),
      right_person_id TEXT NOT NULL REFERENCES people(person_id),
      status TEXT NOT NULL CHECK (status IN ('open','source_supported','rejected')),
      basis_source_id TEXT REFERENCES sources(source_id),
      actor TEXT NOT NULL, note TEXT NOT NULL,
      scope TEXT NOT NULL, owner_id TEXT,
      CHECK (${scopeRule}),
      CHECK (left_person_id <> right_person_id),
      CHECK (status <> 'source_supported' OR basis_source_id IS NOT NULL)
    );
    CREATE INDEX IF NOT EXISTS identity_left ON identity_links(left_person_id);
    CREATE INDEX IF NOT EXISTS identity_right ON identity_links(right_person_id);
  `);
  // Conservative same-compartment links: a narrower correction cannot silently
  // hide a correction to an otherwise visible claim. Cross-scope publication
  // would need its own explicit, reviewed design, not a lucky SQL join.
  db.exec(`CREATE TRIGGER IF NOT EXISTS work_scope_guard BEFORE INSERT ON work BEGIN
    SELECT RAISE(ABORT,'Source scope differs') WHERE NOT (${sameScope('sources','source_id','source_id')});
    SELECT RAISE(ABORT,'Person scope differs') WHERE NEW.person_id IS NOT NULL
      AND NOT (${sameScope('people','person_id','person_id')});
    SELECT RAISE(ABORT,'Basis scope differs') WHERE NEW.basis_source_id IS NOT NULL
      AND NOT (${sameScope('sources','source_id','basis_source_id')});
    SELECT RAISE(ABORT,'Correction crosses scope') WHERE NEW.corrects_work_id IS NOT NULL
      AND NOT (${sameScope('work','work_id','corrects_work_id')});
    SELECT RAISE(ABORT,'Correction changes subject') WHERE NEW.corrects_work_id IS NOT NULL
      AND (SELECT person_id FROM work WHERE work_id=NEW.corrects_work_id) IS NOT NEW.person_id;
  END;
  CREATE TRIGGER IF NOT EXISTS gaps_scope_guard BEFORE INSERT ON gaps BEGIN
    SELECT RAISE(ABORT,'Gap source scope differs') WHERE NEW.source_id IS NOT NULL
      AND NOT (${sameScope('sources','source_id','source_id')});
    SELECT RAISE(ABORT,'Gap person scope differs') WHERE NEW.person_id IS NOT NULL
      AND NOT (${sameScope('people','person_id','person_id')});
  END;
  CREATE TRIGGER IF NOT EXISTS identity_scope_guard BEFORE INSERT ON identity_links BEGIN
    SELECT RAISE(ABORT,'Identity left scope differs') WHERE NOT (${sameScope('people','person_id','left_person_id')});
    SELECT RAISE(ABORT,'Identity right scope differs') WHERE NOT (${sameScope('people','person_id','right_person_id')});
    SELECT RAISE(ABORT,'Identity basis scope differs') WHERE NEW.basis_source_id IS NOT NULL
      AND NOT (${sameScope('sources','source_id','basis_source_id')});
  END;`);
  for (const table of ['sources','people','work','gaps','identity_links']) {
    db.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_no_update BEFORE UPDATE ON ${table}
      BEGIN SELECT RAISE(ABORT,'Append-only fixture'); END;
      CREATE TRIGGER IF NOT EXISTS ${table}_no_delete BEFORE DELETE ON ${table}
      BEGIN SELECT RAISE(ABORT,'Append-only fixture'); END;`);
  }
  return db;
}

const visible = alias => `(${alias}.scope='workshop' OR
  (${alias}.scope='private' AND ${alias}.owner_id=?))`;
function reader(viewer) {
  // Only test-fixture inputs. Real credentials must come from a trusted adapter.
  if (viewer?.authenticated !== true || viewer?.workshopMember !== true) return null;
  return typeof viewer.principalId === 'string' ? viewer.principalId : '';
}

// A literal name returns occurrences, never a merged person. Nullable person_id
// means no attribution has been established even if the string matches.
export function nameRoad(db, literalName, viewer, limit = 100) {
  const principal = reader(viewer);
  if (principal === null) return [];
  if (typeof literalName !== 'string' || !literalName.trim() ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid search');
  return db.prepare(`SELECT w.work_id,w.literal_name,w.person_id,w.source_id,
      w.room_ref,w.kind,w.words,w.actor,w.corrects_work_id,w.basis_source_id
    FROM work w JOIN sources s ON s.source_id=w.source_id
    LEFT JOIN people p ON p.person_id=w.person_id
    WHERE lower(w.literal_name)=lower(?) AND ${visible('w')} AND ${visible('s')}
      AND (w.person_id IS NULL OR ${visible('p')})
    ORDER BY w.work_id LIMIT ?`).all(literalName,principal,principal,principal,limit);
}

// A source's road includes work attached to it, plus explicit corrections made
// from a different source. This does not claim the source or correction is true.
export function sourceRoad(db, sourceId, viewer) {
  const principal = reader(viewer);
  if (principal === null) return null;
  const source = db.prepare(`SELECT source_id,carrier_ref,revision_ref FROM sources s
    WHERE s.source_id=? AND ${visible('s')}`).get(sourceId,principal);
  if (!source) return null; // Hidden and absent source have same result.
  const work = db.prepare(`SELECT w.work_id,w.person_id,w.literal_name,w.source_id,
      w.room_ref,w.kind,w.words,w.actor,w.corrects_work_id,w.basis_source_id
    FROM work w JOIN sources s ON s.source_id=w.source_id
    LEFT JOIN people p ON p.person_id=w.person_id
    WHERE (w.source_id=? OR w.corrects_work_id IN
       (SELECT earlier.work_id FROM work earlier WHERE earlier.source_id=? AND ${visible('earlier')}))
      AND ${visible('w')} AND ${visible('s')}
      AND (w.person_id IS NULL OR ${visible('p')})
    ORDER BY w.work_id`).all(sourceId,sourceId,principal,principal,principal,principal);
  const gaps = db.prepare(`SELECT g.gap_id,g.source_id,g.person_id,g.kind,g.locator_or_query,g.actor
    FROM gaps g LEFT JOIN people p ON p.person_id=g.person_id
    WHERE g.source_id=? AND ${visible('g')}
      AND (g.person_id IS NULL OR ${visible('p')})
    ORDER BY g.gap_id`).all(sourceId,principal,principal);
  return {source,work,gaps};
}

// Identity links are attributed propositions, NEVER instructions to fold IDs.
export function identityRoad(db, personId, viewer) {
  const principal = reader(viewer);
  if (principal === null) return [];
  return db.prepare(`SELECT i.link_id,i.left_person_id,i.right_person_id,
      i.status,i.basis_source_id,i.actor,i.note
    FROM identity_links i
    JOIN people a ON a.person_id=i.left_person_id
    JOIN people b ON b.person_id=i.right_person_id
    LEFT JOIN sources s ON s.source_id=i.basis_source_id
    WHERE (i.left_person_id=? OR i.right_person_id=?)
      AND ${visible('i')} AND ${visible('a')} AND ${visible('b')}
      AND (i.basis_source_id IS NULL OR ${visible('s')})
    ORDER BY i.link_id`).all(personId,personId,principal,principal,principal,principal);
}
