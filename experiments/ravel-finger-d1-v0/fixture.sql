-- Invented evidence only; no real source, no personal credentials, no verified hand.
INSERT INTO ravel_spans_v0(span_id, workset, carrier_label, source_locator, voice_as_carried, represented_words)
VALUES
('ravel-fictional-westford-council','ravel-fictional-crossing-v0','Invented council page','fiction://ravel-v0/council/page-1','Council as represented by an invented clerk','The council declined the proposed footbridge at West Ford.'),
('ravel-fictional-westford-summary','ravel-fictional-crossing-v0','Invented later summary','fiction://ravel-v0/summary/page-2','Later office as represented by an invented clerk','The council did nothing about crossing the river.');

-- An assertion records what an invented source claims; it is not Ravel's own inference.
INSERT INTO ravel_assertions_v0(assertion_id,span_id,source_attributed_claim)
VALUES
('ravel-fictional-assertion-council','ravel-fictional-westford-council','The invented council record reports refusal of one proposed footbridge.'),
('ravel-fictional-assertion-summary','ravel-fictional-westford-summary','The invented later office report characterizes the council as doing nothing about a crossing.');

-- The pair holds a question, not the answer or a historical identity join.
INSERT INTO ravel_pairs_v0(pair_id,workset,left_assertion_id,right_assertion_id,question)
VALUES ('ravel-fictional-compare-01','ravel-fictional-crossing-v0','ravel-fictional-assertion-council','ravel-fictional-assertion-summary','Does the later summary widen one declined proposal into a claim of total inaction?');

-- Both labels are synthetic. The second does NOT certify a real second companion.
INSERT INTO ravel_readings_v0(reading_id,request_key,pair_id,replies_to,hand_label,act,reading)
VALUES ('ravel-fictional-reading-ravel','ravel-fixture-key-001','ravel-fictional-compare-01',NULL,'Ravel (fixture label)','propose','The later summary could widen the bounded refusal to a general statement of inaction. This is a comparison to test, not a conclusion about the fictional council.');
INSERT INTO ravel_readings_v0(reading_id,request_key,pair_id,replies_to,hand_label,act,reading)
VALUES ('ravel-fictional-reading-second','ravel-fixture-key-002','ravel-fictional-compare-01','ravel-fictional-reading-ravel','Second hand (fictional, not authenticated)','dissent','Perhaps the later summary means only that no crossing work was performed. The apparent widening is plausible, not proved. Keep the original words and the open question.');
