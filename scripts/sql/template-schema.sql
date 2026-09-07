-- ============================================================================
-- Research Commons — custom schema on top of Payload's tables
-- ============================================================================
-- Run AFTER Payload has created its tables (npm run setup handles ordering).
-- Everything here is the "outside Payload" layer: full-text search vectors,
-- vector embeddings, citation counts, LLM-extracted dataset fields, and the
-- duplicate-tombstones table. Payload runs with push:false so these survive.
-- All statements are idempotent — safe to re-run.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ----------------------------------------------------------------------------
-- Full-text search: weighted tsvector per searchable collection
-- (title = A, abstract/summary = B, full text = C)
-- ----------------------------------------------------------------------------
ALTER TABLE publications ADD COLUMN IF NOT EXISTS full_text text;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE datasets     ADD COLUMN IF NOT EXISTS full_text text;
ALTER TABLE datasets     ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE documents    ADD COLUMN IF NOT EXISTS full_text text;
ALTER TABLE documents    ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE stories      ADD COLUMN IF NOT EXISTS full_text text;
ALTER TABLE stories      ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION publications_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.abstract, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.full_text, '')), 'C');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generic_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.full_text, '')), 'C');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS publications_search_trigger ON publications;
CREATE TRIGGER publications_search_trigger
  BEFORE INSERT OR UPDATE OF title, abstract, full_text ON publications
  FOR EACH ROW EXECUTE FUNCTION publications_search_update();

DROP TRIGGER IF EXISTS datasets_search_trigger ON datasets;
CREATE TRIGGER datasets_search_trigger
  BEFORE INSERT OR UPDATE OF title, full_text ON datasets
  FOR EACH ROW EXECUTE FUNCTION generic_search_update();

DROP TRIGGER IF EXISTS documents_search_trigger ON documents;
CREATE TRIGGER documents_search_trigger
  BEFORE INSERT OR UPDATE OF title, full_text ON documents
  FOR EACH ROW EXECUTE FUNCTION generic_search_update();

DROP TRIGGER IF EXISTS stories_search_trigger ON stories;
CREATE TRIGGER stories_search_trigger
  BEFORE INSERT OR UPDATE OF title, full_text ON stories
  FOR EACH ROW EXECUTE FUNCTION generic_search_update();

CREATE INDEX IF NOT EXISTS publications_search_idx ON publications USING gin(search_vector);
CREATE INDEX IF NOT EXISTS datasets_search_idx     ON datasets     USING gin(search_vector);
CREATE INDEX IF NOT EXISTS documents_search_idx    ON documents    USING gin(search_vector);
CREATE INDEX IF NOT EXISTS stories_search_idx      ON stories      USING gin(search_vector);

-- ----------------------------------------------------------------------------
-- Semantic search: Voyage AI embeddings (1024-dim; generate-embeddings.ts)
-- ----------------------------------------------------------------------------
ALTER TABLE publications ADD COLUMN IF NOT EXISTS embedding vector(1024);
ALTER TABLE datasets     ADD COLUMN IF NOT EXISTS embedding vector(1024);
ALTER TABLE documents    ADD COLUMN IF NOT EXISTS embedding vector(1024);
ALTER TABLE stories      ADD COLUMN IF NOT EXISTS embedding vector(1024);

-- ----------------------------------------------------------------------------
-- External citation counts (fetch-citation-counts.ts: OpenAlex + DataCite)
-- ----------------------------------------------------------------------------
ALTER TABLE publications ADD COLUMN IF NOT EXISTS external_citation_count int;
ALTER TABLE publications ADD COLUMN IF NOT EXISTS citation_count_updated_at timestamptz;
ALTER TABLE datasets     ADD COLUMN IF NOT EXISTS external_citation_count int;
ALTER TABLE datasets     ADD COLUMN IF NOT EXISTS citation_count_updated_at timestamptz;

-- ----------------------------------------------------------------------------
-- LLM-extracted dataset discovery fields (extract-dataset-variables.ts)
-- text[] columns live outside Payload (no array-of-scalars field type)
-- ----------------------------------------------------------------------------
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS variables text[];
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS variable_units text[];
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS gcmd_variables text[];
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS keywords text[];
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS temporal_resolution text;
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS data_ongoing boolean;
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS cited_references jsonb;
CREATE INDEX IF NOT EXISTS datasets_variables_idx ON datasets USING gin(variables);
CREATE INDEX IF NOT EXISTS datasets_keywords_idx  ON datasets USING gin(keywords);

-- ----------------------------------------------------------------------------
-- Duplicate tombstones: admin deletes stay deleted across pipeline re-runs
-- (beforeDelete hook snapshots identifying keys; loaders skip matches)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS duplicate_tombstones (
  id serial PRIMARY KEY,
  collection text NOT NULL,
  keys jsonb NOT NULL,
  deleted_by text,
  deleted_at timestamptz DEFAULT now(),
  notes text
);
