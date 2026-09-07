# Enrichment — the optional AI tier

Everything here is optional, gated on API keys, and priced in dollars (see
[COSTS.md](COSTS.md)). The portal is fully functional without any of it.

## Semantic search embeddings

```bash
# .env: VOYAGE_API_KEY=...   (voyage-4; ~$0.0001/item)
npx tsx scripts/generate-embeddings.ts --collection=all
```

Adds a 1024-dim vector per item (title + abstract/description + the
LLM-extracted structured fields below, when present). The embedding column
is the foundation for "more like this" and hybrid search — the template
stores vectors; ranking UIs are yours to add (or see the RMBL reference
implementation).

## Dataset variable extraction + GCMD matching

```bash
# .env: ANTHROPIC_API_KEY=...   (~$0.02/dataset on opus; pilot with --limit)
npx tsx scripts/extract-dataset-variables.ts --limit=10 --report   # pilot
npx tsx scripts/extract-dataset-variables.ts                       # full corpus
npx tsx scripts/link-dataset-citations.ts                          # companion papers
```

One LLM pass per dataset over its metadata extracts:

- **Measured variables** (canonical names — the /datasets facet), each
  matched to a **NASA GCMD Science Keywords** path chosen verbatim from the
  vocabulary shipped in `scripts/data/gcmd-science-keywords.json` (validated;
  invented paths dropped)
- **Units**, evidence-gated: accepted only when the model quotes the metadata
  fragment stating them — no conventional-unit guessing
- **Data-collection years** (fills temporal coverage ONLY where repository
  metadata had none; never publication dates), an **ongoing-collection**
  flag, and **sampling frequency**
- **Companion-paper citations**, which `link-dataset-citations.ts` matches to
  your publications (DOI exact, then title similarity)

Incremental by design: processed datasets are marked, so routine re-runs
only touch new arrivals (cents). Read the design rationale in
[LEARNINGS.md](LEARNINGS.md) before changing the validation gates.

## Relevance scoring

```bash
npx tsx scripts/score-institution-research.ts --apply
```

No API key needed (it's deterministic), but listed here because it's the
pattern the LLM tiers follow: machines order the review queue, humans decide.
