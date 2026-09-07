/**
 * Dataset discovery — DataCite, Zenodo, and Dryad, driven by config.
 *
 * Queries each repository for datasets matching your institution's
 * affiliations and search terms, normalizes, dedupes against what's already
 * loaded, and writes scripts/output/datasets-discovered-<source>.json for
 * load-to-payload.ts.
 *
 * DataCite covers most repositories that mint DOIs (Dryad, Zenodo, ESS-DIVE,
 * EDI, figshare, institutional repos), so it's the workhorse; the Zenodo and
 * Dryad direct queries catch records with richer metadata than their DataCite
 * copies.
 *
 * Usage:
 *   npx tsx scripts/discover-datasets.ts [--dry-run] [--limit=N] [--source=datacite|zenodo|dryad|all]
 */

import './lib/config.js'
import { institution } from '../config/institution.js'
import { sleep } from './lib/concurrency.js'
import {
  loadExistingDatasets,
  buildDedupIndex,
  isDuplicate,
  saveDiscoveredDatasets,
  normalizeLicense,
  stripHtml,
} from './lib/dataset-discovery.js'
import type { NormalizedDataset } from './lib/types.js'

const dryRun = process.argv.includes('--dry-run')
const sourceArg = process.argv.find((a) => a.startsWith('--source='))?.split('=')[1] ?? 'all'
const limitArg = process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1]
const limit = limitArg ? parseInt(limitArg) : 1000

const TERMS = [...institution.affiliations, ...institution.searchTerms]

function base(partial: Partial<NormalizedDataset> & { _sourceId: string; title: string }): NormalizedDataset {
  return {
    description: '',
    creators: [],
    datePublished: null,
    publicationYear: 0,
    spatialExtent: null,
    temporalExtent: { start: null, end: null },
    downloadUrl: null,
    doi: null,
    _doiStatus: 'none',
    repository: null,
    externalCatalogUrl: null,
    spatialDescription: '',
    tags: [],
    license: null,
    resourceType: 'dataset',
    dataPublisher: '',
    _citation: null,
    _source: 'discovered',
    _metadataLink: null,
    _webMapLink: null,
    ...partial,
  } as NormalizedDataset
}

async function searchDataCite(term: string): Promise<NormalizedDataset[]> {
  const out: NormalizedDataset[] = []
  let url =
    `https://api.datacite.org/dois?query=${encodeURIComponent(`"${term}"`)}` +
    `&resource-type-id=dataset&page[size]=100`
  for (let page = 0; page < 10 && url; page++) {
    const res = await fetch(url)
    await sleep(500)
    if (!res.ok) break
    const j = await res.json()
    for (const d of j.data ?? []) {
      const a = d.attributes
      if (!a?.titles?.[0]?.title) continue
      out.push(
        base({
          _sourceId: `datacite:${a.doi}`,
          title: a.titles[0].title,
          description: stripHtml(a.descriptions?.[0]?.description ?? '') ?? '',
          creators: (a.creators ?? []).map((c: any) => ({
            name: c.name ?? [c.familyName, c.givenName].filter(Boolean).join(', '),
            orcid: c.nameIdentifiers?.find((n: any) => n.nameIdentifierScheme === 'ORCID')?.nameIdentifier ?? null,
            affiliation: c.affiliation?.[0]?.name ?? c.affiliation?.[0] ?? null,
          })),
          datePublished: a.registered ?? null,
          publicationYear: a.publicationYear ?? 0,
          doi: a.doi?.toLowerCase() ?? null,
          _doiStatus: a.doi ? 'valid' : 'none',
          repository: a.publisher ?? null,
          externalCatalogUrl: a.url ?? (a.doi ? `https://doi.org/${a.doi}` : null),
          tags: (a.subjects ?? []).slice(0, 20).map((s: any) => s.subject).filter(Boolean),
          license: normalizeLicense(a.rightsList?.[0]?.rightsIdentifier ?? a.rightsList?.[0]?.rights ?? null),
          dataPublisher: a.publisher ?? '',
        }),
      )
    }
    url = j.links?.next ?? null
  }
  return out
}

