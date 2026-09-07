# Deploy — Vercel + Neon, ~30 minutes

The production stack the RMBL Knowledge Commons runs on. Both services have
free tiers that fit a small portal; see [COSTS.md](COSTS.md).

## 1. Production database (Neon)

1. Create a project at [neon.tech](https://neon.tech) (Postgres 16+).
2. In the Neon SQL editor: `CREATE EXTENSION vector; CREATE EXTENSION pg_trgm;`
3. Copy the connection string.
4. Initialize the schema from your machine:
   ```bash
   DATABASE_URL='<neon-connection-string>' PAYLOAD_PUSH=true npx tsx scripts/init-db.ts
   ```

## 2. App hosting (Vercel)

1. Push your portal repo to GitHub.
2. [vercel.com](https://vercel.com) → New Project → import the repo
   (framework auto-detected).
3. Environment variables:
   - `DATABASE_URL` — the Neon connection string
   - `PAYLOAD_SECRET` — 32+ random characters (`openssl rand -hex 24`)
   - `PAYLOAD_ADMIN_EMAIL` / `PAYLOAD_ADMIN_PASSWORD`
   - optional: `VOYAGE_API_KEY`, `ANTHROPIC_API_KEY`
4. Deploy. Every future `git push` to main redeploys.

## 3. Getting data to production

Two workable models:

- **Simplest — run the pipeline against production directly.** Point
  `DATABASE_URL` at Neon in a local `.env.production` and run discovery/load
  scripts with it. Fine at small scale.
- **RMBL's model — local pipeline, then sync.** Run everything against local
  Postgres, then push a dump:
  ```bash
  pg_dump -d research_commons --data-only \
    -t publications -t datasets -t documents -t stories \
    -t publications_authors -t authors -t authors_rels | psql "$NEON_URL"
  ```
  Worth the ceremony once admins are editing production directly (the
  curation-tracking system exists precisely so pipeline and admin edits can
  merge without clobbering each other — see LEARNINGS.md).

## 4. Custom domain + basics

- Vercel → Settings → Domains: add yours.
- `public/robots.txt`: decide your crawler policy (the RMBL default welcomes
  AI crawlers — a portal's job is being found).
- Watch traffic: Vercel Analytics is one click; expect bot waves and don't
  panic-block (RMBL's story: LEARNINGS.md).
