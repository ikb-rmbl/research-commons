/**
 * Load scraped news stories into Payload (requires npm run dev running).
 * Reads scripts/output/stories-scraped.json (from scrape-news.ts), dedupes on
 * sourceUrl, honors duplicate tombstones. Full text goes into the fullText
 * field for search indexing — it is NOT displayed publicly (copyright).
 *
 * Usage: npx tsx scripts/load-stories.ts [--dry-run]
 */

import { readFileSync, existsSync } from 'fs'
import pg from 'pg'
import './lib/config.js'
import { OUTPUT_DIR } from './lib/config.js'
import { ensureAuth, checkServer, createRecord, getAllPaginated } from './lib/payload-client.js'

const dryRun = process.argv.includes('--dry-run')

async function main() {
  const path = `${OUTPUT_DIR}/stories-scraped.json`
  if (!existsSync(path)) {
    console.log('No stories-scraped.json — run scrape-news.ts first')
    return
  }
  if (!(await checkServer())) {
    console.error('Payload server not running — start with: npm run dev')
    process.exit(1)
  }
  await ensureAuth()

  const stories = JSON.parse(readFileSync(path, 'utf-8'))
  const existing = await getAllPaginated('stories', ['sourceUrl'])
  const seen = new Set(existing.map((s: any) => s.sourceUrl).filter(Boolean))

  // tombstones: admin-deleted stories stay deleted
  const db = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const { rows: tombstones } = await db.query(
    `SELECT keys FROM duplicate_tombstones WHERE collection = 'stories'`,
  )
  const deadUrls = new Set(tombstones.map((t) => t.keys?.source_url).filter(Boolean))
  await db.end()

  let created = 0, skipped = 0
  for (const s of stories) {
    if (seen.has(s.sourceUrl) || deadUrls.has(s.sourceUrl)) { skipped++; continue }
    if (dryRun) { created++; continue }
    await createRecord('stories', {
      title: s.title,
      storyType: 'news_article',
      date: s.date,
      sourceUrl: s.sourceUrl,
      author: s.source,
      fullText: s.fullText,
      summary: s.fullText.slice(0, 280),
    })
    created++
  }
  console.log(`${created} stories ${dryRun ? 'would be ' : ''}created, ${skipped} already loaded/tombstoned`)
}

main()
