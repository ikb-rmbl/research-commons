/**
 * INSTITUTION CONFIG — the single file that makes this portal yours.
 *
 * Every institution-specific value in the codebase reads from here: site
 * branding, discovery queries, news sources, geography, LLM prompt context.
 * Fill this out (see docs/INSTITUTION_PROFILE.md for a worksheet), restart,
 * and the portal is running for YOUR institution.
 *
 * The values below are filled in for Mountain Lake Biological Station as a
 * worked example — replace them with your own.
 */

export interface NewsSource {
  /** Display name, e.g. "The Roanoke Times" */
  name: string
  /** Search-results URL template; {query} is replaced with the encoded search term */
  searchUrl: string
  /** Terms to search this outlet for (defaults to institution names if empty) */
  queries?: string[]
}

export interface InstitutionConfig {
  /** Full institution name as it appears in publications' affiliation fields */
  name: string
  /** Short name for the site header and UI copy */
  shortName: string
  /** Portal title (browser tab, header) */
  siteTitle: string
  /** One-sentence description for the home page and meta tags */
  tagline: string
  /** Contact email — also used as the polite-pool identifier for API requests */
  contactEmail: string
  /** Public URL where this portal will live (used in metadata; fine to set later) */
  siteUrl: string

  /**
   * Affiliation strings for automated discovery. OpenAlex, CrossRef, and
   * DataCite are queried with each of these. Include historical names,
   * common abbreviations, and any parent-institution qualifier that
   * disambiguates you (e.g. "Mountain Lake Biological Station" alone is
   * unambiguous; a "Field Station" might need "X University Field Station").
   */
  affiliations: string[]

  /**
   * Free-text search terms for discovery in sources without affiliation
   * indexing (dataset repositories, news). Usually the same as affiliations
   * plus signature place names.
   */
  searchTerms: string[]

  /**
   * ROR ID (https://ror.org) if your institution has one — makes OpenAlex
   * discovery far more precise than string matching. Find yours at ror.org.
   * Leave null to fall back to affiliation-string search.
   */
  rorId: string | null

  /** Home geography — used for relevance context in LLM prompts and docs */
  region: {
    /** Human-readable, e.g. "Salt Pond Mountain, Giles County, Virginia" */
    description: string
    /** Signature place names that indicate local relevance in text */
    placeNames: string[]
    /** Rough bounding box [west, south, east, north] in WGS84, or null */
    bbox: [number, number, number, number] | null
  }

  /**
   * News outlets to scrape for stories about your institution.
   * The generic scraper fetches each outlet's search results for your
   * queries, follows article links, and extracts the main text.
   */
  newsSources: NewsSource[]

  /**
   * Context paragraph injected into LLM prompts (entity extraction,
   * relevance scoring). Describe what research at your institution looks
   * like — the model uses this to judge relevance and extract entities.
   */
  researchContext: string

  /** Brand palette — CSS custom properties on the public site */
  brand: {
    /** Primary accent (links, buttons) */
    accent: string
    /** Light-mode page background */
    background: string
    /** Header background */
    headerBackground: string
    /** Path under /public for the logo, or null for text-only header */
    logo: string | null
  }

  /** Which optional collections to enable */
  collections: {
    documents: boolean
    stories: boolean
  }
}

export const institution: InstitutionConfig = {
  name: 'Mountain Lake Biological Station',
  shortName: 'MLBS',
  siteTitle: 'MLBS Research Commons',
  tagline:
    'Publications, datasets, and news from research at Mountain Lake Biological Station and the surrounding southern Appalachians.',
  contactEmail: 'admin@example.org',
  siteUrl: 'https://example.org',

  affiliations: ['Mountain Lake Biological Station'],
  searchTerms: ['Mountain Lake Biological Station', '"Mountain Lake" Virginia biology'],
  rorId: null, // MLBS publishes under University of Virginia (https://ror.org/0153tk833) — string search is more precise here

  region: {
    description: 'Salt Pond Mountain, Giles County, southwestern Virginia (southern Appalachians)',
    placeNames: ['Mountain Lake', 'Salt Pond Mountain', 'Giles County', 'Pembroke'],
    bbox: [-80.62, 37.31, -80.46, 37.42],
  },

  newsSources: [
    // { name: 'The Roanoke Times', searchUrl: 'https://roanoke.com/search/?q={query}' },
  ],

  researchContext:
    'Mountain Lake Biological Station (University of Virginia) hosts field research in evolution, ecology, behavior, and physiology in the southern Appalachians — long-term studies of salamanders, birds, plants, and insects, plus courses and REU programs.',

  brand: {
    accent: '#2c5f7c',
    background: '#faf9f6',
    headerBackground: '#1d3d50',
    logo: null,
  },

  collections: {
    documents: true,
    stories: true,
  },
}
