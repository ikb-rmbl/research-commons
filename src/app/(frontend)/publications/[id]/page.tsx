import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDb } from '../../lib/db'
import { isHttpUrl } from '../../lib/url-validation'

export const dynamic = 'force-dynamic'

export default async function PublicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = parseInt(id)
  if (!Number.isFinite(numId)) notFound()
  const db = getDb()

  const { rows: [pub] } = await db.query(`SELECT * FROM publications WHERE id = $1`, [numId])
  if (!pub) notFound()
  const { rows: authors } = await db.query(
    `SELECT family, given, _order FROM publications_authors WHERE _parent_id = $1 ORDER BY _order`, [numId])
  const { rows: linkedAuthors } = await db.query(
    `SELECT a.id, a.display_name FROM authors_rels ar JOIN authors a ON a.id = ar.parent_id
     WHERE ar.publications_id = $1`, [numId])
  const linkedByName = new Map(linkedAuthors.map((a: any) => [a.display_name?.toLowerCase(), a.id]))

  const doiUrl = pub.doi ? `https://doi.org/${pub.doi.replace(/^https?:\/\/doi\.org\//, '')}` : null

  return (
    <div className="detail" style={{ maxWidth: '760px' }}>
      <p style={{ fontSize: '13px' }}><Link href="/search?type=publications">← Publications</Link></p>
      <h1>{pub.title}</h1>
      <p style={{ color: 'var(--fg-2)' }}>
        {authors.map((a: any, idx: number) => {
          const name = `${a.given ?? ''} ${a.family}`.trim()
          const linkId = linkedByName.get(name.toLowerCase())
          return (
            <span key={idx}>
              {linkId ? <Link href={`/authors/${linkId}`}>{name}</Link> : name}
              {idx < authors.length - 1 ? ', ' : ''}
            </span>
          )
        })}
      </p>
      <p style={{ fontSize: '14px', color: 'var(--fg-2)' }}>
        {[pub.journal, pub.year, pub.volume && `vol. ${pub.volume}`, pub.pages].filter(Boolean).join(' · ')}
      </p>
      {pub.abstract && (
        <div className="detail-section">
          <h2>Abstract</h2>
          <p>{pub.abstract}</p>
        </div>
      )}
      <div className="detail-section" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {doiUrl && <a href={doiUrl} target="_blank" rel="noopener noreferrer">DOI ↗</a>}
        {pub.pdf_link && isHttpUrl(pub.pdf_link) && <a href={pub.pdf_link} target="_blank" rel="noopener noreferrer">PDF ↗</a>}
        {pub.external_url && isHttpUrl(pub.external_url) && <a href={pub.external_url} target="_blank" rel="noopener noreferrer">Source ↗</a>}
      </div>
      {pub.external_citation_count > 0 && (
        <p style={{ fontSize: '13px', color: 'var(--fg-2)' }}>Cited by {pub.external_citation_count} works (OpenAlex)</p>
      )}
    </div>
  )
}
