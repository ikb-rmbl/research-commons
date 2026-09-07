import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDb } from '../../lib/db'
import { isHttpUrl } from '../../lib/url-validation'

export const dynamic = 'force-dynamic'

/**
 * Story detail. NOTE: full text is indexed for search but NOT displayed —
 * news articles are copyrighted. Show the excerpt and link to the source.
 */
export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = parseInt(id)
  if (!Number.isFinite(numId)) notFound()
  const db = getDb()
  const { rows: [s] } = await db.query(
    `SELECT id, title, author, to_char(date, 'YYYY-MM-DD') AS date, source_url, summary, story_type
     FROM stories WHERE id = $1`, [numId])
  if (!s) notFound()
  return (
    <div className="detail" style={{ maxWidth: '720px' }}>
      <p style={{ fontSize: '13px' }}><Link href="/stories">← Stories</Link></p>
      <h1>{s.title}</h1>
      <p style={{ color: 'var(--fg-2)', fontSize: '14px' }}>{[s.author, s.date].filter(Boolean).join(' · ')}</p>
      {s.summary && <p>{s.summary}…</p>}
      {s.source_url && isHttpUrl(s.source_url) && (
        <p><a href={s.source_url} target="_blank" rel="noopener noreferrer">Read the full article at the source ↗</a></p>
      )}
    </div>
  )
}
