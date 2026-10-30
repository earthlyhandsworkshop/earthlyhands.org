-- Read-only check; expected counts for this self-contained synthetic fixture: 2 / 2 / 1 / 2.
SELECT 'spans' AS item, COUNT(*) AS n FROM ravel_spans_v0
UNION ALL SELECT 'source assertions', COUNT(*) FROM ravel_assertions_v0
UNION ALL SELECT 'pairs', COUNT(*) FROM ravel_pairs_v0
UNION ALL SELECT 'readings', COUNT(*) FROM ravel_readings_v0;

-- Both independently represented voices survive both readings.
SELECT s.span_id, s.source_locator, s.voice_as_carried, s.represented_words
FROM ravel_spans_v0 s ORDER BY s.span_id;

-- The attributed claims remain separate from what those source passages literally say.
SELECT assertion_id,span_id,source_attributed_claim,claim_standing FROM ravel_assertions_v0 ORDER BY assertion_id;

-- Dissent does not rewrite or promote source records.
SELECT r.reading_id,r.act,r.hand_label,r.attribution_state,r.replies_to,r.reading
FROM ravel_readings_v0 r ORDER BY r.created_at,r.reading_id;
