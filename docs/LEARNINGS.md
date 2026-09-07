# Learnings — two years of running this in production

The RMBL Knowledge Commons grew from this exact architecture to ~17,000 items,
15 collections, and a multi-stage AI pipeline. These are the lessons that cost
us real debugging time, encoded here so they don't cost you any. Each one is
already baked into the template — this document explains *why* the code looks
the way it does, so you don't "clean it up" into a bug.

## Data modeling

**Tri-state flags must be TEXT, never boolean.** The `institutionResearch`
field is `'yes' | 'no' | NULL` where NULL means "a human hasn't reviewed this
yet." Model it as a Payload checkbox and the first admin save silently
collapses NULL→false — your entire review queue drains itself and you can't
tell reviewed-no from never-reviewed. This bit us; it's a select field now.

**Curation must be cell-level, not row-level.** Admins fix one field of a
record the pipeline created; the next pipeline run must not overwrite that fix
but must stay free to update every *other* field. The `curatedFields` hook
records which cells a human touched; pipeline SQL respects it per-cell.
Row-level "locked" flags freeze the whole record and rot.

**Deletes must leave tombstones.** When an admin deletes a duplicate, the next
pipeline run will happily re-discover and re-create it. The `beforeDelete`
hook snapshots identifying keys (DOI, title+year, source URL) to
`duplicate_tombstones`; loaders check it. Without this, curation is Sisyphean.

**`push: false`, always.** Payload's schema push will drop columns it doesn't
know about — which is every custom column (tsvector, embeddings, text[]).
The template bootstraps with a one-shot push (`npm run setup`) then locks it.
If you add Payload fields later, re-run `PAYLOAD_PUSH=true npx tsx
scripts/init-db.ts` deliberately — never leave push on.

## Discovery and ingestion

**Affiliation search needs a three-tier relevance filter.** String search
admits homonyms (our study site "Gothic, Colorado" pulled in an entire
literary genre; "Gunnison" is also a person and a fish). The filter structure
in `lib/publication-discovery.ts` — strong terms, weak terms requiring a
regional anchor, and exclusions — is the shape that survived contact with
reality. Budget an hour of rule-writing after your first discovery run, and
record *why* each rule exists.

**Prefer ROR-id filtering when your institution has one.** String affiliation
search is recall-oriented and noisy; OpenAlex's `institutions.ror:` filter is
precision-oriented. The template runs both when a ROR id is configured.

**Every loader must be idempotent and every discovery incremental.** You will
re-run everything, many times, often after a half-failure. The pattern
throughout: a natural "unprocessed" marker (NULL column, missing file, dedup
index) checked at the top, so re-runs only touch new work. If you write a new
script, give it `--dry-run` and make re-running it a no-op.

**Scoring beats classifying for review queues.** Don't auto-decide what's
"your institution's research" — score it (author overlap with confirmed
papers + text markers) and let a human review a *sorted* queue. RMBL's scorer
cut a 864-paper triage queue to 300 above-threshold candidates at 92% recall.
The human stays the decider; the machine orders the work.

## AI enrichment (if you use it)

**Gate every LLM claim on evidence.** Our dataset-variable extractor accepts
a unit only when the model quotes the metadata fragment stating it; GCMD
taxonomy paths are validated verbatim against the vocabulary file, and
invented paths are dropped. Extraction without validation gates fabricates
plausible-looking metadata — with them, our full-corpus run had 0 surviving
hallucinated paths out of ~5,000 extractions.

**Fill only NULLs with extracted values.** LLM-extracted data-collection
years fill `temporal_extent` only where the repository metadata had nothing —
authoritative sources always win over extraction.

**Read ALL text blocks from LLM responses.** Reasoning-capable models emit a
thinking block *before* the text block on hard inputs, so `content[0].text`
silently returns empty for exactly the items needing the most thought.
`lib/claude-api.ts` concatenates all text blocks; don't simplify it.

**Expect safety-classifier false positives and handle them.** One benign
disease-evolution dataset in our corpus trips a bio classifier and returns an
empty refusal. The extractor marks such items processed-empty instead of
retrying forever. Any batch LLM pipeline needs a poison-pill path.

**News full text is for search, not display.** Scraped articles are
copyrighted: index the text, show title/date/excerpt, link out. The Stories
detail page does this — keep it that way.

## Operations

**Postgres full-text with weighted vectors is plenty.** Title=A, abstract=B,
full text=C with `websearch_to_tsquery` handles a 17k-item corpus instantly.
You do not need Elasticsearch. Add pgvector embeddings when you want
semantic search — it's an enhancement, not a prerequisite.

**Author deduplication is the highest-leverage data-quality work.** Every
cross-collection feature (author pages, co-authorship, provenance scoring)
sits on the deduplicated registry. Invest there before anything fancy.

**Small-org hosting should round to zero.** Vercel free/Pro + Neon free tier
runs the whole thing; RMBL pays ~$20/month at 10× this template's default
scale. Don't stand up Kubernetes for a portal.

**Corpus-size thresholds for the fancy stuff.** Below ~500 publications,
community detection produces flat noise and LLM-written research primers are
thin. The core portal and search work at any size; save the knowledge-graph
tier (see BEYOND.md) until your corpus earns it.
