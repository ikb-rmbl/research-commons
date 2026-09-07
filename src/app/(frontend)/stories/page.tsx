import Link from 'next/link'
import { getDb } from '../lib/db'

export const dynamic = 'force-dynamic'
const PAGE_SIZE = 25

export default async function StoriesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams
  const db = getDb()
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)
  const q = (params.q ?? '').slice(0, 200)

  const where = q ? `search_vector @@ websearch_to_tsquery('english', $1)` : 'TRUE'
  const args = q ? [q] : []
  const [{ rows }, { rows: [{ n: total }] }] = await Promise.all([
    db.query(
      `SELECT id, title, author, to_char(date, 'YYYY-MM-DD') AS date, source_url, summary
       FROM stories WHERE ${where}
       ORDER BY date DESC NULLS LAST, id DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`, args),
    db.query(`SELECT count(*)::int AS n FROM stories WHERE ${where}`, args),
  ])

  const url = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    const merged = { q: q || undefined, page: undefined as string | undefined, ...over }
    for (const [k, v] of Object.entries(merged)) if (v && v !== '1') p.set(k, v)
    const s = p.toString()
    return `/stories${s ? '?' + s : ''}`
  }

  return (
    <>
      <div className="search-results-header">
        <h1 style={{ fontSize: '22px', fontWeight: 600, margin: '0 0 16px' }}>Stories</h1>
        <form className="search-form" action="/stories" method="GET">
          <label htmlFor="st-q" className="sr-only">Search stories</label>
          <input id="st-q" className="search-input" type="text" name="q" defaultValue={q} placeholder="Search stories..." />
          <button className="search-button" type="submit">Search</button>
        </form>
        <p className="results-count" aria-live="polite">{total.toLocaleString()} stories</p>
      </div>
      <div className="search-layout" style={{ gridTemplateColumns: '1fr' }}>
        <div className="results">
          {rows.map((s: any) => (
            <article key={s.id} className="result-card">
              <h3><Link href={`/stories/${s.id}`}>{s.title}</Link></h3>
              <p style={{ fontSize: '13px', color: 'var(--fg-2)' }}>
                {[s.author, s.date].filter(Boolean).join(' · ')}
              </p>
              {s.summary && <p style={{ fontSize: '14px' }}>{s.summary.slice(0, 200)}…</p>}
            </article>
          ))}
          {rows.length === 0 && <p style={{ color: 'var(--fg-2)' }}>No stories yet — configure newsSources in config/institution.ts and run scrape-news.ts.</p>}
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            {page > 1 && <Link href={url({ page: String(page - 1) })}>← Previous</Link>}
            {page * PAGE_SIZE < total && <Link href={url({ page: String(page + 1) })}>Next →</Link>}
          </div>
        </div>
      </div>
    </>
  )
}
