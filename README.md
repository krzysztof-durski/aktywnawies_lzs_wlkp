# XXIX Ogólnopolskie Igrzyska LZS – Spała 2026

Public website for the event, with an admin panel for the client to manage news, documents, gallery photos, and static page text — no developer involvement needed for routine updates.

Built with [Astro](https://astro.build) on Cloudflare Workers (static assets + SSR), [D1](https://developers.cloudflare.com/d1/) (SQLite) for structured content, and [R2](https://developers.cloudflare.com/r2/) for uploaded photos/PDFs. This README covers day-to-day commands; `src/lib/db.ts` and `migrations/*.sql` are the source of truth for the data model, `src/middleware.ts` for the security model (auth, CSRF, headers).

## Prerequisites

- Node.js ≥ 22.12 (see `engines` in `package.json`)
- A Cloudflare account with `wrangler` authenticated (`npx wrangler login`) — only needed for `--remote` operations and deploys, not for local dev

## Local development

```sh
npm install
npm run dev
```

Starts the dev server at `http://localhost:4321` (runs on `workerd` via Astro's Cloudflare adapter — D1/R2/rate-limiter bindings are available locally without extra flags). `.dev.vars` holds local-only secrets (currently just `TURNSTILE_SECRET`, set to Cloudflare's published test key so the login CAPTCHA works in dev without real Turnstile credentials).

### Database migrations

Schema lives in `migrations/*.sql`, applied in filename order.

```sh
npx wrangler d1 migrations apply igrzyska-lzs-2026 --local    # local dev DB
npx wrangler d1 migrations apply igrzyska-lzs-2026 --remote   # production DB, before a deploy that needs it
```

Add new migrations as new numbered files — never edit an already-applied one.

### Creating the first admin account

There's no signup UI on purpose. Run:

```sh
npx tsx scripts/create-admin.ts <username>
```

It prompts for a password, then prints a ready-to-run `wrangler d1 execute` command (for `--local` and `--remote`) — review it and run it yourself. Nothing is written to disk. Email the resulting username/password to the client out-of-band.

## Before the first real deploy

Several `wrangler.jsonc` values are placeholders (marked with `// TODO` comments) — replace them before deploying:

1. `npx wrangler d1 create igrzyska-lzs-2026` → put the returned `database_id` into `wrangler.jsonc`
2. `npx wrangler r2 bucket create igrzyska-lzs-2026-media` → bucket name already matches, just create it
3. Once ready to serve media from a custom domain instead of the `/media/[...key]` Worker-proxied fallback: `wrangler r2 bucket domain add`, then set `MEDIA_BASE_URL` in `wrangler.jsonc`'s `vars`
4. Get a real Turnstile site/secret key pair from the [Cloudflare dashboard](https://dash.cloudflare.com/?to=/:account/turnstile) (the committed `PUBLIC_TURNSTILE_SITE_KEY` is Cloudflare's public "always passes" test key) → update the var, and `wrangler secret put TURNSTILE_SECRET`
5. Connect the repo via **Workers Builds** (dashboard → Workers & Pages → your project → Settings → Builds) for git-based deploys and PR preview URLs, or deploy manually with `wrangler deploy`

## Commands

| Command | Action |
| :-- | :-- |
| `npm run dev` | Local dev server |
| `npm run build` | Build to `./dist/` |
| `npm run preview` | Preview the build locally |
| `npm run generate-types` | Regenerate `worker-configuration.d.ts` from `wrangler.jsonc` bindings (run after changing bindings) |
| `npx wrangler deploy` | Deploy manually |
| `npx wrangler tail` | Stream production logs |

## Deferred / not yet built

- **Regulamin serwisu / Polityka prywatności** pages were built and then removed from routes/footer at the client's request (2026-08-13) — not abandoned. To re-enable: recreate `src/pages/regulamin.astro` / `polityka-prywatnosci.astro` (same pattern as `src/pages/kontakt.astro`), re-add the footer links in `BaseLayout.astro`, and re-insert the `pages` rows (drafted RODO/wizerunek-aware content is in `migrations/0004_kontakt_update_remove_legal_pages.sql`'s git history).
- Site branding (logo, hero images, sponsor logos) — placeholder Astro favicon only; real assets go in `src/assets/{logo,hero,disciplines,sponsors}/` once the client provides them.
