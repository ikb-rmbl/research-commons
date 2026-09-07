/**
 * Pipeline orchestrator — run everything in dependency order.
 *
 * Phases:
 *   discover  — find new publications (OpenAlex/CrossRef) + datasets
 *               (DataCite/Zenodo/Dryad) matching your institution config
 *   load      — load discoveries into Payload (requires `npm run dev` running
 *               in another terminal), then score the review queue
 *   news      — scrape configured news outlets + load stories
 *   authors   — rebuild the deduplicated author registry
 *   citations — refresh external citation counts (30-day staleness)
 *   enrich    — LLM dataset variable extraction (needs ANTHROPIC_API_KEY)
 *   embed     — Voyage AI embeddings for semantic search (needs VOYAGE_API_KEY)
 *
 * Usage:
 *   npx tsx scripts/pipeline.ts                 # everything
 *   npx tsx scripts/pipeline.ts --phase=discover
 */

import { execSync } from 'child_process'
import './lib/config.js'

const phaseArg = process.argv.find((a) => a.startsWith('--phase='))?.split('=')[1] || 'all'
const dryRun = process.argv.includes('--dry-run')

const opts = { cwd: process.cwd(), encoding: 'utf-8' as const, stdio: 'inherit' as const }
const flags = dryRun ? '--dry-run' : ''
const run = (cmd: string) => execSync(`npx tsx ${cmd}`, opts)
const should = (p: string) => phaseArg === 'all' || phaseArg === p

function banner(title: string) {
  console.log('\n' + '='.repeat(60))
  console.log(title)
  console.log('='.repeat(60))
}

async function main() {
  if (should('discover')) {
    banner('DISCOVER — publications + datasets')
    try { run(`scripts/discover-publications.ts ${flags}`) } catch { console.error('publication discovery failed — continuing') }
    try { run(`scripts/discover-datasets.ts ${flags}`) } catch { console.error('dataset discovery failed — continuing') }
  }

  if (should('load')) {
    banner('LOAD — discoveries into Payload (requires npm run dev)')
    try {
      run(`scripts/load-to-payload.ts ${flags}`)
      run(`scripts/score-institution-research.ts ${dryRun ? '' : '--apply'}`)
    } catch { console.error('load failed — is the dev server running?') }
  }

  if (should('news')) {
    banner('NEWS — scrape outlets + load stories')
    try {
      run(`scripts/scrape-news.ts ${flags}`)
      run(`scripts/load-stories.ts ${flags}`)
    } catch { console.error('news phase failed — continuing') }
  }

  if (should('authors')) {
    banner('AUTHORS — rebuild registry')
    try { run(`scripts/build-authors.ts --load-payload`) } catch { console.error('authors failed — continuing') }
  }

  if (should('citations')) {
    banner('CITATIONS — external citation counts')
    try { run(`scripts/fetch-citation-counts.ts --step=all --stale-days=30 ${flags}`) } catch { console.error('citations failed — continuing') }
  }

  if (should('enrich')) {
    banner('ENRICH — LLM dataset variable extraction')
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        run(`scripts/extract-dataset-variables.ts ${flags}`)
        run(`scripts/link-dataset-citations.ts ${flags}`)
      } catch { console.error('enrichment failed — continuing') }
    } else {
      console.log('ANTHROPIC_API_KEY not set — skipping (optional tier, see docs/04-enrich.md)')
    }
  }

  if (should('embed')) {
    banner('EMBED — semantic-search embeddings')
    if (process.env.VOYAGE_API_KEY) {
      try { run(`scripts/generate-embeddings.ts --collection=all --level=summary`) } catch { console.error('embeddings failed — continuing') }
    } else {
      console.log('VOYAGE_API_KEY not set — skipping (optional tier, see docs/04-enrich.md)')
    }
  }

  console.log('\nPipeline complete.')
}

main()
