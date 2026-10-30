PRAGMA foreign_keys = ON;

INSERT INTO ravel_sources_v0(
  source_id, workset, carrier_date, carrier_label, source_locator,
  continuation_road, voice_as_carried, represented_words, transcription_note
)
VALUES
(
  'choctaw-council-reply-1826-11-14-face-15',
  'choctaw-journal-1826-refusal-and-recast-v0',
  '1826-11-14',
  'MDAH Z/2343.000/S, commissioners journal, 136327-journal-15.tif',
  'https://da.mdah.ms.gov/series/z2343/detail/177758#dtop',
  'https://drive.google.com/open?id=1ffV476xZ8S7yHQE9ZeFRVIZ7miaixj6J',
  'Choctaw Council reply as carried by the commissioners journal',
  'We do not wish to make a long talk. Our People are impatient
to return to their homes. Our words are therefore few. To Please
Our father the President we Could do many things — have done
many things and at Much Sacrifice to our feelings but we
Cannot Consent to Part with our Country',
  'Physical manuscript line breaks retained as newlines; manuscript capitalization retained; terminal punctuation after Country is not supplied. Source-controlled continuation dated 27 Oct 2026 records direct face inspection and correction history.'
),
(
  'commissioners-reply-1826-11-15-face-18',
  'choctaw-journal-1826-refusal-and-recast-v0',
  '1826-11-15',
  'MDAH Z/2343.000/S, commissioners journal, 136327-journal-18.tif',
  'https://da.mdah.ms.gov/series/z2343/detail/177761#dtop',
  'https://drive.google.com/open?id=1ffV476xZ8S7yHQE9ZeFRVIZ7miaixj6J',
  'United States commissioners in their later written talk as carried by the journal',
  'You say that to please your father the President you
have done many things and could do many things. But you say in
substance that you are determined to do nothing. That it was needless to give
the various reasons that determined you to decline his proposals.',
  'Physical manuscript line breaks retained as newlines; manuscript could is kept distinct from Senate-print would. The commissioners’ in substance construction is carried as their paraphrase, not the Council reply’s own wording.'
);

INSERT INTO ravel_assertions_v0(assertion_id, source_id, source_attributed_claim)
VALUES
(
  'assertion-council-bounded-refusal',
  'choctaw-council-reply-1826-11-14-face-15',
  'The Council reply says that many things could be done and had been done to please the President, but that it could not consent to part with its country.'
),
(
  'assertion-commissioners-totalizing-recast',
  'commissioners-reply-1826-11-15-face-18',
  'The commissioners paraphrase the reply as determination to do nothing while acknowledging that various reasons determined the Council to decline the President’s proposals.'
);

INSERT INTO ravel_pairs_v0(
  pair_id, workset, left_assertion_id, right_assertion_id, question
)
VALUES (
  'pair-bounded-refusal-and-total-inaction-1826',
  'choctaw-journal-1826-refusal-and-recast-v0',
  'assertion-council-bounded-refusal',
  'assertion-commissioners-totalizing-recast',
  'What changes when the Council’s bounded refusal to part with its country is later paraphrased as determination to do nothing?'
);
