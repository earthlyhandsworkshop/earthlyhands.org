// Fictional, local-only indexed Workbench storage. NOT a deployed multi-user service.
import { openDb } from './bench-sqlite-schema.mjs';
import { createBench } from './bench-sqlite-core.mjs';
import * as writes from './bench-sqlite-writes.mjs';
import * as reads from './bench-sqlite-reads.mjs';
export class SqliteBenchSurfaceStore {
  constructor(filename) { this.db = openDb(filename); }
  createBench(benchId, access) { return createBench(this.db, benchId, access); }
  place(...args) { return writes.place(this.db, ...args); }
  clear(...args) { return writes.clear(this.db, ...args); }
  restore(...args) { return writes.restore(this.db, ...args); }
  readActive(...args) { return reads.readActive(this.db, ...args); }
  readBatch(...args) { return reads.readBatch(this.db, ...args); }
  readTrace(...args) { return reads.readTrace(this.db, ...args); }
  readNoticeSuggestions(...args) { return reads.readNoticeSuggestions(this.db, ...args); }
  close() { this.db.close(); }
}
