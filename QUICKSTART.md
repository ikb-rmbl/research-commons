# Quickstart — zero to a running portal

Time budget: ~1 hour to a local portal with your real publications in it;
an afternoon including production deploy. No step requires more than
copy-paste-edit skills.

## 0. Before you start

Fill out [docs/INSTITUTION_PROFILE.md](docs/INSTITUTION_PROFILE.md) — ten
minutes that answers every question the config will ask you. You need:

- macOS or Linux with **Node 22+** and **PostgreSQL 16+ with pgvector**
  (`brew install postgresql@17 pgvector` on macOS)
- Your institution's name as it appears in paper affiliations
- Optional but valuable: your Zotero group ID, your ROR ID (find it at
  [ror.org](https://ror.org))

## 1. Install and bootstrap

```bash
git clone https://github.com/ikb-rmbl/research-commons my-portal
cd my-portal
npm install
cp .env.example .env       # edit: set PAYLOAD_ADMIN_PASSWORD
npm run setup              # creates the DB, all tables, and your admin user
```

`npm run setup` is idempotent — re-run it any time.

## 2. Make it yours

Edit **`config/institution.ts`**. Every institution-specific value in the
codebase reads from this one file: names, affiliation strings for discovery,
place names, news outlets, brand colors. The shipped values are a worked
example (Mountain Lake Biological Station) — replace them.

## 3. Seed your corpus

Three paths, use any or all:

```bash
# A. You keep publications in a Zotero group library (many stations do):
npx tsx scripts/import-zotero.ts --group=2351684        # your group ID

# B. Automated discovery from scholarly indexes (works for any institution):
npx tsx scripts/discover-publications.ts                 # OpenAlex + CrossRef
npx tsx scripts/discover-datasets.ts                     # DataCite + Zenodo + Dryad

# C. News stories (after adding outlets to config newsSources):
npx tsx scripts/scrape-news.ts
```

These write JSON to `scripts/output/` — nothing touches the database yet, so
you can inspect what was found.

## 4. Load and look

```bash
npm run dev                              # terminal 1 — leave running
npx tsx scripts/load-to-payload.ts       # terminal 2 — loads pubs + datasets
npx tsx scripts/load-stories.ts          # if you scraped news
npx tsx scripts/build-authors.ts --load-payload   # deduplicated author registry
```

Open **http://localhost:3000** — your portal, with your publications.
Open **/admin** — the full CMS (login from your `.env` credentials).

## 5. The curation loop (important!)

Discovery casts a wide net on purpose. In `/admin`, open Publications and
review the **Institution research?** field: papers found by discovery start
*unset* (= needs review). Run the scorer so the review queue sorts
best-guess-first:

```bash
npx tsx scripts/score-institution-research.ts --apply
```

Then in the admin, sort by score descending, and mark yes/no as you review.
Your yes/no decisions are curation-tracked — no pipeline re-run will ever
overwrite them. Expect discovery precision to be rough at first; see
[docs/ingestion.md](docs/ingestion.md) for tuning the relevance filter.

## 6. Optional: the AI tier

```bash
# Semantic search (VOYAGE_API_KEY in .env — voyage costs ~$0.10 for 10k items)
npx tsx scripts/generate-embeddings.ts --collection=all

# Dataset variable extraction with GCMD taxonomy matching
# (ANTHROPIC_API_KEY in .env — ~$0.02/dataset)
npx tsx scripts/extract-dataset-variables.ts
```

Details and costs: [docs/enrichment.md](docs/enrichment.md).

## 7. Keep it fresh

```bash
npm run pipeline           # discover → load → news → authors → citations → enrich → embed
```

Run weekly (cron, GitHub Action, or by hand). Every phase is incremental —
a routine run only processes what's new.

## 8. Go live

[docs/deploy.md](docs/deploy.md) — Vercel + Neon, ~30 minutes,
$0–20/month depending on tier choices.
