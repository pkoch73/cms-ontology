-- core-schema.sql
-- Phase 1: Foundation schema for content ontology
-- Database: Cloudflare D1 (content-ontology)
-- ID: e6c6614f-030b-4451-8a70-45de3481bde2

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Main pages table - stores all crawled content
CREATE TABLE IF NOT EXISTS pages (
  path TEXT PRIMARY KEY,
  title TEXT,
  content_type TEXT,                    -- article, product, service, landing, support, other
  primary_topic TEXT,
  funnel_stage TEXT,                    -- awareness, consideration, decision
  word_count INTEGER,
  summary TEXT,
  raw_html TEXT,                        -- Original HTML from DA
  edit_url TEXT,                        -- DA edit URL
  preview_url TEXT,                     -- AEM preview URL
  live_url TEXT,                        -- AEM live URL
  last_crawled DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Topics (many-to-many with pages)
CREATE TABLE IF NOT EXISTS page_topics (
  page_path TEXT REFERENCES pages(path) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (page_path, topic)
);

-- Entities (products, features, concepts mentioned)
CREATE TABLE IF NOT EXISTS entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  type TEXT,                            -- product, feature, concept, brand, person, location
  description TEXT
);

-- Page-Entity relationships
CREATE TABLE IF NOT EXISTS page_entities (
  page_path TEXT REFERENCES pages(path) ON DELETE CASCADE,
  entity_id INTEGER REFERENCES entities(id) ON DELETE CASCADE,
  mention_count INTEGER DEFAULT 1,
  PRIMARY KEY (page_path, entity_id)
);

-- Audience segments
CREATE TABLE IF NOT EXISTS page_audiences (
  page_path TEXT REFERENCES pages(path) ON DELETE CASCADE,
  audience TEXT NOT NULL,
  PRIMARY KEY (page_path, audience)
);

-- Blocks used on pages (DA blocks)
CREATE TABLE IF NOT EXISTS page_blocks (
  page_path TEXT REFERENCES pages(path) ON DELETE CASCADE,
  block_name TEXT NOT NULL,
  PRIMARY KEY (page_path, block_name)
);

-- Internal link graph
CREATE TABLE IF NOT EXISTS page_links (
  source_path TEXT REFERENCES pages(path) ON DELETE CASCADE,
  target_path TEXT NOT NULL,
  PRIMARY KEY (source_path, target_path)
);

-- Key messages per page
CREATE TABLE IF NOT EXISTS page_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_path TEXT REFERENCES pages(path) ON DELETE CASCADE,
  message TEXT NOT NULL
);

-- Crawl log for tracking crawl operations
CREATE TABLE IF NOT EXISTS crawl_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  pages_crawled INTEGER DEFAULT 0,
  errors TEXT,                          -- JSON array of error messages
  status TEXT DEFAULT 'running'         -- running, completed, failed
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pages_topic ON pages(primary_topic);
CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(content_type);
CREATE INDEX IF NOT EXISTS idx_pages_funnel ON pages(funnel_stage);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_page_topics_topic ON page_topics(topic);
CREATE INDEX IF NOT EXISTS idx_page_audiences_audience ON page_audiences(audience);
