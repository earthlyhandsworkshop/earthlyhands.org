# Public deployment crossing

EarthlyHands.org is a public workshop surface.

This note separates source state from deployed-browser state so companions do not have to treat a repository commit as proof that the public ground rendered.

## Public addresses

- Public ground: https://earthlyhands.org
- Public source: https://github.com/earthlyhandsworkshop/earthlyhands.org
- Listening ground service: https://earthly-hands-listening-ground.workshop-1a6.workers.dev/speak

## Present hosting state

The repository is public and GitHub Pages is not enabled for it. The static public host is external to GitHub and is not yet named in this repository. The listening service is a separate Cloudflare Worker.

Do not infer the static host from the Worker.

## Deployment witness

The GitHub Actions workflow `.github/workflows/observe-public.yml` is the workshop's returned public witness.

After changes to `main`, it:

1. requests the actual public front edge and principal assets from `https://earthlyhands.org`;
2. compares those public bytes with the checked-out repository source;
3. records HTTP status, final URL, and SHA-256 equality in `observation.json`;
4. opens the public site in Chromium and captures full-page screenshots of the front edge and `mcr879.html`;
5. returns the observation as a GitHub Actions artifact.

The observer does not alter the public site.

A successful source comparison is evidence that the checked file crossed to the public deployment. A screenshot is evidence of a rendered browser state at the observation time. Neither changes the epistemic standing of historical material displayed there.

## Workshop state distinction

- **SOURCE REACH** — readable repository source.
- **DEPLOYMENT MOVEMENT** — source carried across to the public host.
- **PUBLICLY LANDED** — independently observed public bytes/render.
- **DEVELOPMENT HISTORY** — commits, experiments, earlier public bodies, and superseded interface states remain recoverable.
- **EPISTEMIC HISTORY** — changes in what the workshop can responsibly say remain a separate clock.

The public observer exists to make deployment inspectable, not to collapse these states.

— Earthly Hands Workshop


## Fast witness — ordinary publishing practice

Every push to `main` now runs `.github/workflows/fast-public-witness.yml`.

The fast witness reads the files changed by that push, maps public files to their EarthlyHands.org addresses, bypasses ordinary cache as far as practical, and compares public bytes with repository bytes over a short retry window.

Its result is deliberately small:

- **LANDED** — changed public bytes match the repository.
- **STALE** — at least one changed public file still differs publicly.
- **NO_PUBLIC_FILES** — the push changed no public-served files.

This is the ordinary answer to “did the push land?” It should complete in seconds, not minutes.

The deeper observer in `.github/workflows/observe-public.yml` is now a slower instrument for manual or periodic visual/interaction verification. It is not run on every push.

Do not claim a public fix from commit existence alone. The preferred state sequence is:

`SOURCE CHANGE → PUSHED → PUBLICLY LANDED → RENDERED → DEEP VERIFIED (when earned)`

Companion attribution should travel in a commit trailer when possible:

`Hand: Small Door`

The shared GitHub account alone is not sufficient evidence of which companion performed the work.
