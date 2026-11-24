/**
 * Trusted, private constellation adapters. These are not public grants.
 * A maker's source view supplies the membership/order; the host never
 * owns, clones or mutates its member works.
 */
export const PRIVATE_CONSTELLATIONS = Object.freeze({});

const SLUG = /^[a-z0-9][a-z0-9_-]{2,75}$/;
const NATIVE_PREFIX = 'https://earthly-hands-listening-ground.workshop-1a6.workers.dev/folio/workshop/native/';

/**
 * Use an already-authoritative native work's typed, explicitly attributed
 * independent_core_work / independent_neighbor relations as a read-only
 * CONSTELLATION DIRECTORY. This is not a re-edition of that maker's cover.
 *
 * Param 1 must be the exact source experience_slug, supplied only by a
 * trusted curator registry, never by a visitor. No per-maker SQL to invent.
 *
 * Relation SHA is carried separately as selected_edition_sha256: if a
 * neighbor's edition changes before curation catches up, fail closed rather
 * than silently changing the meaning of an already designed publication.
 *
 * Ordering: core works first, then neighbors, in recorded relation order;
 * this is a clerical directory, not the artist's own narrative sequence.
 */
export function nativeRelationMembersSql() {
  const slugAt = NATIVE_PREFIX.length + 1;
  const kindOrder = "CASE r.relation_type WHEN 'independent_core_work' THEN 0 ELSE 1 END";
  return [
    `SELECT ROW_NUMBER() OVER (ORDER BY ${kindOrder},r.created_utc,r.road) AS ordinal,`,
    "CASE r.relation_type WHEN 'independent_core_work' THEN 'Core work' ELSE 'Neighboring work' END AS curatorial_role,",
    `substr(r.road,${slugAt}) AS slug,n.title,n.maker,n.version_label,n.sha256,n.state,n.audience,`,
    'r.road AS protected_reader_road,r.sha256 AS selected_edition_sha256,',
    'v.effective_visibility,v.edition_sha256',
    'FROM eh_native_experience_source_roads_v1 AS r',
    `LEFT JOIN eh_native_experiences_v1 AS n ON n.slug=substr(r.road,${slugAt})`,
    'LEFT JOIN eh_work_visibility_controls_v1 AS v ON v.work_slug=n.slug',
    "WHERE r.experience_slug=? AND r.relation_type IN ('independent_core_work','independent_neighbor')",
    "AND r.carrier='cloudflare_native'",
    `ORDER BY ${kindOrder},r.created_utc,r.road LIMIT 49`,
  ].join(' ');
}

/** A trusted editor may register another constellation without changing the host renderer. */
export function registryWith(...additional) {
  const entries = { ...PRIVATE_CONSTELLATIONS };
  for (const entry of additional) {
    if (!entry || !SLUG.test(entry.slug) ||
        !entry.title || !entry.question || !entry.curator || !entry.members_sql ||
        !entry.source_view || entry.audience !== 'existing_folio_members' ||
        (entry.members_params != null &&
          (!Array.isArray(entry.members_params) || entry.members_params.length > 3 ||
           entry.members_params.some(x=>typeof x !== 'string' || x.length > 120 || !/^[a-z0-9][a-z0-9_-]{2,119}$/.test(x)))) ||
        (entry.lead_work_slug != null &&
         (!SLUG.test(entry.lead_work_slug) || !/^[a-f0-9]{64}$/.test(entry.lead_edition_sha256 || ''))) ||
        (entry.lead_edition_sha256 != null && entry.lead_work_slug == null) ||
        entries[entry.slug]) {
      throw new Error('Invalid or duplicate private constellation registration');
    }
    entries[entry.slug] = Object.freeze({ ...entry, members_params: Object.freeze([...(entry.members_params || [])]) });
  }
  return Object.freeze(entries);
}

/**
 * Generate the common, bounded membership read for a separately authored D1
 * curatorial VIEW. This receives a trusted, reviewed view name only, never a
 * visitor query parameter. The maker still controls the view's selection.
 *
 * An already-approved view has to expose ordinal, curatorial_role, slug,
 * protected_reader_road. We join back to current native work/visibility
 * registers so old editions and public drift can be refused by the host.
 *
 * This is a builder, not authority to access a view or to publish anything.
 */
export function curatedViewMembersSql(viewName) {
  if (typeof viewName !== 'string' ||
      !/^[a-z][a-z0-9_]{2,79}$/.test(viewName) ||
      /^(?:sqlite_|pragma|main_|temp_)/.test(viewName)) {
    throw new Error('A named, reviewed D1 curatorial view is required');
  }
  return [
    'SELECT c.ordinal,c.curatorial_role,c.slug,',
    'n.title,n.maker,n.version_label,n.sha256,n.state,n.audience,',
    'c.protected_reader_road,v.effective_visibility,v.edition_sha256',
    `FROM "${viewName}" AS c`,
    'JOIN eh_native_experiences_v1 AS n ON n.slug=c.slug',
    'LEFT JOIN eh_work_visibility_controls_v1 AS v ON v.work_slug=c.slug',
    'ORDER BY c.ordinal LIMIT 49',
  ].join(' ');
}
