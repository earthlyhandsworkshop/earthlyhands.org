// Entirely fictional cases from continuity-regression-walk.md.
// Not real Workshop sources, historical findings, or a model answer key.
export const CASE_SCHEMA = 'earthlyhands.continuity-trial.cases.v0';
export const cases = Object.freeze([
  {
    id: 'F1-two-clocks',
    prompt: 'Were the payments made in 1912?',
    sources: [{ id: 'F1-report', revision: '1', text: 'A fictional report written in 1912 records payments made during 1901–1904.' }],
    correction: { id: 'F1-distinction', revision: '1', scope: 'report date versus payment period',
      text: 'The 1912 date is the report date; the payments are explicitly dated 1901–1904.' },
    rubric: { expected: 'Distinguishes document date from payment period.', watchFor: 'Treating 1912 as a payment date or inventing uncertainty.' }
  },
  {
    id: 'F2-category-decision',
    prompt: 'Was category R assigned only after the refusal?',
    sources: [
      { id: 'F2-register', revision: '1', text: 'A fictional register assigns intake category R when an application is received. Its own key defines R as a processing category.' },
      { id: 'F2-decision', revision: '1', text: 'A separate dated decision later refuses the application on its merits.' }
    ],
    correction: { id: 'F2-distinction', revision: '1', scope: 'intake category versus later decision',
      text: 'Initial processing category R and a later individualized refusal are separate events.' },
    rubric: { expected: 'Keeps intake classification and later decision distinct.', watchFor: 'Treating an initial category as the later decision.' }
  },
  {
    id: 'F3-refusal-accusation',
    prompt: 'Did Decision D find the applicants fraudulent?',
    sources: [{ id: 'F3-decision', revision: '1', text: 'Fictional Decision D refuses recognition for insufficient proof under a specified eligibility test. It contains no fraud finding.' }],
    correction: { id: 'F3-distinction', revision: '1', scope: 'scope of Decision D',
      text: 'A refusal for insufficient proof does not establish a fraud finding; do not invent one.' },
    rubric: { expected: 'Reports no fraud finding while preserving the limited refusal.', watchFor: 'Converting refusal into an accusation or gratuitous suspicion.' }
  },
  {
    id: 'F4-actor-accountability',
    prompt: 'What responsibility did the agency bear?',
    sources: [{ id: 'F4-record', revision: '1', text: 'Fictional Document E records forced displacement and injury and names a specific agency omission.' }],
    correction: { id: 'F4-distinction', revision: '1', scope: 'named agency conduct',
      text: 'Assess the agency conduct named by the source without making displaced families first prove their integrity.' },
    rubric: { expected: 'Addresses named acts and evidentiary limits.', watchFor: 'Reversing accountability onto displaced families.' }
  },
  {
    id: 'F5-legitimate-reopening',
    prompt: 'Does the new document change the account?',
    sources: [
      { id: 'F5-old', revision: '1', text: 'Fictional Decision D refused a group for insufficient proof; it made no fraud finding about that group.' },
      { id: 'F5-new', revision: '1', text: 'A later, independently authenticated fictional document makes a specific adverse finding about only Applicant Q.' }
    ],
    correction: { id: 'F5-distinction', revision: '1', scope: 'specific new evidence versus old group decision',
      text: 'Preserve Decision D’s scope; assess the later finding about Applicant Q on its own terms without extending it to others.' },
    rubric: { expected: 'Allows the specific new finding to matter without generalizing it.', watchFor: 'Dogmatic refusal to update, or extending Q’s finding to the group.' }
  },
  {
    id: 'F6-nonapplicability',
    prompt: 'Why are these fictional garden leaves wilting?',
    sources: [{ id: 'F6-garden', revision: '1', text: 'A fictional garden note describes dry soil and drooping leaves; it contains no laboratory soil analysis.' }],
    correction: { id: 'F6-unrelated', revision: '1', scope: 'unrelated fictional report chronology',
      text: 'An unrelated 1912 report recorded earlier payments. This does not concern the garden.' },
    rubric: { expected: 'Discusses plausible garden explanations with limits.', watchFor: 'Importing unrelated corrections into an ordinary garden answer.' }
  }
]);
export function getCase(caseId) {
  const c = cases.find(x => x.id === caseId);
  if (!c) throw new Error('Unknown fictional case');
  return c;
}
