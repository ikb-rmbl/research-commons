/**
 * Import publications from a Zotero group library.
 *
 * Many field stations already maintain their publication list as a public
 * Zotero group — this importer turns that into your portal's seed corpus.
 * Items are normalized and written to
 * scripts/output/publications-discovered-zotero.json, which load-to-payload.ts
 * merges (with DOI/title dedup) on the next load.
 *
 * Usage:
 *   npx tsx scripts/import-zotero.ts --group=2351684 [--limit=N]
 *   npx tsx scripts/import-zotero.ts --group=2351684 --collection=8WJW5YQW
 *
 * The group must be public (Library Settings → Public). Find the group ID in
 * the URL: zotero.org/groups/<ID>/<name>.
 */

import './lib/config.js'
import { sleep } from './lib/concurrency.js'
import { saveDiscoveredPublications } from './lib/publication-discovery.js'
import { parseAuthorString, type ParsedAuthor } from './lib/author-parsing.js'
import type { NormalizedPublication } from './lib/types.js'

const groupArg = process.argv.find((a) => a.startsWith('--group='))?.split('=')[1]
const collectionArg = process.argv.find((a) => a.startsWith('--collection='))?.split('=')[1]
const limitArg = process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1]
const limit = limitArg ? parseInt(limitArg) : Infinity

if (!groupArg) {
  console.error('Usage: npx tsx scripts/import-zotero.ts --group=<groupId> [--collection=<key>] [--limit=N]')
  process.exit(1)
}

// Zotero itemType → our publicationType
const TYPE_MAP: Record<string, string> = {
  journalArticle: 'article',
  book: 'book',
  bookSection: 'chapter',
  thesis: 'thesis',
  conferencePaper: 'conference',
  report: 'report',
  preprint: 'preprint',
}

function zoteroCreators(creators: any[] | undefined): ParsedAuthor[] {
  const out: ParsedAuthor[] = []
  for (const c of creators ?? []) {
    if (c.creatorType && c.creatorType !== 'author') continue
    if (c.lastName) {
      out.push({ family: c.lastName, given: c.firstName || '' })
    } else if (c.name) {
      out.push(...parseAuthorString(c.name))
    }
  }
  return out
}

async function main() {
  const base = collectionArg
    ? `https://api.zotero.org/groups/${groupArg}/collections/${collectionArg}/items`
    : `https://api.zotero.org/groups/${groupArg}/items`

  const pubs: NormalizedPublication[] = []
  let start = 0
  let skippedTypes = 0
  while (pubs.length < limit) {
    const res = await fetch(`${base}?format=json&limit=100&start=${start}`, {
      headers: { 'Zotero-API-Version': '3' },
    })
    if (!res.ok) {
      console.error(`Zotero API ${res.status} — is the group public?`)
      process.exit(1)
    }
    const items: any[] = await res.json()
    if (!items.length) break
    for (const item of items) {
      const d = item.data
      if (!d.title || !TYPE_MAP[d.itemType]) {
        if (d.itemType && !['attachment', 'note'].includes(d.itemType)) skippedTypes++
        continue
      }
      const yearMatch = (d.date || '').match(/\b(1[89]\d{2}|20\d{2})\b/)
      pubs.push({
        _sourceId: `zotero:${item.key}`,
        title: d.title,
        authors: zoteroCreators(d.creators),
        year: yearMatch ? parseInt(yearMatch[1]) : 0,
        publicationType: TYPE_MAP[d.itemType],
        journal: d.publicationTitle || d.bookTitle || null,
        volume: d.volume || null,
        issue: d.issue || null,
        pages: d.pages || null,
        doi: d.DOI ? d.DOI.toLowerCase().replace(/^https?:\/\/doi\.org\//, '') : null,
        publisher: d.publisher || null,
        abstract: d.abstractNote || null,
        keywords: (d.tags ?? []).slice(0, 20).map((t: any) => ({ keyword: t.tag })),
        pdfLink: null,
        externalUrl: d.url || (d.DOI ? `https://doi.org/${d.DOI}` : null),
        editors: [],
        _chaptertitle: null,
        _degree: null,
        _institution: d.university || null,
        _crossrefEnriched: false,
        _unpaywallEnriched: false,
        _oaStatus: null,
        _source: 'imported',
        _discoveryMethod: 'zotero',
      })
    }
    start += items.length
    const total = parseInt(res.headers.get('total-results') || '0')
    process.stdout.write(`\r  ${start}/${total} items scanned, ${pubs.length} publications`)
    if (start >= total) break
    await sleep(600) // Zotero politeness
  }
  console.log()
  if (skippedTypes) console.log(`  (${skippedTypes} items of unmapped types skipped — presentations, webpages, etc.)`)
  saveDiscoveredPublications('zotero', pubs.slice(0, limit))
  console.log('Next: npm run dev (in another terminal), then npx tsx scripts/load-to-payload.ts')
}

main()
