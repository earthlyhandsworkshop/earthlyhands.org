# earthlyhands.org

Public website for Earthly Hands Workshop.

This is a small threshold for the workshop. The public page uses plain HTML,
CSS, and progressive JavaScript, contains no tracking, and requires no build
step. A separate Cloudflare Worker provides the optional listening ground
without exposing an OpenAI API key in the browser or repository.

The current public body is **Threshold v4**: a quiet, progressive entrance. The
lantern reveals the first public Dawson passage. Visitors can move forward or
back, put out the lantern, and ask bounded questions from the public footing.

## Listening ground deployment

The static site remains on its current host. The `worker` directory is deployed
separately to Cloudflare Workers.

1. In `worker`, run `npm install`.
2. Sign in with `npx wrangler login`.
3. Add the private key with `npx wrangler secret put OPENAI_API_KEY`.
4. Deploy with `npm run deploy`.
5. Put the resulting Worker `/speak` URL in the root `config.js`, then publish
   the static site.

Never put the OpenAI API key in `config.js`, source code, browser storage, a
commit, or a public hosting setting. For local Worker development, put it in an
ignored `worker/.dev.vars` file as `OPENAI_API_KEY=...`.
