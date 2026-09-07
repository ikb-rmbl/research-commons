import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDb } from '../../lib/db'
import { isHttpUrl } from '../../lib/url-validation'

export const dynamic = 'force-dynamic'

export default async function DatasetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = parseInt(id)
  if (!Number.isFinite(numId)) notFound()
  const db = getDb()

  const { rows: [ds] } = await db.query(
    `SELECT *, extract(year FROM temporal_extent_start)::int AS y0,
            extract(year FROM temporal_extent_end)::int AS y1
     FROM datasets WHERE id = $1`, [numId])
  if (!ds) notFound()
  const { rows: creators } = await db.query(
    `SELECT name FROM datasets_creators WHERE _parent_id = $1 ORDER BY _order`, [numId]).catch(() => ({ rows: [] as any[] }))
  const { rows: relPubs } = await db.query(
    `SELECT p.id, p.title FROM datasets_rels dr JOIN publications p ON p.id = dr.publications_id
     WHERE dr.parent_id = $1`, [numId]).catch(() => ({ rows: [] as any[] }))

  const doiUrl = ds.doi ? `https://doi.org/${ds.doi.replace(/^https?:\/\/doi\.org\//, '')}` : null
  const vars: string[] = ds.variables ?? []
  const units: string[] = ds.variable_units ?? []

  return (
    <div className="detail" style={{ maxWidth: '760px' }}>
      <p style={{ fontSize: '13px' }}><Link href="/datasets">← Datasets</Link></p>
      <h1>{ds.title}</h1>
      {creators.length > 0 && (
        <p style={{ color: 'var(--fg-2)' }}>{creators.map((c: any) => c.name).join(', ')}</p>
      )}
      <p style={{ fontSize: '14px', color: 'var(--fg-2)' }}>
        {[
          ds.repository,
          ds.publication_year && `published ${ds.publication_year}`,
          ds.y0 && ds.y1 && `data ${ds.y0}–${ds.y1}`,
          ds.temporal_resolution && `${ds.temporal_resolution} sampling`,
          ds.data_ongoing && 'ongoing collection',
          ds.license,
        ].filter(Boolean).join(' · ')}
      </p>
      {ds.description && (
        <div className="detail-section">
          <h2>Description</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{ds.description.slice(0, 4000)}</p>
        </div>
      )}
      {vars.length > 0 && (
        <div className="detail-section">
          <h2>Measured variables</h2>
          <ul>
            {vars.map((v, idx) => (
              <li key={v}>{v}{units[idx] ? ` (${units[idx]})` : ''}</li>
            ))}
          </ul>
        </div>
      )}
      {relPubs.length > 0 && (
        <div className="detail-section">
          <h2>Companion publications</h2>
          <ul>
            {relPubs.map((p: any) => <li key={p.id}><Link href={`/publications/${p.id}`}>{p.title}</Link></li>)}
          </ul>
        </div>
      )}
      <div className="detail-section" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {doiUrl && <a href={doiUrl} target="_blank" rel="noopener noreferrer">DOI ↗</a>}
        {ds.download_url && isHttpUrl(ds.download_url) && <a href={ds.download_url} target="_blank" rel="noopener noreferrer">Download ↗</a>}
        {ds.external_catalog_url && isHttpUrl(ds.external_catalog_url) && <a href={ds.external_catalog_url} target="_blank" rel="noopener noreferrer">Repository record ↗</a>}
      </div>
    </div>
  )
}