async function searchZenodo(term: string): Promise<NormalizedDataset[]> {
  const res = await fetch(
    `https://zenodo.org/api/records?q=${encodeURIComponent(`"${term}"`)}&type=dataset&size=100`,
  )
  await sleep(1000)
  if (!res.ok) return []
  const j = await res.json()
  return (j.hits?.hits ?? []).map((h: any) =>
    base({
      _sourceId: `zenodo:${h.id}`,
      title: h.metadata?.title ?? '',
      description: stripHtml(h.metadata?.description ?? '') ?? '',
      creators: (h.metadata?.creators ?? []).map((c: any) => ({
        name: c.name, orcid: c.orcid ?? null, affiliation: c.affiliation ?? null,
      })),
      datePublished: h.metadata?.publication_date ?? null,
      publicationYear: parseInt((h.metadata?.publication_date ?? '').slice(0, 4)) || 0,
      doi: h.doi?.toLowerCase() ?? null,
      _doiStatus: h.doi ? 'valid' : 'none',
      repository: 'Zenodo',
      externalCatalogUrl: h.links?.self_html ?? null,
      tags: (h.metadata?.keywords ?? []).slice(0, 20),
      license: normalizeLicense(h.metadata?.license?.id ?? null),
      dataPublisher: 'Zenodo',
    }),
  ).filter((d: NormalizedDataset) => d.title)
}

async function searchDryad(term: string): Promise<NormalizedDataset[]> {
  const res = await fetch(
    `https://datadryad.org/api/v2/search?q=${encodeURIComponent(term)}&per_page=100`,
  )
  await sleep(1000)
  if (!res.ok) return []
  const j = await res.json()
  return (j._embedded?.['stash:datasets'] ?? []).map((d: any) =>
    base({
      _sourceId: `dryad:${d.identifier}`,
      title: d.title ?? '',
      description: stripHtml(d.abstract ?? '') ?? '',
      creators: (d.authors ?? []).map((c: any) => ({
        name: [c.lastName, c.firstName].filter(Boolean).join(', '),
        orcid: c.orcid ?? null,
        affiliation: c.affiliation ?? null,
      })),
      datePublished: d.publicationDate ?? null,
      publicationYear: parseInt((d.publicationDate ?? '').slice(0, 4)) || 0,
      doi: d.identifier?.replace(/^doi:/, '').toLowerCase() ?? null,
      _doiStatus: d.identifier ? 'valid' : 'none',
      repository: 'Dryad',
      externalCatalogUrl: d.identifier ? `https://datadryad.org/dataset/${d.identifier}` : null,
      tags: (d.keywords ?? []).slice(0, 20),
      license: normalizeLicense(d.license ?? null),
      dataPublisher: 'Dryad',
    }),
  ).filter((d: NormalizedDataset) => d.title)
}

async function main() {
  const existing = loadExistingDatasets()
  const index = buildDedupIndex(existing)
  console.log(`${existing.length} existing datasets loaded for dedup`)

  const sources: [string, (t: string) => Promise<NormalizedDataset[]>][] = []
  if (sourceArg === 'datacite' || sourceArg === 'all') sources.push(['datacite', searchDataCite])
  if (sourceArg === 'zenodo' || sourceArg === 'all') sources.push(['zenodo', searchZenodo])
  if (sourceArg === 'dryad' || sourceArg === 'all') sources.push(['dryad', searchDryad])

  for (const [name, fn] of sources) {
    console.log(`\n--- ${name} ---`)
    const found = new Map<string, NormalizedDataset>()
    for (const term of TERMS) {
      const results = await fn(term)
      for (const d of results) {
        const key = d.doi ?? d._sourceId
        if (!found.has(key)) found.set(key, d)
      }
      console.log(`  "${term}": ${results.length} results (${found.size} unique so far)`)
    }
    const fresh = [...found.values()].filter((d) => !isDuplicate(d, index)).slice(0, limit)
    console.log(`  ${fresh.length} new after dedup`)
    if (!dryRun && fresh.length) saveDiscoveredDatasets(name, fresh)
  }
  if (!dryRun) console.log('\nNext: npx tsx scripts/load-to-payload.ts (with npm run dev running)')
}

main()
