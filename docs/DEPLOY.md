# Putting Route Print Studio online

The site is hosted on **Cloudflare Workers** (static assets). Cloudflare reads `wrangler.jsonc` in the
repository, publishes the `public/` folder, and redeploys automatically every time GitHub changes.

## One-time setup

1. **GitHub:** the code lives in the private repository `waywardMotives/route-print-studio`.
   `wrangler.jsonc`, `public/`, `docs/` and `README.md` must sit at the top level.
2. **Cloudflare:** dash.cloudflare.com → **Workers & Pages** → **Create** → **Import a repository** → pick
   `route-print-studio`. Use these settings (they're also under the Worker's **Settings → Build**):
   - Project / Worker name: `route-print-studio` (must match `name` in `wrangler.jsonc`)
   - Build command: *leave empty*
   - Deploy command: `npx wrangler deploy`
   - Root directory / path: `/`
   - Production branch: `main`
3. Click **Deploy**. When it finishes you get a link like `route-print-studio.<your-subdomain>.workers.dev`.
   Open it: you should see the sample marathon on a street map.

## Re-running a failed deploy

Worker → **Deployments** (or **Builds**) → open the failed build → **Retry build**. Pushing any new commit
to `main` also triggers a fresh build.

## Later: your own domain

Worker → **Settings → Domains & Routes → Add → Custom domain**, e.g. `studio.yourbrand.com`.

## If something looks wrong

- **Build log says "Missing entry-point":** `wrangler.jsonc` isn't at the top level of the repository.
- **Build log says the name doesn't match:** the Worker name in Cloudflare and `name` in `wrangler.jsonc` differ;
  change one so they match.
- **Site shows a 404:** the `public/` folder is missing or `index.html` isn't directly inside it.
- **Blank map, but the poster shows:** the map tiles couldn't load (rare). The poster still works; refresh.
- **Fonts look plain:** an ad or tracker blocker may be blocking Google Fonts.
