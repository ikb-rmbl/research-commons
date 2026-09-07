/**
 * Score publications for "is this our institution's research?" — fills the
 * institution_research triage queue. See lib/research-score.ts for signals
 * (author overlap with confirmed papers + config-driven text markers).
 *
 * LESSON FROM RMBL: keep the flag TRI-STATE text ('yes'/'no'/NULL), never a
 * boolean — a Payload checkbox save collapses NULL to false and silently
 * drains your review queue. NULL = unreviewed, and the admin sidebar shows
 * the score so curators review highest-likelihood first.
 *
 * Usage: npx tsx scripts/score-institution-research.ts [--apply]
 */

import pg from 'pg'
import './lib/config.js'
import { buildScoringContext, scorePublication } from './lib/research-score.js'

const apply = process.argv.includes('--apply')

async function main() {
  const db = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const ctx = await buildScoringContext(db)
    const { rows } = await db.query(`
      SELECT id, title, abstract, journal FROM publications
      WHERE institution_research IS NULL
    `)
    console.log(`${rows.length} unreviewed publications to score${apply ? '' : ' (dry run — add --apply to write)'}`)
    let written = 0
    for (const p of rows) {
      const { score } = await scorePublication(db, ctx, p)
      if (apply) {
        await db.query(`UPDATE publications SET institution_research_score = $1 WHERE id = $2`, [score, p.id])
        written++
      }
    }
    if (apply) console.log(`${written} scores written — sort the admin review queue by score, highest first`)
  } finally {
    await db.end()
  }
}

main()
