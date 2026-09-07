/**
 * Generic news scraper — driven by institution.newsSources config.
 *
 * For each configured outlet, fetches search results for your queries
 * (defaulting to institution names), follows same-domain article links, and
 * extracts the main text with a readability heuristic (largest cluster of
 * <p> text). No per-site selectors needed for most local-news sites; add
 * outlets to config/institution.ts as:
 *
 *   newsSources: [
 *     { name: 'The Roanoke Times', searchUrl: 'https://roanoke.com/search/?q={query}' },
 *   ]
 *
 * Writes scripts/output/stories-scraped.json for load-stories.ts.
 * Re-runs skip URLs already scraped (resumable).
 *
 * LESSON FROM RMBL: store full text for SEARCH but don't display it — news
 * articles are copyrighted. The Stories detail page links out to the source
 * and shows only title/date/excerpt. Keep it that way.
 *
 * Usage:
 *   npx tsx scripts/scrape-news.ts [--limit=N] [--source="Outlet Name"]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import './lib/config.js'
import { OUTPUT_DIR } from './lib/config.js'
import { institution } from '../config/institution.js'
import { sleep } from './lib/concurrency.js'

const limitArg = process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1]
const limit = limitArg ? parseInt(limitArg) : 200
const sourceArg = process.argv.find((a) => a.startsWith('--source='))?.split('=')[1]

const OUT_PATH = `${OUTPUT_DIR}/stories-scraped.json`
const UA = `research-commons-scraper (${institution.contactEmail})`

interface ScrapedStory {
  sourceUrl: string
  title: string
  date: string | null
  source: string
  fullText: string
  scrapedAt: string
}

function extractLinks(html: string, baseUrl: string): string[] {
  const origin = new URL(baseUrl).origin
  const links = new Set<string>()
  for (const m of html.matchAll(/href=["']([^"'#?]+)[^"']*["']/g)) {
    try {
      const u = new URL(m[1], origin)
      if (u.origin !== origin) continue
      // article-looking paths: contain a slug with hyphens, exclude obvious nav
      const p = u.pathname
      if (!/[a-z0-9]-[a-z0-9-]{10,}/.test(p)) continue
      if (/\/(tag|category|author|search|subscribe|account|login|photo|video|gallery)s?\//.test(p)) continue
      links.add(u.origin + p)
    } catch { /* bad href */ }
  }
  return [...links]
}

function extractArticle(html: string): { title: string; date: string | null; text: string } {
  const title =
    html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ??
    html.match(/<title[^>]*>([^<]+)</)?.[1] ??
    ''
  const date =
    html.match(/<meta property="article:published_time" content="([^"]+)"/)?.[1] ??
    html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1] ??
    null
  // readability heuristic: prefer <article>/<main>, else whole body; join <p> runs
  const scope =
    html.match(/<article[\s\S]*?<\/article>/i)?.[0] ??
    html.match(/<main[\s\S]*?<\/main>/i)?.[0] ??
    html
  const paras = [...scope.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((t) => t.length > 60)
  return { title: title.replace(/&[a-z#0-9]+;/g, ' ').trim(), date, text: paras.join('\n\n') }
}

async function main() {
  const sources = institution.newsSources.filter((s) => !sourceArg || s.name === sourceArg)
  if (!sources.length) {
    console.log('No news sources configured — add outlets to institution.newsSources in config/institution.ts')
    return
  }
  mkdirSync(OUTPUT_DIR, { recursive: true })
  const existing: ScrapedStory[] = existsSync(OUT_PATH) ? JSON.parse(readFileSync(OUT_PATH, 'utf-8')) : []
  const seen = new Set(existing.map((s) => s.sourceUrl))
  let added = 0

  for (const source of sources) {
    const queries = source.queries?.length ? source.queries : [institution.name, institution.shortName]
    console.log(`\n--- ${source.name} ---`)
    for (const query of queries) {
      const searchUrl = source.searchUrl.replace('{query}', encodeURIComponent(query))
      let html: string
      try {
        const res = await fetch(searchUrl, { headers: { 'User-Agent': UA } })
        if (!res.ok) { console.log(`  search ${res.status} for "${query}"`); continue }
        html = await res.text()
      } catch (e: any) { console.log(`  search failed: ${e.message}`); continue }

      const links = extractLinks(html, searchUrl).filter((u) => !seen.has(u))
      console.log(`  "${query}": ${links.length} candidate articles`)
      for (const url of links) {
        if (added >= limit) break
        await sleep(1500)
        try {
          const res = await fetch(url, { headers: { 'User-Agent': UA } })
          if (!res.ok) continue
          const art = extractArticle(await res.text())
          if (!art.title || art.text.length < 400) continue
          // only keep articles that actually mention the institution
          const hay = `${art.title} ${art.text}`.toLowerCase()
          if (!institution.affiliations.some((a) => hay.includes(a.toLowerCase())) &&
              !hay.includes(institution.shortName.toLowerCase())) continue
          existing.push({
            sourceUrl: url, title: art.title, date: art.date,
            source: source.name, fullText: art.text, scrapedAt: new Date().toISOString(),
          })
          seen.add(url)
          added++
          console.log(`    + ${art.title.slice(0, 70)}`)
        } catch { /* skip article */ }
      }
    }
  }
  writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2))
  console.log(`\n${added} new stories (${existing.length} total) → ${OUT_PATH}`)
  if (added) console.log('Next: npx tsx scripts/load-stories.ts (with npm run dev running)')
}

main()
