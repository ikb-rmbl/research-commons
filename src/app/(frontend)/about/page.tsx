import { institution } from '../../../../config/institution'

export default function AboutPage() {
  return (
    <div className="detail" style={{ maxWidth: '720px' }}>
      <h1>About</h1>
      <p>{institution.tagline}</p>
      <p>
        This portal aggregates research outputs — publications, datasets, documents, and news —
        from {institution.name}, discovered automatically from scholarly indexes (OpenAlex,
        CrossRef, DataCite) and curated by our staff. Questions or corrections:{' '}
        <a href={`mailto:${institution.contactEmail}`}>{institution.contactEmail}</a>.
      </p>
      <p style={{ fontSize: '14px', color: 'var(--fg-2)' }}>
        Built with <a href="https://github.com/ikb-rmbl/research-commons">Research Commons</a>, an
        open-source template for institutional research portals derived from the{' '}
        <a href="https://rmblknowledgecommons.org">RMBL Knowledge Commons</a>.
      </p>
    </div>
  )
}
