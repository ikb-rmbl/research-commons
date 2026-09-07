import React from 'react'
import Link from 'next/link'
import ThemeToggle from './components/ThemeToggle'
import { institution } from '../../../config/institution'
import './styles.css'

export const metadata = {
  title: institution.siteTitle,
  description: institution.tagline,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { brand, collections } = institution
  return (
    <html lang="en" data-theme="light">
      <head>
        {/* Institution brand palette overrides the neutral defaults in styles.css */}
        <style>{`:root {
          --accent: ${brand.accent};
          --accent-hover: ${brand.accent};
          --brand-cream: ${brand.background};
          --color-header-bg: ${brand.headerBackground};
        }`}</style>
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <header className="site-header">
          <div className="site-header-inner">
            {institution.brand.logo ? (
              <img src={institution.brand.logo} alt={institution.shortName} style={{ height: '32px' }} />
            ) : (
              <span className="brand-mark">{institution.shortName}</span>
            )}
            <Link href="/" className="topbar-current">{institution.siteTitle}</Link>
            <nav className="site-nav">
              <Link href="/search">Search</Link>
              <Link href="/search?type=publications">Publications</Link>
              <Link href="/datasets">Datasets</Link>
              {collections.documents && <Link href="/search?type=documents">Documents</Link>}
              {collections.stories && <Link href="/stories">Stories</Link>}
              <Link href="/authors">Authors</Link>
              <Link href="/about">About</Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main id="main-content">{children}</main>
        <footer className="site-footer">
          <div className="site-footer-inner">
            <p>
              {institution.siteTitle} — {institution.name}.{' '}
              <a href={`mailto:${institution.contactEmail}`}>{institution.contactEmail}</a>
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Built with <a href="https://github.com/ikb-rmbl/research-commons">Research Commons</a>,
              a template from the <a href="https://rmblknowledgecommons.org">RMBL Knowledge Commons</a>.
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
