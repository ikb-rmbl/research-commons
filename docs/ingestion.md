# Ingestion — every way content gets in

All ingestion is two-stage: **acquire** (write JSON to `scripts/output/` —
inspectable, no DB writes) then **load** (`load-to-payload.ts`, with the dev
server running, deduped and tombstone-aware). Everything re-runs safely.

## Publications

### Zotero import (`import-zotero.ts`)
If your station keeps its publication list in a Zotero group library, this is
your seed corpus in one command:

```bash
npx tsx scripts/import-zotero.ts --group=2351684            # whole library
npx tsx scripts/import-zotero.ts --group=2351684 --collection=8WJW5YQW
```

The group must be public. Journal articles, books, chapters, theses,
conference papers, reports, and preprints map to publication types;
attachments/notes/webpages are skipped.

### Automated discovery (`discover-publications.ts`)
Queries OpenAlex and CrossRef with your affiliation strings, plus a precise
ROR-id sweep when `institution.rorId` is set. Discovered papers arrive with
`institutionResearch` unset — they enter the review queue, not your counts.

**Tuning the relevance filter** (`scripts/lib/publication-discovery.ts`):
the three-tier structure — STRONG terms (sufficient alone), WEAK terms
(need a regional anchor), EXCLUSIONS (reject regardless) — starts populated
from your config and empty elsewhere. After your first run, review what came
in and add rules. Real examples from RMBL: "Gunnison" needed a Colorado
anchor (it's also a surname and a fish); "gothic (literature|fiction|novel)"
needed excluding (study site name collided with a genre).

### The review queue
```bash
npx tsx scripts/score-institution-research.ts --apply
```
Scores unreviewed papers by author overlap with your confirmed papers plus
config-driven text markers. In `/admin`, sort Publications by the score and
review top-down. Your yes/no calls are curation-tracked — permanent until a
human changes them.

## Datasets (`discover-datasets.ts`)

DataCite (covers most DOI-minting repositories), Zenodo, and Dryad, searched
with your affiliations + search terms. DataCite is the workhorse; the direct
Zenodo/Dryad queries add richer native metadata.

After loading, the optional AI tier extracts measured variables, collection
years, and companion-paper citations from the metadata — see
[enrichment.md](enrichment.md).

## News stories (`scrape-news.ts`)

Config-driven: add outlets to `institution.newsSources` with a search-URL
template. The generic scraper follows result links and extracts article text
with a readability heuristic — no per-site selectors for most local-news
sites. Articles must actually mention your institution to be kept.

```ts
newsSources: [
  { name: 'The Roanoke Times', searchUrl: 'https://roanoke.com/search/?q={query}' },
]
```

**Copyright rule baked into the template:** full text is indexed for search
but never displayed; story pages show title/date/excerpt and link out.

Load with `npx tsx scripts/load-stories.ts`.

## Documents

For policy documents, reports, and grey literature there's no universal API —
this collection is populated through the admin UI or by writing a small
importer against `createRecord('documents', {...})`. The RMBL implementation
(1,700+ documents from a community library + Federal Register) shows what a
source-specific importer looks like.

## Authors

```bash
npx tsx scripts/build-authors.ts --load-payload
```
Rebuilds the deduplicated author registry (ORCID first, then name matching)
across publications and datasets, linking works to authors. Destructive to
the authors table but derived entirely from works — safe to re-run any time.

## Citation counts

```bash
npx tsx scripts/fetch-citation-counts.ts --step=all --stale-days=30
```
OpenAlex (publications) + DataCite (datasets), refreshed when older than
30 days.

## Keeping current

`npm run pipeline` chains all of the above in dependency order. Weekly is
plenty; every phase is incremental.
