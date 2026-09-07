import Link from 'next/link'
import { getDb } from './lib/db'
import { institution } from '../../../config/institution'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const db = getDb()
  let counts = { publications: 0, datasets: 0, documents: 0, stories: 0, authors: 0 }
  try {
    const { rows: [r] } = await db.query(`
      SELECT
        (SELECT count(*) FROM publications)::int AS publications,
        (SELECT count(*) FROM datasets)::int AS datasets,
        (SELECT count(*) FROM documents)::int AS documents,
        (SELECT count(*) FROM stories)::int AS stories,
        (SELECT count(*) FROM authors)::int AS authors
    `)
    counts = r
  } catch { /* fresh install before first load */ }

  const tiles = [
    { label: 'Publications', href: '/search?type=publications', n: counts.publications },
    { label: 'Datasets', href: '/datasets', n: counts.datasets },
    ...(institution.collections.documents ? [{ label: 'Documents', href: '/search?type=documents', n: counts.documents }] : []),
    ...(institution.collections.stories ? [{ label: 'Stories', href: '/stories', n: counts.stories }] : []),
    { label: 'Authors', href: '/authors', n: counts.authors },
  ]

  return (
    <div className="detail" style={{ maxWidth: '860px', textAlign: 'center' }}>
      <h1 style={{ marginTop: '48px' }}>{institution.siteTitle}</h1>
      <p style={{ color: 'var(--fg-2)', maxWidth: '58ch', margin: '12px auto 28px' }}>{institution.tagline}</p>

      <form className="search-form" action="/search" method="GET" style={{ justifyContent: 'center' }}>
        <label htmlFor="home-q" className="sr-only">Search</label>
        <input id="home-q" className="search-input" type="text" name="q" placeholder="Search everything…" style={{ maxWidth: '420px' }} />
        <button className="search-button" type="submit">Search</button>
      </form>

      <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', margin: '40px 0' }}>
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} style={{ textDecoration: 'none', background: 'var(--color-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '18px 26px', minWidth: '130px' }}>
            <div style={{ fontSize: '30px', fontWeight: 700, color: 'var(--fg-1)' }}>{t.n.toLocaleString()}</div>
            <div style={{ fontSize: '13px', color: 'var(--fg-2)' }}>{t.label}</div>
          </Link>
        ))}
      </div>

      {counts.publications === 0 && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', textAlign: 'left', maxWidth: '560px', margin: '0 auto' }}>
          <strong>Empty portal?</strong>
          <p style={{ fontSize: '14px', color: 'var(--fg-2)', marginTop: '8px' }}>
            Seed it: edit <code>config/institution.ts</code>, then run{' '}
            <code>npm run discover</code> (or <code>npx tsx scripts/import-zotero.ts --group=…</code> if
            you keep publications in Zotero) followed by{' '}
            <code>npx tsx scripts/load-to-payload.ts</code>. See <code>QUICKSTART.md</code>.
          </p>
        </div>
      )}
    </div>
  )
}
