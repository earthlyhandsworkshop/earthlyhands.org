"""Invented, in-memory request history regression. Never touches a live D1."""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import re
import sqlite3

source = Path(__file__).with_name("handler.mjs").read_text()
needle = "SELECT request_id,request_id AS event_id,question"
statements = []
for match in re.finditer(re.escape(needle), source):
    query = source[match.start():].split('"', 1)[0]
    if "FROM quire_operator_history_v0" in query:
        statements.append(query)
assert len(statements) == 2, f"expected two history SQL statements, got {len(statements)}"
first = next(q for q in statements if "requested_at<?" not in q)
older = next(q for q in statements if "requested_at<?" in q)
assert "ORDER BY requested_at DESC,request_id DESC LIMIT 31" in first
assert "ORDER BY requested_at DESC,request_id DESC LIMIT 31" in older
assert "event_at<?" not in older and "event_id<?" not in older

db = sqlite3.connect(":memory:")
db.row_factory = sqlite3.Row
db.executescript("""
CREATE TABLE request (
 request_id TEXT PRIMARY KEY,request_key TEXT NOT NULL UNIQUE,
 specimen_id TEXT NOT NULL,question TEXT,created_at TEXT NOT NULL
);
CREATE TABLE result (
 result_id TEXT PRIMARY KEY,request_key TEXT NOT NULL UNIQUE,
 outcome TEXT NOT NULL,proposal_json TEXT,error_code TEXT,created_at TEXT NOT NULL
);
CREATE VIEW quire_operator_history_v0 AS
SELECT r.request_id,COALESCE(o.result_id,r.request_id) AS event_id,
 r.question,'["invented"]' AS loaded_carrier_ids_json,
 o.proposal_json,o.error_code,'invented-model' AS model_id,
 COALESCE(o.outcome,'request-pending') AS outcome,
 r.specimen_id,r.created_at AS requested_at,o.created_at AS resolved_at,
 COALESCE(o.created_at,r.created_at) AS event_at
FROM request r LEFT JOIN result o ON o.request_key=r.request_key;
""")
base = datetime(2026,10,30,17,0,0,tzinfo=timezone.utc)
for i in range(61):
    ident=f"00000000-0000-4000-8000-{i+1:012x}"
    # Deliberately share timestamps to test UUID tie-breaking.
    created=(base+timedelta(milliseconds=(i//2)*100)).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3]+"Z"
    db.execute("INSERT INTO request VALUES (?,?,?,?,?)",(ident,ident,"review-adequacy-v1","Invented request",created))

seen=[]
cursor=None
page_lengths=[]
while True:
    if cursor:
        rows=db.execute(older,("review-adequacy-v1",cursor[0],cursor[0],cursor[1])).fetchall()
    else:
        rows=db.execute(first,("review-adequacy-v1",)).fetchall()
    page=rows[:30]
    seen.extend(x["request_id"] for x in page)
    page_lengths.append(len(page))
    if len(page_lengths)==1:
        # A pending request on the final page completes after the first page was read.
        db.execute("INSERT INTO result VALUES (?,?,?,?,?,?)",(
            "ffffffff-ffff-4fff-8fff-ffffffffffff",
            "00000000-0000-4000-8000-000000000001",
            "model-proposed-open","{\"state\":\"OPEN\"}",None,"2026-10-30T18:00:00.000Z"
        ))
    if len(rows)<=30:
        break
    cursor=(page[-1]["created_at"],page[-1]["request_id"])
    assert len(page_lengths)<6

assert page_lengths==[30,30,1],page_lengths
assert len(seen)==61 and len(set(seen))==61
assert db.execute("SELECT event_id FROM quire_operator_history_v0 WHERE request_id=?",("00000000-0000-4000-8000-000000000001",)).fetchone()[0].startswith("ffffffff")
print("PASS: 61 immutable request IDs in 30/30/1 pages despite result completion; no skipped or duplicated request")
