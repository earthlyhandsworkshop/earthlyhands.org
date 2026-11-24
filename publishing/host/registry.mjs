/**
 * Trusted, private constellation adapters. These are not public grants.
 * A maker's source view supplies the membership/order; the host never
 * owns, clones or mutates its member works.
 */
export const PRIVATE_CONSTELLATIONS = Object.freeze({});

/** A trusted editor may register another constellation without changing the host renderer. */
export function registryWith(...additional) {
  const entries = { ...PRIVATE_CONSTELLATIONS };
  for (const entry of additional) {
    if (!entry || !/^[a-z0-9][a-z0-9-]{2,75}$/.test(entry.slug) ||
        !entry.title || !entry.curator || !entry.members_sql ||
        !entry.source_view || entry.audience !== 'existing_folio_members' ||
        entries[entry.slug]) {
      throw new Error('Invalid or duplicate private constellation registration');
    }
    entries[entry.slug] = Object.freeze({ ...entry });
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
