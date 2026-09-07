# Beyond the template — where this road leads

The [RMBL Knowledge Commons](https://rmblknowledgecommons.org) runs this
template's architecture plus several advanced tiers that are deliberately NOT
included here — each needs corpus scale (~500+ publications), real LLM spend,
and tuning to your context. This page is the map, with actual costs, so you
know what's possible and what it takes. The RMBL codebase is the reference
implementation for all of it.

## Entity extraction & knowledge cards (~$0.15/paper)

LLM extraction of species, places, methods, and concepts from full text into
an entity-mentions table → species/place/method browse pages, faceted search,
knowledge cards. RMBL: 1,592 papers for $266, yielding 150k+ entity mentions
across 20k+ entities. Needs: full-text PDFs, an extraction prompt tuned to
your domain, embedding-based entity clustering to merge variants.

## Knowledge graphs & research neighborhoods (compute-only + ~$5)

Co-occurrence graphs over entities and works → Louvain community detection →
~100 "research neighborhoods," each named and summarized by an LLM →
interactive WebGL graph exploration (Sigma.js). The gotcha worth knowing
before you start: community detection is non-deterministic, so re-running it
invalidates everything attached to communities — treat neighborhood IDs as
disposable.

## Research primers & frontiers (~$0.07/neighborhood; $25 for frontiers)

Per-neighborhood LLM-written research primers with verbatim-verified
citations; then "grounded frontiers" — open questions extracted from recent
papers with evidence quotes and currency tracking. RMBL's full frontier
rebuild: $25 for 68 frontiers citing 425 papers.

## FAIR data re-use measurement (~$10)

The R in FAIR, quantified: which datasets are re-used by groups independent
of their creators? Two-phase assessment — formal citations (OpenAlex/DataCite)
plus forward-citations of companion papers classified from citation-context
sentences — with independence judged against the deduplicated author registry
and co-authorship graph. RMBL's headline: ~1 in 5 aged, DOI'd datasets shows
provable independent re-use, and following companion papers more than doubled
the evidence over formal data citations alone. Full design:
`specification/dataset-reuse-design.md` in the RMBL repo.

## Public API + AI-assistant access

REST API v1 with LLM-friendly plain-text mode, `llms.txt`, and an MCP server
so Claude/other assistants can search your portal as a tool. RMBL's is live —
point a Custom Connector at its `/api/mcp`.

## Adopting any of these

Start from the RMBL repo's `CLAUDE.md` (a complete map of every script) and
the relevant `specification/*.md` design notes. The honest sequence: run this
template for a season first — the curation habits and corpus quality it
builds are the foundation everything above stands on.
