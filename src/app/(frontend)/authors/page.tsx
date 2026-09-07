import Link from 'next/link'
import { getDb } from '../lib/db'

export const dynamic = 'force-dynamic'
const PAGE_SIZE = 60

export default async function AuthorsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams
  const db = getDb()
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)
  const q = (params.q ?? '').slice(0, 100)

  const where = q ? `display_name ILIKE $1` : 'TRUE'
  const args = q ? [`%${q}%`] : []
  const [{ rows }, { rows: [{ n: total }] }] = await Promise.all([
    db.query(
      `SELECT id, display_name, work_count, orcid FROM authors WHERE ${where}
       ORDER BY work_count DESC NULLS LAST, display_name
       LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`, args),
    db.query(`SELECT count(*)::int AS n FROM authors WHERE ${where}`, args),
  ])

  return (
    <>
      <div className="search-results-header">
        <h1 style={{ fontSize: '22px', fontWeight: 600, margin: '0 0 16px' }}>Authors</h1>
        <form className="search-form" action="/authors" method="GET">
          <label htmlFor="au-q" className="sr-only">Search authors</label>
          <input id="au-q" className="search-input" type="text" name="q" defaultValue={q} placeholder="Search authors..." />
          <button className="search-button" type="submit">Search</button>
        </form>
        <p className="results-count">{total.toLocaleString()} authors</p>
      </div>
      <div className="search-layout" style={{ gridTemplateColumns: '1fr' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
          {rows.map((a: any) => (
            <Link key={a.id} href={`/authors/${a.id}`} style={{ textDecoration: 'none', background: 'var(--color-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 14px' }}>
              <div style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{a.display_name}</div>
              <div style={{ fontSize: '12px', color: 'var(--fg-2)' }}>{a.work_count ?? 0} works{a.orcid ? ' · ORCID' : ''}</div>
            </Link>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          {page > 1 && <Link href={`/authors?${new URLSearchParams({ ...(q && { q }), page: String(page - 1) })}`}>← Previous</Link>}
          {page * PAGE_SIZE < total && <Link href={`/authors?${new URLSearchParams({ ...(q && { q }), page: String(page + 1) })}`}>Next →</Link>}
        </div>
      </div>
    </>
  )
}
