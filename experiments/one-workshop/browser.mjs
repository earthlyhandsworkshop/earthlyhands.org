import {newDocument, parseDocument, saveRevision, approveRevision, publicText, exportDocument} from './model.mjs';

let state = newDocument();
let seen = state.working_revision;
const draft = document.querySelector('#draft');
const status = document.querySelector('#status');
draft.value = state.history.at(-1).content;
function show(note) {
  document.querySelector('#history').replaceChildren(...state.history.map(entry => {
    const li = document.createElement('li');
    li.textContent = 'Revision ' + entry.revision;
    return li;
  }));
  document.querySelector('#release').textContent = publicText(state) ?? 'Not yet published.';
  status.textContent = note ?? ('Working revision ' + state.working_revision +
    (state.publication ? ' · Public preview pinned at revision ' + state.publication.revision : ' · No public release'));
}
function failure(error) { status.textContent = error.message; }
document.querySelector('#save').onclick = () => {
  try {
    state = saveRevision(state, draft.value, seen);
    seen = state.working_revision;
    show('Saved locally at revision ' + seen + '. No server write.');
  } catch (error) { failure(error); }
};
document.querySelector('#approve').onclick = () => {
  try {
    if (draft.value !== state.history.at(-1).content) throw new Error('Save before approval.');
    state = approveRevision(state, seen);
    show('Public preview pinned at revision ' + state.publication.revision + '; not deployed.');
  } catch (error) { failure(error); }
};
document.querySelector('#export').onclick = () => {
  const url = URL.createObjectURL(new Blob([exportDocument(state)], {type:'application/json'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'one-workshop-test-0001.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
document.querySelector('#import').onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 1000000) throw new Error('File exceeds the demo limit.');
    const incoming = parseDocument(await file.text());
    state = incoming;
    seen = state.working_revision;
    draft.value = state.history.at(-1).content;
    show('Imported ' + seen + ' validated revisions locally; not saved to server.');
  } catch (error) { status.textContent = 'Import refused: ' + error.message; }
  finally { event.target.value = ''; }
};
document.querySelector('#reset').onclick = () => {
  state = newDocument();
  seen = 1;
  draft.value = state.history[0].content;
  show('Reset locally.');
};
show();
