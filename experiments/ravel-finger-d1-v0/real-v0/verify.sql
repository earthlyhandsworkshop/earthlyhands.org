PRAGMA foreign_keys = ON;

SELECT 'sources' AS item, COUNT(*) AS n FROM ravel_sources_v0
UNION ALL SELECT 'source assertions', COUNT(*) FROM ravel_assertions_v0
UNION ALL SELECT 'pairs', COUNT(*) FROM ravel_pairs_v0
UNION ALL SELECT 'readings', COUNT(*) FROM ravel_readings_v0;

SELECT source_id, carrier_date, source_locator, voice_as_carried,
       represented_words, evidentiary_state
FROM ravel_sources_v0
ORDER BY carrier_date, source_id;

SELECT assertion_id, source_id, source_attributed_claim, claim_standing
FROM ravel_assertions_v0
ORDER BY assertion_id;

SELECT pair_id, left_assertion_id, right_assertion_id, question, standing
FROM ravel_pairs_v0;

PRAGMA foreign_key_check;
