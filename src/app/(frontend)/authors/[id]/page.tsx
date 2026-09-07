import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDb } from '../../lib/db'

export const dynamic = 'force-dynamic'

export default async function AuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = parseInt(id)
  if (!Number.isFinite(numId)) notFound()
  const db = getDb()
  const { rows: [a] } = await db.query(`SELECT * FROM authors WHERE id = $1`, [numId])
  if (!a) notFound()
  const { rows: pubs } = await db.query(
    `SELECT p.id, p.title, p.year FROM authors_rels ar JOIN publications p ON p.id = ar.publications_id
     WHERE ar.parent_id = $1 ORDER BY p.year DESC NULLS LAST`, [numId])
  const { rows: datasets } = await db.query(
    `SELECT d.id, d.title, d.publication_year AS year FROM authors_rels ar JOIN datasets d ON d.id = ar.datasets_id
     WHERE ar.parent_id = $1 ORDER BY d.publication_year DESC NULLS LAST`, [numId])
  return (
    <div className="detail" style={{ maxWidth: '760px' }}>
      <p style={{ fontSize: '13px' }}><Link href="/authors">← Authors</Link></p>
      <h1>{a.display_name}</h1>
      <p style={{ color: 'var(--fg-2)', fontSize: '14px' }}>
        {[a.affiliation, a.orcid && `ORCID ${a.orcid}`].filter(Boolean).join(' · ')}
      </p>
      {pubs.length > 0 && (
        <div className="detail-section">
          <h2>Publications ({pubs.length})</h2>
          <ul>{pubs.map((p: any) => <li key={p.id}><Link href={`/publications/${p.id}`}>{p.title}</Link>{p.year ? ` (${p.year})` : ''}</li>)}</ul>
        </div>
      )}
      {datasets.length > 0 && (
        <div className="detail-section">
          <h2>Datasets ({datasets.length})</h2>
          <ul>{datasets.map((d: any) => <li key={d.id}><Link href={`/datasets/${d.id}`}>{d.title}</Link>{d.year ? ` (${d.year})` : ''}</li>)}</ul>
        </div>
      )}
    </div>
  )
}
