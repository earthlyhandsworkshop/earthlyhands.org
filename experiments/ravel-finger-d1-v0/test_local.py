import sqlite3, pathlib
P=pathlib.Path(__file__).parent
con=sqlite3.connect(':memory:')
con.execute('PRAGMA foreign_keys=ON')
con.executescript((P/'schema.sql').read_text())
con.executescript((P/'fixture.sql').read_text())
assert [con.execute('SELECT COUNT(*) FROM '+t).fetchone()[0] for t in ('ravel_spans_v0','ravel_assertions_v0','ravel_pairs_v0','ravel_readings_v0')]==[2,2,1,2]
original=con.execute('SELECT represented_words FROM ravel_spans_v0 ORDER BY span_id').fetchall()
claims=con.execute('SELECT source_attributed_claim FROM ravel_assertions_v0 ORDER BY assertion_id').fetchall()

def rejects(query, expected):
    try:
        con.execute(query)
    except sqlite3.DatabaseError as e:
        assert expected in str(e), (query, str(e))
        return
    raise AssertionError('unexpectedly accepted '+query)

rejects("UPDATE ravel_spans_v0 SET represented_words='altered' WHERE span_id='ravel-fictional-westford-council'",'ravel_span_immutable')
rejects("DELETE FROM ravel_spans_v0 WHERE span_id='ravel-fictional-westford-summary'",'ravel_span_immutable')
rejects("UPDATE ravel_assertions_v0 SET source_attributed_claim='rewritten' WHERE assertion_id='ravel-fictional-assertion-council'",'ravel_assertion_immutable')
rejects("UPDATE ravel_readings_v0 SET reading='rewritten' WHERE reading_id='ravel-fictional-reading-ravel'",'ravel_reading_append_only')
rejects("DELETE FROM ravel_readings_v0 WHERE reading_id='ravel-fictional-reading-second'",'ravel_reading_append_only')
rejects("INSERT INTO ravel_readings_v0(reading_id,request_key,pair_id,hand_label,act,reading) VALUES ('retry','ravel-fixture-key-001','ravel-fictional-compare-01','Fake','propose','retry')",'UNIQUE')
rejects("INSERT INTO ravel_pairs_v0(pair_id,workset,left_assertion_id,right_assertion_id,question) VALUES ('bad','ravel-fictional-crossing-v0','nonexistent','ravel-fictional-assertion-summary','bad')",'FOREIGN KEY')
assert original==con.execute('SELECT represented_words FROM ravel_spans_v0 ORDER BY span_id').fetchall()
assert claims==con.execute('SELECT source_attributed_claim FROM ravel_assertions_v0 ORDER BY assertion_id').fetchall()
# A different hand can append a withdrawal; the original interpretation still exists.
con.execute("INSERT INTO ravel_readings_v0(reading_id,request_key,pair_id,replies_to,hand_label,act,reading) VALUES ('ravel-fictional-withdrawal','ravel-fixture-key-003','ravel-fictional-compare-01','ravel-fictional-reading-ravel','Ravel (fixture label)','withdraw','I release this comparison without changing either represented source.')")
assert con.execute("SELECT COUNT(*) FROM ravel_readings_v0").fetchone()[0]==3
assert original==con.execute('SELECT represented_words FROM ravel_spans_v0 ORDER BY span_id').fetchall()
assert claims==con.execute('SELECT source_attributed_claim FROM ravel_assertions_v0 ORDER BY assertion_id').fetchall()
# Cross-relation reply is refused, even when both separate relations have valid source assertions.
con.execute("INSERT INTO ravel_pairs_v0(pair_id,workset,left_assertion_id,right_assertion_id,question) VALUES ('ravel-fictional-other-pair','ravel-fictional-crossing-v0','ravel-fictional-assertion-summary','ravel-fictional-assertion-council','Different question')")
rejects("INSERT INTO ravel_readings_v0(reading_id,request_key,pair_id,replies_to,hand_label,act,reading) VALUES ('bad-cross','bad-cross-key','ravel-fictional-other-pair','ravel-fictional-reading-ravel','Fictional hand','dissent','not the same pair')",'reply_must_share_pair')
rejects("INSERT INTO ravel_readings_v0(reading_id,request_key,pair_id,hand_label,attribution_state,act,reading) VALUES ('fake-auth','fake-auth-key','ravel-fictional-compare-01','Invented','account-backed','propose','Not authenticated')",'CHECK constraint')
print('PASS: 2 invented spans / 2 attributed assertions / 1 neutral comparison / 2 separate readings; 9 expected refusal checks; a later withdrawal leaves source and earlier readings intact')
