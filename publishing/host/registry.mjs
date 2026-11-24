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
