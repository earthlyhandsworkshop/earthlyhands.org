import assert from 'node:assert/strict';
import test from 'node:test';
import { handleGlean } from './handler.mjs';

const row = {
  occurrence_id: 'pl111:james:remarks', source_face: '111', row_key: 'james',
  row_label_as_written: 'James Bell.', field_key: 'remarks', literal_column_heading: 'General Remarks',
  source_jacket_drive_id: 'jacket', nameweb_spreadsheet_id: 'nameweb', nameweb_sheet_tab: 'Relations',
  nameweb_row_number_observed: 20, row_locator_state: 'observed-row-number-plus-content-key',
  prose_map_register_drive_id: 'register', register_observation_state: 'no-entry-observed',
  register_observed_modified_at: '2026-10-01T15:14:19.182Z',
  nameweb_reading_state: 'compile-ready punctuation unclear',
  d1_reading_state: 'later working-leaf colon reading preserved separately', reading_history_count: 3,
  last_reading_id: 'pl111:james:remarks:r3', reading_authority_boundary: 'last-reading-is-not-automatic-authority',
  map_host_state: 'source-jacket-map-grammar', source_cell_state: 'one-row-owned-source-cell',
  land_span_text: 'Poor land', land_span_type: 'land-related-qualitative-remark',
  water_span_text: 'good water', water_span_type: 'water-related-qualitative-remark',
  locality_state: 'blank-on-this-face', total_acres_state: 'blank-on-this-face',
  punctuation_history_state: 'recoverable-separate-readings', geometry_state: 'none-earned',
  drawing_permission: 'text-only-no-map-geometry', prohibited_inference: 'no identity, locality, or legal outcome',
  effective_representation_url: 'https://github.example/commit-pinned', representation_link_state: 'corrected-link-only',
  created_by_hand_id: 'companion-glean-v1', attribution_state: 'named-unverified',
  source_edit_state: 'no-source-edit', deployment_state: 'not-deployed', created_at: '2026-10-30T08:48:34.959Z'
};

function envWith(value = row, failure = null) {
  return { DB: { prepare(sql) {
    assert.match(sql, /WHERE occurrence_id = \? LIMIT 1$/);
    return { bind(id) {
      assert.equal(id, 'pl111:james:remarks');
      return { first: async () => { if (failure) throw failure; return value; } };
    } };
  } } };
}

async function call(path, options = {}, env = envWith()) {
  const url = new URL(`https://staging.example${path}`);
  return handleGlean(new Request(url, options), env, url);
}

test('returns the bounded crossing without changing its states', async () => {
  const response = await call('/api/glean/v0/crossings?occurrence_id=pl111%3Ajames%3Aremarks');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  assert.equal(body.occurrence.id, 'pl111:james:remarks');
  assert.equal(body.readings.history_count, 3);
  assert.equal(body.prose_map.geometry_state, 'none-earned');
  assert.equal(body.receipt.source_edit_state, 'no-source-edit');
  assert.equal(body.receipt.deployment_state, 'not-deployed');
  assert.deepEqual(body.prose_map.typed_spans.map(x => x.text), ['Poor land', 'good water']);
});

test('rejects writes before touching D1', async () => {
  const response = await call('/api/glean/v0/crossings?occurrence_id=pl111%3Ajames%3Aremarks', { method: 'POST' });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET');
});

test('rejects missing or malformed occurrence IDs', async () => {
  assert.equal((await call('/api/glean/v0/crossings')).status, 400);
  assert.equal((await call('/api/glean/v0/crossings?occurrence_id=../scan')).status, 400);
});

test('does not disclose or query other well-formed occurrence IDs', async () => {
  let touched = false;
  const env = { DB: { prepare() {
    touched = true;
    throw Error('D1 must not be reached');
  } } };
  const response = await call(
    '/api/glean/v0/crossings?occurrence_id=pl111%3Alevy%3Aremarks',
    {},
    env
  );
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'crossing_not_found' });
  assert.equal(touched, false);
});

test('keeps missing rows and storage failure distinct', async () => {
  assert.equal((await call('/api/glean/v0/crossings?occurrence_id=pl111%3Ajames%3Aremarks', {}, envWith(null))).status, 404);
  assert.equal((await call('/api/glean/v0/crossings?occurrence_id=pl111%3Ajames%3Aremarks', {}, envWith(null, Error('down')))).status, 503);
});


