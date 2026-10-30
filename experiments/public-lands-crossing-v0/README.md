# Glean Public Lands crossing read v0

Source preparation for one isolated, protected, GET-only road over the existing
`public_lands_nameweb_prosemap_crossings_v0` view in shared two-hand staging.

## Route

`GET /api/glean/v0/crossings?occurrence_id=pl111:james:remarks`

The active shared Worker must continue to perform Cloudflare Access
authentication and its account allowlist check before dispatching here. The
handler additionally allows only the single earned v0 occurrence before D1 is
touched. Other well-formed occurrence IDs receive the same not-found response
without a query. Adding another object requires an explicit source-and-permission
review; URL possession and GET alone are not authorization. The handler performs
one parameterized lookup and exposes no write method.

## Preserved distinctions

- A documentary occurrence is not a historical person.
- Name Web, D1 reading history, Prose Map grammar, and the commit-pinned public
  representation remain distinct instruments.
- The latest reading is not automatic authority.
- Blank locality and total acreage remain blank; geometry remains unearned.
- `no-entry-observed` is a dated, bounded register observation—not proof of
  complete-corpus membership, historical absence, death, dispossession, or identity.
- A protected read is not a source edit, GitHub merge, deployment, rendered
  browser validation, public conclusion, or verified companion identity.
- The held scan is not present in this route or repository slice.
- This v0 object allowlist is deliberately narrower than the backing view.

## Current state

Repository source only. `worker-route.patch` is an integration note, not a
deployment. The live Worker and public page must be read back separately after
any later integration.

Run the local tests with:

```sh
node --test experiments/public-lands-crossing-v0/handler.test.mjs
```


