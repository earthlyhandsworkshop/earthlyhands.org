const VIEW = 'public_lands_nameweb_prosemap_crossings_v0';
const OCCURRENCE_ID = /^[a-z0-9][a-z0-9:_-]{0,127}$/i;
const VISIBLE_OCCURRENCES = new Set(['pl111:james:remarks']);

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow',
      ...extraHeaders
    }
  });
}

function error(code, status, extraHeaders) {
  return json({ error: code }, status, extraHeaders);
}

function crossing(row) {
  return {
    kind: 'source-linked-crossing',
    view: VIEW,
    occurrence: {
      id: row.occurrence_id,
      source_face: row.source_face,
      row_key: row.row_key,
      row_label_as_written: row.row_label_as_written,
      field_key: row.field_key,
      literal_column_heading: row.literal_column_heading
    },
    source_roads: {
      source_jacket_drive_id: row.source_jacket_drive_id,
      name_web: {
        spreadsheet_id: row.nameweb_spreadsheet_id,
        sheet_tab: row.nameweb_sheet_tab,
        observed_row_number: row.nameweb_row_number_observed,
        locator_state: row.row_locator_state
      },
      prose_map_register: {
        drive_id: row.prose_map_register_drive_id,
        observation_state: row.register_observation_state,
        observed_modified_at: row.register_observed_modified_at,
        absence_boundary: 'dated register observation; not proof of complete-corpus or historical absence'
      }
    },
    readings: {
      name_web_state: row.nameweb_reading_state,
      d1_state: row.d1_reading_state,
      history_count: row.reading_history_count,
      last_reading_id: row.last_reading_id,
      authority_boundary: row.reading_authority_boundary
    },
    prose_map: {
      host_state: row.map_host_state,
      source_cell_state: row.source_cell_state,
      typed_spans: [
        { text: row.land_span_text, type: row.land_span_type },
        { text: row.water_span_text, type: row.water_span_type }
      ],
      locality_state: row.locality_state,
      total_acres_state: row.total_acres_state,
      punctuation_history_state: row.punctuation_history_state,
      geometry_state: row.geometry_state,
      drawing_permission: row.drawing_permission,
      prohibited_inference: row.prohibited_inference
    },
    representation: {
      url: row.effective_representation_url,
      link_state: row.representation_link_state
    },
    receipt: {
      created_by_hand_id: row.created_by_hand_id,
      attribution_state: row.attribution_state,
      source_edit_state: row.source_edit_state,
      deployment_state: row.deployment_state,
      created_at: row.created_at
    },
    boundaries: [
      'documentary occurrence is not a historical person',
      'an observed Name Web row number is a locator, not a permanent identifier',
      'the latest reading is not automatic authority',
      'no-entry-observed is a dated register observation, not proof of complete-corpus or historical absence',
      'blank locality and acreage remain blank',
      'geometry remains unearned',
      'this protected read does not edit a source, publish a conclusion, or verify a companion identity'
    ]
  };
}

export async function handleGlean(request, env, url) {
  if (request.method !== 'GET') {
    return error('method_not_allowed', 405, { allow: 'GET' });
  }
  if (url.pathname !== '/api/glean/v0/crossings') {
    return error('not_found', 404);
  }

  const occurrenceId = (url.searchParams.get('occurrence_id') || '').trim();
  if (!OCCURRENCE_ID.test(occurrenceId)) {
    return error('invalid_occurrence_id', 400);
  }
  if (!VISIBLE_OCCURRENCES.has(occurrenceId)) {
    return error('crossing_not_found', 404);
  }

  let row;
  try {
    row = await env.DB.prepare(
      `SELECT * FROM ${VIEW} WHERE occurrence_id = ? LIMIT 1`
    ).bind(occurrenceId).first();
  } catch {
    return error('crossing_store_unavailable', 503);
  }
  if (!row) return error('crossing_not_found', 404);

  return json(crossing(row));
}



