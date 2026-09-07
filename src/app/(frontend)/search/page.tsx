import Link from 'next/link'
import { getDb } from '../lib/db'
import { getBadgeClass } from '../lib/badges'
import { institution } from '../../../../config/institution'

export const dynamic = 'force-dynamic'
const PAGE_SIZE = 25

const TYPES: Record<string, { table: string; label: string }> = {
  publications: { table: 'publications', label: 'Publications' },
  datasets: { table: 'datasets', label: 'Datasets' },
  documents: { table: 'documents', label: 'Documents' },
  stories: { table: 'stories', label: 'Stories' },
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams
  const q = (params.q ?? '').slice(0, 200)
  const typeFilter = params.type && TYPES[params.type] ? params.type : null
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)
  const db = getDb()

  const enabledTypes = Object.keys(TYPES).filter(
    (t) => (t !== 'documents' || institution.collections.documents) && (t !== 'stories' || institution.collections.stories),
  )
  const targets = typeFilter ? [typeFilter] : enabledTypes

  // Per-collection ranked tsvector search, merged in JS (small page sizes make
  // this simpler and fast enough; a UNION query is the optimization path)
  const results: any[] = []
  let total = 0
  for (const t of targets) {
    const { table } = TYPES[t]
    const dateCol = table === 'publications' ? 'year::text' : table === 'datasets' ? 'publication_year::text' : `to_char(date, 'YYYY')`
    const where = q ? `search_vector @@ websearch_to_tsquery('english', $1)` : 'TRUE'
    const rank = q ? `ts_rank(search_vector, websearch_to_tsquery('english', $1))` : '0'
    const args = q ? [q] : []
    const { rows } = await db.query(
      `SELECT id, title, ${dateCol} AS year, '${t}' AS collection, ${rank} AS rank
       FROM ${table} WHERE ${where}
       ORDER BY rank DESC, id DESC LIMIT ${PAGE_SIZE * 3}`,
      args,
    )
    const { rows: [c] } = await db.query(`SELECT count(*)::int AS n FROM ${table} WHERE ${where}`, args)
    total += c.n
    results.push(...rows)
  }
  results.sort((a, b) => b.rank - a.rank || b.id - a.id)
  const pageRows = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const url = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    const merged = { q, type: typeFilter ?? undefined, page: undefined as string | undefined, ...over }
    if (merged.q) p.set('q', merged.q)
    if (merged.type) p.set('type', merged.type)
    if (merged.page && merged.page !== '1') p.set('page', merged.page)
    const s = p.toString()
    return `/search${s ? '?' + s : ''}`
  }

  const detailPath = (r: any) =>
    `/${r.collection === 'stories' ? 'stories' : r.collection}/${r.id}`

  return (
    <>
      <div className="search-results-header">
        <h1 style={{ fontSize: '22px', fontWeight: 600, margin: '0 0 16px' }}>Search</h1>
        <form className="search-form" action="/search" method="GET">
          <label htmlFor="q" className="sr-only">Search</label>
          <input id="q" className="search-input" type="text" name="q" defaultValue={q} placeholder="Search everything…" />
          {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
          <button className="search-button" type="submit">Search</button>
        </form>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          <Link className={`type-chip ${!typeFilter ? 'active' : ''}`} href={url({ type: undefined })}>All</Link>
          {enabledTypes.map((t) => (
            <Link key={t} className={`type-chip ${typeFilter === t ? 'active' : ''}`} href={url({ type: t })}>
              {TYPES[t].label}
            </Link>
          ))}
        </div>
        <p className="results-count" aria-live="polite">
          {total.toLocaleString()} results{q ? ` for “${q}”` : ''}
        </p>
      </div>

      <div className="search-layout" style={{ gridTemplateColumns: '1fr' }}>
        <div className="results">
          {pageRows.map((r) => (
            <article key={`${r.collection}-${r.id}`} className="result-card">
              <span className={`${getBadgeClass(r.collection.replace(/s$/, '') as any)}`}>{TYPES[r.collection].label.replace(/s$/, '')}</span>
              <h3><Link href={detailPath(r)}>{r.title}</Link></h3>
              {r.year && <p style={{ fontSize: '13px', color: 'var(--fg-2)' }}>{r.year}</p>}
            </article>
          ))}
          {pageRows.length === 0 && <p style={{ color: 'var(--fg-2)' }}>No results{q ? ` for “${q}”` : ''}.</p>}
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            {page > 1 && <Link href={url({ page: String(page - 1) })}>← Previous</Link>}
            {page * PAGE_SIZE < results.length && <Link href={url({ page: String(page + 1) })}>Next →</Link>}
          </div>
        </div>
      </div>
    </>
  )
}
