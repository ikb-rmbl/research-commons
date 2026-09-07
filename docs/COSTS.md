# Costs — real numbers from the RMBL deployment

Budget honesty for small organizations. Everything below is what the RMBL
Knowledge Commons actually pays or paid (2025–2026), scaled where noted to
this template's default scope. Your corpus is probably smaller than RMBL's
~17,000 items, so treat these as upper bounds.

## Hosting: $0–20/month

| Component | Free tier | Paid, when you outgrow it |
|---|---|---|
| **Vercel** (app hosting, deploys on git push) | Hobby: fine for a low-traffic portal | Pro $20/mo — RMBL uses this for team features + analytics |
| **Neon** (managed Postgres + pgvector) | 0.5 GB storage, autosuspend — fits a 5–10k-item portal comfortably | Launch $19/mo at ~10 GB |
| **Local dev database** | Free (Homebrew Postgres) | — |
| **S3** (only if you host PDFs/media) | — | RMBL: <$1/mo for ~3 GB of PDFs |

A small station's realistic bill: **$0/month** on free tiers, **$20–40/month**
fully grown. No servers to patch, deploys are `git push`.

## Free APIs (the whole ingestion tier)

OpenAlex, CrossRef, DataCite, Zenodo, Dryad, Zotero, ORCID — all free, no
keys. Set your contact email in `config/institution.ts` (polite-pool
etiquette; you get better rate limits for identifying yourself).

## AI enrichment (optional tier): dollars, not thousands

Real costs from RMBL runs on claude-opus (the most capable/most expensive
model — cheaper models cost 5–10× less):

| Task | RMBL actual | Per-item | Notes |
|---|---|---|---|
| Embeddings, ~13k items (Voyage voyage-4) | ~$1 | ~$0.0001 | re-embedding after metadata changes is equally cheap |
| Dataset variable extraction + GCMD matching, 1,555 datasets | $33 | ~$0.02 | one pass; incremental after that (new datasets only — cents/run) |
| Data re-use classification, 3,442 citing papers | $7 | ~$0.002 | advanced tier (see BEYOND.md) |
| Research-neighborhood primers, 75 neighborhoods | ~$5 | ~$0.07 | advanced tier; needs ≥500-pub corpus |
| Full VLM entity extraction, 1,592 papers | $266 | ~$0.17 | the big-ticket advanced item; entirely optional |

**Template-tier total for a 2,000-item portal: roughly $10–40 one-time, then
cents per month incremental.** Every LLM script prints its running cost and
supports `--limit` so you can pilot on 10 items before committing.

## The costs that aren't dollars

- **Curation time.** Discovery precision is imperfect by design (recall
  first, human review second). Budget: an hour tuning relevance rules after
  the first run, then ~15 min/week reviewing the scored queue.
- **Corpus thresholds.** Knowledge-graph features (BEYOND.md) need ~500+
  publications to produce meaningful structure. The core portal works at any
  size.
