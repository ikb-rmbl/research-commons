import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDb } from '../../lib/db'
import { isHttpUrl } from '../../lib/url-validation'

export const dynamic = 'force-dynamic'

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = parseInt(id)
  if (!Number.isFinite(numId)) notFound()
  const db = getDb()
  const { rows: [d] } = await db.query(`SELECT * FROM documents WHERE id = $1`, [numId])
  if (!d) notFound()
  return (
    <div className="detail" style={{ maxWidth: '720px' }}>
      <p style={{ fontSize: '13px' }}><Link href="/search?type=documents">← Documents</Link></p>
      <h1>{d.title}</h1>
      {d.summary && <p>{typeof d.summary === 'string' ? d.summary : ''}</p>}
      <div className="detail-section" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {d.source_url && isHttpUrl(d.source_url) && <a href={d.source_url} target="_blank" rel="noopener noreferrer">Source ↗</a>}
        {d.pdf_link && isHttpUrl(d.pdf_link) && <a href={d.pdf_link} target="_blank" rel="noopener noreferrer">PDF ↗</a>}
      </div>
    </div>
  )
}
