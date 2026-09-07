/**
 * One-shot database bootstrap: lets Payload create its tables (drizzle push),
 * then applies the custom SQL layer (template-schema.sql).
 *
 * Run via: npm run setup   (or directly: PAYLOAD_PUSH=true npx tsx scripts/init-db.ts)
 */

import './lib/config.js' // loads .env
import { readFileSync } from 'fs'
import pg from 'pg'
import { getPayload } from 'payload'

process.env.PAYLOAD_PUSH = 'true'

async function main() {
  const { default: config } = await import('../src/payload.config.js')
  console.log('Creating Payload tables (one-time drizzle push)...')
  const payload = await getPayload({ config })
  console.log('  ✓ Payload tables ready')

  console.log('Applying custom schema (search vectors, embeddings, tombstones)...')
  const db = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  await db.query(readFileSync('scripts/sql/template-schema.sql', 'utf-8'))
  await db.end()
  console.log('  ✓ Custom schema applied')

  // first admin user so the /admin panel is usable immediately
  const email = process.env.PAYLOAD_ADMIN_EMAIL || 'admin@example.org'
  const password = process.env.PAYLOAD_ADMIN_PASSWORD
  if (password) {
    const existing = await payload.find({ collection: 'users', where: { email: { equals: email } } })
    if (existing.totalDocs === 0) {
      await payload.create({ collection: 'users', data: { email, password } })
      console.log(`  ✓ Admin user created (${email})`)
    }
  } else {
    console.log('  PAYLOAD_ADMIN_PASSWORD not set — create your admin user at /admin on first visit')
  }
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
