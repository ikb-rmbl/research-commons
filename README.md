# Research Commons

**A portal for your institution's research outputs — publications, datasets,
documents, and news — with automated discovery, unified search, and optional
AI enrichment.** Built for biological field stations and other small research
organizations; extracted from the [RMBL Knowledge Commons](https://rmblknowledgecommons.org),
which runs this architecture in production with ~17,000 items.

One config file makes it yours. An afternoon makes it live.

## What you get

| Tier | Features | Requires |
|---|---|---|
| **Core portal** | Payload CMS admin, unified full-text search, browse + detail pages for publications/datasets/documents/stories/authors, curation tracking, delete-stays-deleted tombstones | Postgres + Node |
| **Automated ingestion** | Zotero library import, OpenAlex/CrossRef publication discovery by affiliation (+ ROR), DataCite/Zenodo/Dryad dataset discovery, generic news scraping, citation counts, author deduplication | free APIs, no keys |
| **AI enrichment** (optional) | Semantic search (Voyage embeddings), LLM extraction of dataset variables matched to the NASA GCMD taxonomy, relevance scoring for review queues | `VOYAGE_API_KEY`, `ANTHROPIC_API_KEY` — see [docs/COSTS.md](docs/COSTS.md) for real dollar figures |

Beyond these tiers, the RMBL Knowledge Commons demonstrates where this road
leads — entity extraction (species/places/methods), knowledge graphs, research
neighborhoods, LLM-written research primers, and FAIR data re-use measurement.
Those aren't in the template; [docs/BEYOND.md](docs/BEYOND.md) sketches the
path and the costs.

## Quickstart

```bash
git clone https://github.com/ikb-rmbl/research-commons my-portal && cd my-portal
npm install
npm run setup                 # creates DB, tables, admin user
# edit config/institution.ts  ← the one file that makes it yours
npx tsx scripts/import-zotero.ts --group=<your-group-id>   # if you have a Zotero library
npm run discover              # OpenAlex/CrossRef/DataCite by affiliation
npm run dev                   # → http://localhost:3000 (+ /admin)
npx tsx scripts/load-to-payload.ts   # in a second terminal
```

Full walkthrough: [QUICKSTART.md](QUICKSTART.md). Deploying to the internet
(~$0–20/month): [docs/deploy.md](docs/deploy.md).

## Documentation

- [QUICKSTART.md](QUICKSTART.md) — zero to running portal, step by step
- [docs/INSTITUTION_PROFILE.md](docs/INSTITUTION_PROFILE.md) — worksheet to fill out *before* you start
- [docs/ingestion.md](docs/ingestion.md) — every way to get content in, and the curation loop
- [docs/enrichment.md](docs/enrichment.md) — the optional AI tier
- [docs/deploy.md](docs/deploy.md) — Vercel + Neon production deployment
- [docs/LEARNINGS.md](docs/LEARNINGS.md) — **hard-won lessons from two years of running this in production**
- [docs/COSTS.md](docs/COSTS.md) — real hosting + AI costs from the RMBL deployment
- [docs/BEYOND.md](docs/BEYOND.md) — knowledge graphs, primers, re-use metrics: the advanced tiers

## Architecture in one paragraph

Next.js + [Payload CMS](https://payloadcms.com) in a single app, PostgreSQL
with pgvector, deployed on Vercel + Neon (both have workable free tiers).
Payload provides the admin UI and collections; a custom SQL layer adds
weighted full-text search vectors, vector embeddings, and array columns
Payload doesn't model (`push: false` keeps Payload from clobbering them —
see LEARNINGS). Pipeline scripts are plain TypeScript run with `tsx`; every
one is idempotent and incremental, so re-running is always safe.

## License

MIT. Built by the [Rocky Mountain Biological Laboratory](https://rmbl.org);
presented at OBFS 2026.
