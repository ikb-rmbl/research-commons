import Link from 'next/link'
import { getDb } from '../lib/db'

export const dynamic = 'force-dynamic'
const PAGE_SIZE = 25

/**
 * Datasets browse — the data-specific discovery tools that proved most useful
 * on the RMBL Knowledge Commons: long-term-record chip, data-coverage year
 * filtering (collection years, not publication dates), and — once the LLM
 * enrichment tier has run — measured-variable and keyword facets.
 */
export default async function DatasetsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams
  const db = getDb()
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)

  const clauses: string[] = ['TRUE']
  const args: any[] = []
  let i = 1
  const push = (sql: string, val?: any) => {
    clauses.push(sql)
    if (val !== undefined) { args.push(val); i++ }
  }
  if (params.q) push(`search_vector @@ websearch_to_tsquery('english', $${i})`, params.q.slice(0, 200))
  if (params.longterm === '1')
    clauses.push(`temporal_extent_end - temporal_extent_start >= interval '10 years'`)
  if (params.variable) push(`variables @> ARRAY[$${i}]::text[]`, params.variable)
  if (params.keyword) push(`keywords @> ARRAY[$${i}]::text[]`, params.keyword)
  if (params.repo) push(`repository = $${i}`, params.repo)
  if (params.from) push(`temporal_extent_end >= make_timestamptz($${i}::int, 1, 1, 0, 0, 0)`, parseInt(params.from))
  if (params.to) push(`temporal_extent_start <= make_timestamptz($${i}::int, 12, 31, 0, 0, 0)`, parseInt(params.to))
  const where = clauses.join(' AND ')

  const [{ rows }, { rows: [{ n: total }] }, { rows: repoFacet }, { rows: variableFacet }, { rows: keywordFacet }] =
    await Promise.all([
      db.query(
        `SELECT id, title, publication_year, repository, doi,
                extract(year FROM temporal_extent_start)::int AS y0,
                extract(year FROM temporal_extent_end)::int AS y1
         FROM datasets WHERE ${where}
         ORDER BY publication_year DESC NULLS LAST, id DESC
         LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`, args),
      db.query(`SELECT count(*)::int AS n FROM datasets WHERE ${where}`, args),
      db.query(`SELECT repository AS v, count(*)::int AS n FROM datasets WHERE repository IS NOT NULL GROUP BY 1 ORDER BY n DESC LIMIT 8`),
      db.query(`SELECT v, count(*)::int AS n FROM (SELECT unnest(variables) AS v FROM datasets) u GROUP BY 1 ORDER BY n DESC LIMIT 12`),
      db.query(`SELECT v, count(*)::int AS n FROM (SELECT unnest(keywords) AS v FROM datasets) u GROUP BY 1 ORDER BY n DESC LIMIT 12`),
    ])

  const url = (over: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = { ...params, page: undefined, ...over }
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v)
    const s = p.toString()
    return `/datasets${s ? '?' + s : ''}`
  }
  const facetLink = (active: boolean) => ({ fontWeight: active ? 700 : 400, color: active ? 'var(--accent)' : 'inherit' })

  return (
    <>
      <div className="search-results-header">
        <h1 style={{ fontSize: '22px', fontWeight: 600, margin: '0 0 16px' }}>Datasets</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '16px' }}>
          Coverage filters use <strong>data years</strong> (when measurements were made), not publication dates.
        </p>
        <form className="search-form" action="/datasets" method="GET">
          <label htmlFor="ds-q" className="sr-only">Search datasets</label>
          <input id="ds-q" className="search-input" type="text" name="q" defaultValue={params.q || ''} placeholder="Search datasets..." />
          <button className="search-button" type="submit">Search</button>
        </form>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          <Link href={url({ longterm: params.longterm === '1' ? undefined : '1' })}
                className={`type-chip ${params.longterm === '1' ? 'active' : ''}`}>
            Long-term records (10+ yrs)
          </Link>
        </div>
        <p className="results-count" aria-live="polite">{total.toLocaleString()} datasets</p>
      </div>

      <div className="search-layout">
        <aside className="filters">
          <div className="filter-group">
            <h2 className="filter-label">Data coverage</h2>
            <form action="/datasets" method="GET" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {params.q && <input type="hidden" name="q" value={params.q} />}
              <input type="number" name="from" placeholder="From" defaultValue={params.from || ''} aria-label="From year" style={{ width: '70px', padding: '4px 6px', fontSize: '13px' }} />
              <span aria-hidden="true">–</span>
              <input type="number" name="to" placeholder="To" defaultValue={params.to || ''} aria-label="To year" style={{ width: '70px', padding: '4px 6px', fontSize: '13px' }} />
              <button type="submit" style={{ padding: '4px 10px', fontSize: '12px' }}>Go</button>
            </form>
          </div>
          {variableFacet.length > 0 && (
            <div className="filter-group">
              <h2 className="filter-label">Variables</h2>
              {variableFacet.map((r: any) => (
                <label key={r.v} style={{ display: 'block' }}>
                  <Link href={url({ variable: params.variable === r.v ? undefined : r.v })} style={facetLink(params.variable === r.v)}>{r.v} ({r.n})</Link>
                </label>
              ))}
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>LLM-extracted from metadata</div>
            </div>
          )}
          {keywordFacet.length > 0 && (
            <div className="filter-group">
              <h2 className="filter-label">Keywords</h2>
              {keywordFacet.map((r: any) => (
                <label key={r.v} style={{ display: 'block' }}>
                  <Link href={url({ keyword: params.keyword === r.v ? undefined : r.v })} style={facetLink(params.keyword === r.v)}>{r.v} ({r.n})</Link>
                </label>
              ))}
            </div>
          )}
          {repoFacet.length > 0 && (
            <div className="filter-group">
              <h2 className="filter-label">Repository</h2>
              {repoFacet.map((r: any) => (
                <label key={r.v} style={{ display: 'block' }}>
                  <Link href={url({ repo: params.repo === r.v ? undefined : r.v })} style={facetLink(params.repo === r.v)}>{r.v} ({r.n})</Link>
                </label>
              ))}
            </div>
          )}
        </aside>

        <div className="results">
          {rows.map((d: any) => (
            <article key={d.id} className="result-card">
              <h3><Link href={`/datasets/${d.id}`}>{d.title}</Link></h3>
              <p style={{ fontSize: '13px', color: 'var(--fg-2)' }}>
                {d.y0 && d.y1 ? `Data ${d.y0}–${d.y1} · ` : ''}
                {d.repository || 'dataset'}{d.publication_year ? ` · published ${d.publication_year}` : ''}
              </p>
            </article>
          ))}
          {rows.length === 0 && <p style={{ color: 'var(--fg-2)' }}>No datasets match.</p>}
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            {page > 1 && <Link href={url({ page: String(page - 1) })}>← Previous</Link>}
            {page * PAGE_SIZE < total && <Link href={url({ page: String(page + 1) })}>Next →</Link>}
          </div>
        </div>
      </div>
    </>
  )
}
