/* Earthly Hands · simple progressive enhancement for a static public selection.
   No collection of queries, no external scripts, no inaccessible data store. */
(() => {
  'use strict';
  const form = document.getElementById('catalogue-search');
  if (!form) return;
  const input = document.getElementById('query');
  const status = document.getElementById('search-status');
  const empty = document.getElementById('no-results');
  const groups = Array.from(document.querySelectorAll('.collection'));
  const cards = Array.from(document.querySelectorAll('.work-card'));
  const normalize = (text) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
  const params = new URLSearchParams(window.location.search);
  const initial = params.get('q');
  if (initial) input.value = initial;
  function filter() {
    const query = normalize(input.value);
    let count = 0;
    for (const card of cards) {
      const haystack = normalize(card.textContent + ' ' + (card.dataset.search || ''));
      const visible = !query || haystack.includes(query);
      card.hidden = !visible;
      if (visible) count += 1;
    }
    for (const group of groups) group.hidden = !group.querySelector('.work-card:not([hidden])');
    empty.hidden = count !== 0;
    status.textContent = !query
      ? `${count} public selections across six subjects.`
      : `${count} ${count === 1 ? 'work' : 'works'} matching “${input.value.trim()}”. Search within Public Lands for manuscript names.`;
  }
  input.addEventListener('input', filter);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    filter();
    const url = new URL(window.location.href);
    const value = input.value.trim();
    if (value) url.searchParams.set('q', value);
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url);
  });
  filter();
})();
