# Content Inventory Ontology for DA.live (Edge Delivery Services)

A solution for building an internal knowledge graph of your existing DA-authored content to understand your inventory and leverage it for AI-assisted content generation.

---

## The Strategic Vision

### The Problem with AI-Generated Content

**AI can generate anything. The question is whether it generates something worth your time.**

Without enterprise context, AI produces generic content that:
- Doesn't match your brand voice
- Uses wrong terminology
- Ignores existing content relationships
- Creates redundant or conflicting pages
- Misses your audience segments

### The Enterprise Content Moat

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     ENTERPRISE CONTENT LIFECYCLE                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────┐                                                           │
│  │ ENTERPRISE       │  ◄── STICKY, ADOBE OWNS                                   │
│  │ CONTEXT          │      Your ontology, brand, terminology,                   │
│  │ (This Solution)  │      content relationships, performance data              │
│  └────────┬─────────┘                                                           │
│           │                                                                     │
│           ▼                                                                     │
│  ┌──────────────────┐                                                           │
│  │ AI GENERATION    │  ◄── COMMODITY, BUT CONSTRAINED                           │
│  │ (Claude/GPT)     │      Context transforms generic AI into                   │
│  │                  │      80% first drafts, not garbage                        │
│  └────────┬─────────┘                                                           │
│           │                                                                     │
│           ▼                                                                     │
│  ┌──────────────────┐                                                           │
│  │ VISUAL           │  ◄── HUMANS IN AEM/DA                                     │
│  │ REFINEMENT       │      Collaborative editing, governance,                   │
│  │ (DA / AEM)       │      brand polish → 80% becomes 100%                      │
│  └────────┬─────────┘                                                           │
│           │                                                                     │
│           ▼                                                                     │
│  ┌──────────────────┐                                                           │
│  │ PUBLISH          │  ◄── EDGE DELIVERY SERVICES                               │
│  │ (EDS)            │      Fast, global, optimized                              │
│  └────────┬─────────┘                                                           │
│           │                                                                     │
│           ▼                                                                     │
│  ┌──────────────────┐                                                           │
│  │ MEASURE          │  ◄── FEEDS BACK TO CONTEXT                                │
│  │ (Analytics)      │      Performance data enriches ontology,                  │
│  └────────┬─────────┘      improves future generation                           │
│           │                                                                     │
│           └──────────────────────────────────────────────────────────┐          │
│                                                                      │          │
│  ┌──────────────────┐                                                │          │
│  │ ENTERPRISE       │ ◄──────────────────────────────────────────────┘          │
│  │ CONTEXT          │  Loop closes: measurement feeds context                   │
│  │ (Enriched)       │  Context improves AI generation                           │
│  └──────────────────┘  AI quality improves over time                            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### The Value Proposition

| Layer | Who Owns It | Why It Matters |
|-------|-------------|----------------|
| **Enterprise Context** | Adobe (sticky) | Unique to each customer. Years of content, relationships, performance data. Cannot be replicated. |
| **AI Generation** | Commodity | Any LLM can generate text. The differentiator is what you feed it. |
| **Visual Refinement** | AEM/DA + Humans | Where 80% becomes 100%. Collaborative, governed, brand-compliant. |
| **Publish** | EDS | Commodity infrastructure, but Adobe's is fast. |
| **Measure** | Analytics | The feedback loop that makes context smarter over time. |

**The pitch:** Enterprise Context is the difference between an 80% first draft and garbage. AEM/DA is where you and your team make it 100%—visually, collaboratively, with full governance.

---

## Overview

### The Goal

1. **Understand what you already have** - topics, entities, relationships across 100-1000 pages
2. **Identify gaps and opportunities** - missing funnel stages, underserved audiences
3. **Feed structured context to AI** - generate new content consistent with existing inventory
4. **Close the loop** - measure performance, enrich context, improve future generation

### Technical Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   DA Repository     │────▶│  Extraction Pipeline │────▶│  Ontology Store     │
│   (da.live)         │     │  (DA Admin API +     │     │  (D1 / JSON /       │
│   100-1000 pages    │     │   Claude Analysis)   │     │   Vector DB)        │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
```

---

## DA Admin API Reference

Base URL: `https://admin.da.live`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/list/{org}/{repo}/{path}` | GET | List all content in a directory |
| `/source/{org}/{repo}/{path}` | GET | Retrieve document content (HTML) |
| `/source/{org}/{repo}/{path}` | POST | Create/update content |
| `/config/{org}/{repo}/{path}` | GET | Get configuration |

All endpoints require Bearer token authentication.

**Documentation:** https://opensource.adobe.com/da-admin/

---

## Step 1: Define Your Ontology Schema

```yaml
# content-ontology.yaml

entities:
  Page:
    properties:
      - path: string
      - title: string
      - content_type: enum [article, product, service, landing, support]
      - primary_topic: Topic
      - secondary_topics: Topic[]
      - target_audience: Audience[]
      - funnel_stage: enum [awareness, consideration, decision]
      - blocks_used: Block[]
      - word_count: number
      - summary: string
      - last_modified: date

  Topic:
    properties:
      - name: string
      - parent_topic: Topic (optional)
      - related_topics: Topic[]

  Entity:
    properties:
      - name: string
      - type: enum [product, feature, concept, brand, person, location]
      - mentions: Page[]

  Audience:
    properties:
      - name: string
      - characteristics: string[]

  Block:
    properties:
      - name: string
      - description: string
      - typical_use: string
```

---

## Step 2: Crawl Your DA Repository

```javascript
// tools/crawl-da-inventory.js

const DA_ADMIN_BASE = 'https://admin.da.live';

/**
 * Recursively crawl all content from a DA repository
 */
async function crawlDARepository(org, repo, authToken) {
  const inventory = [];

  async function crawlDirectory(path = '') {
    const response = await fetch(
      `${DA_ADMIN_BASE}/list/${org}/${repo}${path}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    if (!response.ok) {
      console.error(`Failed to list ${path}: ${response.status}`);
      return;
    }

    const items = await response.json();

    for (const item of items) {
      // Skip non-content items
      if (item.path.includes('/.') || item.path.includes('/nav') || item.path.includes('/footer')) {
        continue;
      }

      if (item.ext === 'html' || !item.ext) {
        // It's a document - fetch content
        const content = await fetchDocumentContent(org, repo, item.path, authToken);

        inventory.push({
          path: item.path,
          editUrl: item.editUrl,
          contentUrl: item.contentUrl,
          previewUrl: item.aemPreview,
          liveUrl: item.aemLive,
          rawHtml: content,
          crawledAt: new Date().toISOString()
        });

        console.log(`Crawled: ${item.path}`);

        // Rate limiting - be nice to the API
        await sleep(100);

      } else if (item.isDirectory) {
        // Recurse into subdirectory
        await crawlDirectory(item.path);
      }
    }
  }

  await crawlDirectory();
  return inventory;
}

/**
 * Fetch a single document's content
 */
async function fetchDocumentContent(org, repo, path, authToken) {
  const response = await fetch(
    `${DA_ADMIN_BASE}/source/${org}/${repo}${path}`,
    {
      headers: { 'Authorization': `Bearer ${authToken}` }
    }
  );

  if (!response.ok) {
    console.error(`Failed to fetch ${path}: ${response.status}`);
    return null;
  }

  return response.text(); // Returns HTML
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Usage
const inventory = await crawlDARepository('your-org', 'your-repo', process.env.DA_AUTH_TOKEN);
console.log(`Crawled ${inventory.length} documents`);
```

---

## Step 3: Extract & Classify with AI

```javascript
// tools/analyze-content.js

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

/**
 * Analyze a document and extract structured metadata
 */
async function analyzeDocument(doc) {
  // Parse HTML to extract meaningful content
  const textContent = extractTextFromHtml(doc.rawHtml);
  const blocks = extractBlocks(doc.rawHtml);
  const links = extractInternalLinks(doc.rawHtml);

  // Use Claude to classify and extract entities
  const analysis = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Analyze this Edge Delivery Services page and extract structured metadata.

PATH: ${doc.path}

CONTENT:
${textContent.substring(0, 6000)}

BLOCKS USED:
${blocks.join(', ')}

INTERNAL LINKS:
${links.join(', ')}

Extract as JSON (no markdown, just valid JSON):
{
  "title": "page title from content",
  "content_type": "article|product|service|landing|support|other",
  "primary_topic": "main topic/theme (be specific)",
  "secondary_topics": ["topic1", "topic2"],
  "entities": [
    {"name": "entity name", "type": "product|feature|concept|brand|person"}
  ],
  "target_audience": ["audience segment 1", "audience segment 2"],
  "funnel_stage": "awareness|consideration|decision",
  "key_messages": ["core message 1", "core message 2"],
  "word_count": <number>,
  "summary": "2-3 sentence summary of the page content"
}`
    }]
  });

  try {
    const metadata = JSON.parse(analysis.content[0].text);
    return {
      ...doc,
      ...metadata,
      blocks,
      internalLinks: links
    };
  } catch (e) {
    console.error(`Failed to parse analysis for ${doc.path}:`, e);
    return {
      ...doc,
      analysisError: true,
      blocks,
      internalLinks: links
    };
  }
}

/**
 * Extract text content from HTML
 */
function extractTextFromHtml(html) {
  if (!html) return '';

  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove HTML tags but keep content
  text = text.replace(/<[^>]+>/g, ' ');

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Extract block names from DA HTML structure
 */
function extractBlocks(html) {
  if (!html) return [];

  // DA blocks are typically divs with class names
  const blockPattern = /<div class="([^"]+)"[^>]*>/g;
  const blocks = new Set();
  let match;

  while ((match = blockPattern.exec(html)) !== null) {
    // First class is usually the block name
    const blockName = match[1].split(' ')[0];
    if (blockName && !['section', 'default-content-wrapper'].includes(blockName)) {
      blocks.add(blockName);
    }
  }

  return [...blocks];
}

/**
 * Extract internal links from HTML
 */
function extractInternalLinks(html) {
  if (!html) return [];

  const linkPattern = /href="(\/[^"]+)"/g;
  const links = new Set();
  let match;

  while ((match = linkPattern.exec(html)) !== null) {
    links.add(match[1]);
  }

  return [...links];
}

/**
 * Process entire inventory
 */
async function analyzeInventory(inventory) {
  const analyzed = [];

  for (let i = 0; i < inventory.length; i++) {
    const doc = inventory[i];
    console.log(`Analyzing ${i + 1}/${inventory.length}: ${doc.path}`);

    const result = await analyzeDocument(doc);
    analyzed.push(result);

    // Rate limiting for API
    await new Promise(r => setTimeout(r, 500));
  }

  return analyzed;
}

export { analyzeDocument, analyzeInventory };
```

---

## Step 4: Store in Cloudflare D1

### Database Schema

```sql
-- schema.sql
-- Run this to create the content inventory database

-- Main pages table
CREATE TABLE IF NOT EXISTS pages (
  path TEXT PRIMARY KEY,
  title TEXT,
  content_type TEXT,
  primary_topic TEXT,
  funnel_stage TEXT,
  word_count INTEGER,
  summary TEXT,
  edit_url TEXT,
  preview_url TEXT,
  live_url TEXT,
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
  type TEXT,
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

-- Blocks used on pages
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

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pages_topic ON pages(primary_topic);
CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(content_type);
CREATE INDEX IF NOT EXISTS idx_pages_funnel ON pages(funnel_stage);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_page_topics_topic ON page_topics(topic);
CREATE INDEX IF NOT EXISTS idx_page_audiences_audience ON page_audiences(audience);
```

### Load Data into D1

```javascript
// tools/load-to-d1.js

/**
 * Load analyzed inventory into Cloudflare D1
 */
async function loadToD1(analyzedInventory, db) {
  for (const page of analyzedInventory) {
    if (page.analysisError) continue;

    // Insert page
    await db.prepare(`
      INSERT OR REPLACE INTO pages
      (path, title, content_type, primary_topic, funnel_stage, word_count, summary, edit_url, preview_url, live_url, last_crawled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      page.path,
      page.title,
      page.content_type,
      page.primary_topic,
      page.funnel_stage,
      page.word_count,
      page.summary,
      page.editUrl,
      page.previewUrl,
      page.liveUrl,
      page.crawledAt
    ).run();

    // Insert topics
    if (page.primary_topic) {
      await db.prepare(`
        INSERT OR REPLACE INTO page_topics (page_path, topic, is_primary)
        VALUES (?, ?, TRUE)
      `).bind(page.path, page.primary_topic).run();
    }

    for (const topic of (page.secondary_topics || [])) {
      await db.prepare(`
        INSERT OR REPLACE INTO page_topics (page_path, topic, is_primary)
        VALUES (?, ?, FALSE)
      `).bind(page.path, topic).run();
    }

    // Insert entities
    for (const entity of (page.entities || [])) {
      // Upsert entity
      await db.prepare(`
        INSERT OR IGNORE INTO entities (name, type) VALUES (?, ?)
      `).bind(entity.name, entity.type).run();

      const entityRow = await db.prepare(`
        SELECT id FROM entities WHERE name = ?
      `).bind(entity.name).first();

      if (entityRow) {
        await db.prepare(`
          INSERT OR REPLACE INTO page_entities (page_path, entity_id)
          VALUES (?, ?)
        `).bind(page.path, entityRow.id).run();
      }
    }

    // Insert audiences
    for (const audience of (page.target_audience || [])) {
      await db.prepare(`
        INSERT OR REPLACE INTO page_audiences (page_path, audience)
        VALUES (?, ?)
      `).bind(page.path, audience).run();
    }

    // Insert blocks
    for (const block of (page.blocks || [])) {
      await db.prepare(`
        INSERT OR REPLACE INTO page_blocks (page_path, block_name)
        VALUES (?, ?)
      `).bind(page.path, block).run();
    }

    // Insert internal links
    for (const link of (page.internalLinks || [])) {
      await db.prepare(`
        INSERT OR REPLACE INTO page_links (source_path, target_path)
        VALUES (?, ?)
      `).bind(page.path, link).run();
    }

    // Insert key messages
    for (const message of (page.key_messages || [])) {
      await db.prepare(`
        INSERT INTO page_messages (page_path, message)
        VALUES (?, ?)
      `).bind(page.path, message).run();
    }

    console.log(`Loaded: ${page.path}`);
  }
}

export { loadToD1 };
```

---

## Step 5: Query for Content Intelligence

### Topic Coverage Analysis

```sql
-- What topics do we cover and how much content per topic?
SELECT
  primary_topic,
  COUNT(*) as page_count,
  GROUP_CONCAT(content_type) as content_types
FROM pages
GROUP BY primary_topic
ORDER BY page_count DESC;
```

### Content Gap Analysis - Missing Funnel Stages

```sql
-- Topics missing decision-stage content
SELECT
  primary_topic,
  SUM(CASE WHEN funnel_stage = 'awareness' THEN 1 ELSE 0 END) as awareness_count,
  SUM(CASE WHEN funnel_stage = 'consideration' THEN 1 ELSE 0 END) as consideration_count,
  SUM(CASE WHEN funnel_stage = 'decision' THEN 1 ELSE 0 END) as decision_count
FROM pages
GROUP BY primary_topic
HAVING decision_count = 0
ORDER BY awareness_count DESC;
```

### Entity Coverage - Frequently Mentioned but No Dedicated Page

```sql
-- Entities mentioned often but lacking dedicated content
SELECT
  e.name,
  e.type,
  COUNT(pe.page_path) as mention_count
FROM entities e
JOIN page_entities pe ON e.id = pe.entity_id
WHERE NOT EXISTS (
  SELECT 1 FROM pages p
  WHERE LOWER(p.title) LIKE '%' || LOWER(e.name) || '%'
)
GROUP BY e.id
ORDER BY mention_count DESC
LIMIT 20;
```

### Audience Coverage Analysis

```sql
-- Which audiences are underserved?
SELECT
  audience,
  COUNT(*) as page_count,
  GROUP_CONCAT(DISTINCT funnel_stage) as funnel_stages
FROM page_audiences
JOIN pages ON page_audiences.page_path = pages.path
GROUP BY audience
ORDER BY page_count ASC;
```

### Block Usage Patterns

```sql
-- Most commonly used blocks by content type
SELECT
  p.content_type,
  pb.block_name,
  COUNT(*) as usage_count
FROM page_blocks pb
JOIN pages p ON pb.page_path = p.path
GROUP BY p.content_type, pb.block_name
ORDER BY p.content_type, usage_count DESC;
```

### Internal Linking Opportunities

```sql
-- Pages with few incoming links (orphaned content)
SELECT
  p.path,
  p.title,
  p.primary_topic,
  COUNT(pl.source_path) as incoming_links
FROM pages p
LEFT JOIN page_links pl ON p.path = pl.target_path
GROUP BY p.path
HAVING incoming_links < 2
ORDER BY incoming_links ASC;
```

### Find Related Content for a Topic

```sql
-- Find all content related to a specific topic
SELECT
  p.path,
  p.title,
  p.funnel_stage,
  p.summary,
  pt.is_primary
FROM pages p
JOIN page_topics pt ON p.path = pt.page_path
WHERE pt.topic LIKE '%your-topic-here%'
ORDER BY pt.is_primary DESC, p.word_count DESC;
```

---

## Step 6: AI-Powered Content Generation

### Generate Content Brief Based on Inventory

```javascript
// tools/generate-content.js

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

/**
 * Generate a content brief informed by existing inventory
 */
async function generateContentBrief(db, topic, targetFunnelStage, targetAudience) {

  // Query existing content on this topic
  const existingContent = await db.prepare(`
    SELECT p.path, p.title, p.summary, p.funnel_stage, p.content_type
    FROM pages p
    JOIN page_topics pt ON p.path = pt.page_path
    WHERE pt.topic LIKE ?
    ORDER BY pt.is_primary DESC
    LIMIT 15
  `).bind(`%${topic}%`).all();

  // Get entities used in related content
  const relatedEntities = await db.prepare(`
    SELECT DISTINCT e.name, e.type
    FROM entities e
    JOIN page_entities pe ON e.id = pe.entity_id
    JOIN page_topics pt ON pe.page_path = pt.page_path
    WHERE pt.topic LIKE ?
  `).bind(`%${topic}%`).all();

  // Get blocks commonly used for this content type
  const blocksUsed = await db.prepare(`
    SELECT pb.block_name, COUNT(*) as usage_count
    FROM page_blocks pb
    JOIN pages p ON pb.page_path = p.path
    JOIN page_topics pt ON p.path = pt.page_path
    WHERE pt.topic LIKE ?
    GROUP BY pb.block_name
    ORDER BY usage_count DESC
    LIMIT 10
  `).bind(`%${topic}%`).all();

  // Get key messages from related content
  const existingMessages = await db.prepare(`
    SELECT DISTINCT pm.message
    FROM page_messages pm
    JOIN page_topics pt ON pm.page_path = pt.page_path
    WHERE pt.topic LIKE ?
    LIMIT 20
  `).bind(`%${topic}%`).all();

  // Count existing coverage
  const funnelCoverage = existingContent.results.reduce((acc, p) => {
    acc[p.funnel_stage] = (acc[p.funnel_stage] || 0) + 1;
    return acc;
  }, {});

  // Generate brief with full context
  const brief = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `Create a detailed content brief for a new page on our Edge Delivery Services site.

## EXISTING CONTENT ON "${topic}"
${existingContent.results.length > 0
  ? existingContent.results.map(p =>
      `- **${p.title}** (${p.funnel_stage}, ${p.content_type})\n  Path: ${p.path}\n  Summary: ${p.summary}`
    ).join('\n\n')
  : 'No existing content on this topic yet.'}

## CURRENT FUNNEL COVERAGE
- Awareness: ${funnelCoverage.awareness || 0} pages
- Consideration: ${funnelCoverage.consideration || 0} pages
- Decision: ${funnelCoverage.decision || 0} pages

## ENTITIES/TERMINOLOGY WE USE
${relatedEntities.results.map(e => `- ${e.name} (${e.type})`).join('\n')}

## KEY MESSAGES IN EXISTING CONTENT
${existingMessages.results.map(m => `- ${m.message}`).join('\n')}

## BLOCKS COMMONLY USED
${blocksUsed.results.map(b => `- ${b.block_name}: used in ${b.usage_count} pages`).join('\n')}

## TARGET FOR NEW CONTENT
- **Topic:** ${topic}
- **Funnel Stage:** ${targetFunnelStage}
- **Target Audience:** ${targetAudience}
- **Gap to Fill:** We have ${funnelCoverage[targetFunnelStage] || 0} pages at the ${targetFunnelStage} stage

---

Generate a comprehensive content brief that includes:

1. **Recommended Title** - SEO-friendly, consistent with existing naming patterns
2. **Content Type** - article, product page, landing page, etc.
3. **Key Messages** - 3-5 core messages (aligned with existing messaging)
4. **Entities to Reference** - products, features, concepts to mention
5. **Suggested Blocks** - which DA blocks to use based on patterns
6. **Internal Links** - existing pages to link to
7. **Detailed Outline** - H2/H3 structure with bullet points for each section
8. **Differentiator** - how this content differs from existing pages
9. **CTA Recommendations** - appropriate calls-to-action for the funnel stage`
    }]
  });

  return brief.content[0].text;
}

/**
 * Generate full draft content based on brief
 */
async function generateDraftContent(db, brief, topic) {
  // Get sample content for tone/style reference
  const sampleContent = await db.prepare(`
    SELECT p.path, p.summary
    FROM pages p
    JOIN page_topics pt ON p.path = pt.page_path
    WHERE pt.topic LIKE ? AND pt.is_primary = TRUE
    LIMIT 3
  `).bind(`%${topic}%`).all();

  const draft = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `Based on this content brief, write the full page content.

## CONTENT BRIEF
${brief}

## STYLE REFERENCE (from existing pages)
${sampleContent.results.map(s => s.summary).join('\n\n')}

Write the content in a format suitable for DA (Document Authoring):
- Use markdown-style headings (## for H2, ### for H3)
- Keep paragraphs concise
- Include placeholder notes for blocks like [BLOCK: block-name]
- Include internal links as [Link Text](/path)
- Match the tone and style of existing content`
    }]
  });

  return draft.content[0].text;
}

export { generateContentBrief, generateDraftContent };
```

---

## Complete Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CONTENT INVENTORY PIPELINE                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. CRAWL                                                           │
│     ┌─────────────┐                                                 │
│     │  DA Admin   │──▶ GET /list/{org}/{repo}                       │
│     │  API        │──▶ GET /source/{org}/{repo}/{path}              │
│     └─────────────┘                                                 │
│            │                                                        │
│            ▼                                                        │
│  2. ANALYZE                                                         │
│     ┌─────────────┐                                                 │
│     │  Claude API │──▶ Extract: topics, entities, audience,        │
│     │             │    funnel stage, key messages, summary          │
│     └─────────────┘                                                 │
│            │                                                        │
│            ▼                                                        │
│  3. STORE                                                           │
│     ┌─────────────┐                                                 │
│     │  Cloudflare │──▶ pages, page_topics, entities,                │
│     │  D1         │    page_entities, page_blocks, etc.             │
│     └─────────────┘                                                 │
│            │                                                        │
│            ▼                                                        │
│  4. QUERY                                                           │
│     ┌─────────────┐                                                 │
│     │  SQL        │──▶ Gap analysis, coverage reports,              │
│     │  Queries    │    relationship mapping                         │
│     └─────────────┘                                                 │
│            │                                                        │
│            ▼                                                        │
│  5. GENERATE                                                        │
│     ┌─────────────┐                                                 │
│     │  Claude +   │──▶ Content briefs, drafts informed by           │
│     │  Context    │    full inventory knowledge                     │
│     └─────────────┘                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Maintenance & Updates

### Incremental Updates

```javascript
// Only re-crawl pages modified since last run
async function incrementalCrawl(db, org, repo, authToken) {
  const lastCrawl = await db.prepare(`
    SELECT MAX(last_crawled) as last_crawled FROM pages
  `).first();

  // Crawl and compare timestamps
  // Only re-analyze pages that have changed
}
```

### Scheduled Re-Analysis

Set up a Cloudflare Worker or cron job to:
1. Re-crawl weekly for new/changed content
2. Re-run analysis on changed pages
3. Update D1 database
4. Generate coverage report

---

---

## Step 7: Close the Loop - Measurement Feedback

The Enterprise Context layer becomes more valuable over time by ingesting performance data. This creates a flywheel: better context → better AI output → better content → better performance → richer context.

### Extended Schema for Performance Data

```sql
-- performance.sql
-- Extend the schema to capture content performance

-- Page performance metrics (updated regularly from analytics)
CREATE TABLE IF NOT EXISTS page_performance (
  page_path TEXT REFERENCES pages(path) ON DELETE CASCADE,
  date DATE NOT NULL,
  pageviews INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  avg_time_on_page REAL DEFAULT 0,
  bounce_rate REAL DEFAULT 0,
  scroll_depth REAL DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_rate REAL DEFAULT 0,
  PRIMARY KEY (page_path, date)
);

-- Content quality signals
CREATE TABLE IF NOT EXISTS page_quality_signals (
  page_path TEXT PRIMARY KEY REFERENCES pages(path) ON DELETE CASCADE,
  readability_score REAL,           -- Flesch-Kincaid or similar
  seo_score REAL,                   -- Lighthouse/similar
  accessibility_score REAL,         -- WCAG compliance
  brand_voice_score REAL,           -- AI-assessed brand alignment
  freshness_score REAL,             -- Based on last update vs topic velocity
  internal_link_score REAL,         -- Based on link graph analysis
  last_assessed DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- A/B test results (if applicable)
CREATE TABLE IF NOT EXISTS content_experiments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_path TEXT REFERENCES pages(path),
  variant_name TEXT,
  hypothesis TEXT,
  start_date DATE,
  end_date DATE,
  winner BOOLEAN DEFAULT FALSE,
  lift_percentage REAL,
  confidence REAL,
  learnings TEXT
);

-- Content lifecycle tracking
CREATE TABLE IF NOT EXISTS page_lifecycle (
  page_path TEXT PRIMARY KEY REFERENCES pages(path) ON DELETE CASCADE,
  created_date DATE,
  last_major_update DATE,
  review_due_date DATE,
  status TEXT DEFAULT 'active',  -- active, needs_review, deprecated, archived
  ai_generated BOOLEAN DEFAULT FALSE,
  human_edited BOOLEAN DEFAULT TRUE,
  editorial_notes TEXT
);

-- Topic performance aggregates (materialized view concept)
CREATE TABLE IF NOT EXISTS topic_performance (
  topic TEXT PRIMARY KEY,
  total_pages INTEGER,
  avg_pageviews REAL,
  avg_conversion_rate REAL,
  top_performing_path TEXT,
  underperforming_paths TEXT,  -- JSON array
  last_calculated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_perf_date ON page_performance(date);
CREATE INDEX IF NOT EXISTS idx_perf_conversions ON page_performance(conversions);
CREATE INDEX IF NOT EXISTS idx_lifecycle_status ON page_lifecycle(status);
CREATE INDEX IF NOT EXISTS idx_lifecycle_review ON page_lifecycle(review_due_date);
```

### Ingest Analytics Data

```javascript
// tools/ingest-analytics.js

/**
 * Ingest analytics data from various sources
 * Supports: Adobe Analytics, Google Analytics, RUM data
 */

async function ingestAnalyticsData(db, analyticsSource, dateRange) {
  let data;

  switch (analyticsSource.type) {
    case 'adobe-analytics':
      data = await fetchAdobeAnalytics(analyticsSource.config, dateRange);
      break;
    case 'google-analytics':
      data = await fetchGoogleAnalytics(analyticsSource.config, dateRange);
      break;
    case 'rum':
      // Edge Delivery Services Real User Monitoring
      data = await fetchRUMData(analyticsSource.config, dateRange);
      break;
  }

  for (const row of data) {
    await db.prepare(`
      INSERT OR REPLACE INTO page_performance
      (page_path, date, pageviews, unique_visitors, avg_time_on_page,
       bounce_rate, scroll_depth, conversions, conversion_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      row.path,
      row.date,
      row.pageviews,
      row.uniqueVisitors,
      row.avgTimeOnPage,
      row.bounceRate,
      row.scrollDepth,
      row.conversions,
      row.conversionRate
    ).run();
  }

  // Recalculate topic aggregates
  await recalculateTopicPerformance(db);
}

/**
 * Fetch RUM data from Edge Delivery Services
 * See: https://www.aem.live/developer/rum
 */
async function fetchRUMData(config, dateRange) {
  const { domainKey, domain } = config;

  const response = await fetch(
    `https://rum.fastly-aem.page/bundles/${domainKey}?` +
    `domain=${domain}&startdate=${dateRange.start}&enddate=${dateRange.end}`
  );

  const bundles = await response.json();

  // Transform RUM bundles to performance metrics
  return transformRUMBundles(bundles);
}

/**
 * Recalculate topic-level performance metrics
 */
async function recalculateTopicPerformance(db) {
  const topics = await db.prepare(`
    SELECT DISTINCT topic FROM page_topics WHERE is_primary = TRUE
  `).all();

  for (const { topic } of topics.results) {
    const metrics = await db.prepare(`
      SELECT
        COUNT(DISTINCT p.path) as total_pages,
        AVG(perf.pageviews) as avg_pageviews,
        AVG(perf.conversion_rate) as avg_conversion_rate,
        (SELECT p2.path FROM pages p2
         JOIN page_topics pt2 ON p2.path = pt2.page_path
         JOIN page_performance perf2 ON p2.path = perf2.page_path
         WHERE pt2.topic = ? AND pt2.is_primary = TRUE
         ORDER BY perf2.pageviews DESC LIMIT 1) as top_path
      FROM pages p
      JOIN page_topics pt ON p.path = pt.page_path
      LEFT JOIN page_performance perf ON p.path = perf.page_path
      WHERE pt.topic = ? AND pt.is_primary = TRUE
    `).bind(topic, topic).first();

    await db.prepare(`
      INSERT OR REPLACE INTO topic_performance
      (topic, total_pages, avg_pageviews, avg_conversion_rate,
       top_performing_path, last_calculated)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      topic,
      metrics.total_pages,
      metrics.avg_pageviews,
      metrics.avg_conversion_rate,
      metrics.top_path
    ).run();
  }
}

export { ingestAnalyticsData };
```

### Performance-Informed Content Generation

Now the AI generation step can leverage performance data:

```javascript
// tools/generate-content-with-performance.js

/**
 * Generate content brief with performance insights
 * This is the "Enterprise Context" advantage
 */
async function generatePerformanceInformedBrief(db, topic, targetFunnelStage, targetAudience) {

  // Get standard context (existing content, entities, etc.)
  const existingContent = await db.prepare(`
    SELECT p.path, p.title, p.summary, p.funnel_stage, p.content_type
    FROM pages p
    JOIN page_topics pt ON p.path = pt.page_path
    WHERE pt.topic LIKE ?
    ORDER BY pt.is_primary DESC
    LIMIT 15
  `).bind(`%${topic}%`).all();

  // NEW: Get performance context
  const topPerformers = await db.prepare(`
    SELECT
      p.path, p.title, p.summary,
      AVG(perf.pageviews) as avg_views,
      AVG(perf.conversion_rate) as avg_conversion,
      AVG(perf.avg_time_on_page) as avg_engagement
    FROM pages p
    JOIN page_topics pt ON p.path = pt.page_path
    JOIN page_performance perf ON p.path = perf.page_path
    WHERE pt.topic LIKE ?
    GROUP BY p.path
    ORDER BY avg_conversion DESC, avg_views DESC
    LIMIT 5
  `).bind(`%${topic}%`).all();

  const underperformers = await db.prepare(`
    SELECT
      p.path, p.title,
      AVG(perf.bounce_rate) as avg_bounce,
      AVG(perf.conversion_rate) as avg_conversion
    FROM pages p
    JOIN page_topics pt ON p.path = pt.page_path
    JOIN page_performance perf ON p.path = perf.page_path
    WHERE pt.topic LIKE ?
    GROUP BY p.path
    HAVING avg_bounce > 0.7 OR avg_conversion < 0.01
    LIMIT 5
  `).bind(`%${topic}%`).all();

  // NEW: Get quality signals
  const qualityBenchmarks = await db.prepare(`
    SELECT
      AVG(qs.readability_score) as avg_readability,
      AVG(qs.seo_score) as avg_seo,
      AVG(qs.brand_voice_score) as avg_brand_voice
    FROM page_quality_signals qs
    JOIN page_topics pt ON qs.page_path = pt.page_path
    WHERE pt.topic LIKE ?
  `).bind(`%${topic}%`).first();

  // NEW: Get learnings from experiments
  const experimentLearnings = await db.prepare(`
    SELECT hypothesis, learnings, lift_percentage
    FROM content_experiments
    WHERE page_path IN (
      SELECT page_path FROM page_topics WHERE topic LIKE ?
    )
    AND winner = TRUE
    ORDER BY lift_percentage DESC
    LIMIT 5
  `).bind(`%${topic}%`).all();

  // Get entities and blocks (as before)
  const relatedEntities = await db.prepare(`
    SELECT DISTINCT e.name, e.type
    FROM entities e
    JOIN page_entities pe ON e.id = pe.entity_id
    JOIN page_topics pt ON pe.page_path = pt.page_path
    WHERE pt.topic LIKE ?
  `).bind(`%${topic}%`).all();

  const blocksUsed = await db.prepare(`
    SELECT pb.block_name, COUNT(*) as usage_count
    FROM page_blocks pb
    JOIN pages p ON pb.page_path = p.path
    JOIN page_topics pt ON p.path = pt.page_path
    WHERE pt.topic LIKE ?
    GROUP BY pb.block_name
    ORDER BY usage_count DESC
    LIMIT 10
  `).bind(`%${topic}%`).all();

  // Generate brief with FULL enterprise context
  const brief = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `Create a detailed content brief for a new page, informed by our enterprise content intelligence.

## EXISTING CONTENT ON "${topic}"
${existingContent.results.map(p =>
  `- **${p.title}** (${p.funnel_stage}): ${p.summary}`
).join('\n')}

## PERFORMANCE INSIGHTS (What's Working)

### Top Performers
${topPerformers.results.map(p =>
  `- **${p.title}**
   - Avg views: ${Math.round(p.avg_views)}/day
   - Conversion rate: ${(p.avg_conversion * 100).toFixed(2)}%
   - Engagement: ${Math.round(p.avg_engagement)}s avg time
   - Summary: ${p.summary}`
).join('\n\n')}

### Underperformers (What to Avoid)
${underperformers.results.map(p =>
  `- ${p.title}: ${(p.avg_bounce * 100).toFixed(0)}% bounce, ${(p.avg_conversion * 100).toFixed(2)}% conversion`
).join('\n')}

### Quality Benchmarks for This Topic
- Average readability score: ${qualityBenchmarks?.avg_readability?.toFixed(1) || 'N/A'}
- Average SEO score: ${qualityBenchmarks?.avg_seo?.toFixed(1) || 'N/A'}
- Average brand voice alignment: ${qualityBenchmarks?.avg_brand_voice?.toFixed(1) || 'N/A'}

### Proven Experiment Learnings
${experimentLearnings.results.length > 0
  ? experimentLearnings.results.map(e =>
      `- **${e.hypothesis}**: ${e.learnings} (+${e.lift_percentage}% lift)`
    ).join('\n')
  : 'No experiment data yet.'}

## ENTITIES/TERMINOLOGY WE USE
${relatedEntities.results.map(e => `- ${e.name} (${e.type})`).join('\n')}

## BLOCKS COMMONLY USED
${blocksUsed.results.map(b => `- ${b.block_name}: ${b.usage_count} pages`).join('\n')}

## TARGET FOR NEW CONTENT
- **Topic:** ${topic}
- **Funnel Stage:** ${targetFunnelStage}
- **Target Audience:** ${targetAudience}

---

Generate a comprehensive content brief that:

1. **Learns from top performers** - Incorporate elements that drive high engagement and conversion
2. **Avoids underperformer patterns** - Don't repeat what's not working
3. **Meets quality benchmarks** - Target readability/SEO/brand scores at or above topic average
4. **Applies experiment learnings** - Use proven optimization insights
5. **Uses correct terminology** - Reference entities consistently
6. **Leverages proven blocks** - Suggest block patterns that work for this topic

Include:
- Recommended title (SEO-optimized based on what performs)
- Key messages (aligned with high-converting content)
- Detailed outline with block suggestions
- Internal links to high-performing related content
- Specific quality targets to hit
- A/B test hypotheses to validate`
    }]
  });

  return brief.content[0].text;
}

export { generatePerformanceInformedBrief };
```

### Content Lifecycle Management

```javascript
// tools/content-lifecycle.js

/**
 * Identify content that needs attention based on performance + freshness
 */
async function getContentNeedingReview(db) {

  // Underperforming content
  const underperforming = await db.prepare(`
    SELECT
      p.path, p.title, p.primary_topic,
      AVG(perf.conversion_rate) as conversion_rate,
      AVG(perf.bounce_rate) as bounce_rate,
      lc.last_major_update
    FROM pages p
    JOIN page_performance perf ON p.path = perf.page_path
    LEFT JOIN page_lifecycle lc ON p.path = lc.page_path
    WHERE perf.date > date('now', '-30 days')
    GROUP BY p.path
    HAVING bounce_rate > 0.7 OR conversion_rate < 0.005
    ORDER BY conversion_rate ASC
    LIMIT 20
  `).all();

  // Stale content (not updated in 6+ months, but still getting traffic)
  const stale = await db.prepare(`
    SELECT
      p.path, p.title,
      lc.last_major_update,
      AVG(perf.pageviews) as recent_views
    FROM pages p
    JOIN page_lifecycle lc ON p.path = lc.page_path
    JOIN page_performance perf ON p.path = perf.page_path
    WHERE lc.last_major_update < date('now', '-180 days')
      AND perf.date > date('now', '-30 days')
    GROUP BY p.path
    HAVING recent_views > 100
    ORDER BY recent_views DESC
  `).all();

  // Content gaps (topics with poor funnel coverage)
  const gaps = await db.prepare(`
    SELECT
      primary_topic,
      SUM(CASE WHEN funnel_stage = 'awareness' THEN 1 ELSE 0 END) as awareness,
      SUM(CASE WHEN funnel_stage = 'consideration' THEN 1 ELSE 0 END) as consideration,
      SUM(CASE WHEN funnel_stage = 'decision' THEN 1 ELSE 0 END) as decision,
      tp.avg_conversion_rate
    FROM pages p
    LEFT JOIN topic_performance tp ON p.primary_topic = tp.topic
    GROUP BY primary_topic
    HAVING awareness = 0 OR consideration = 0 OR decision = 0
    ORDER BY tp.avg_conversion_rate DESC
  `).all();

  return {
    underperforming: underperforming.results,
    stale: stale.results,
    contentGaps: gaps.results
  };
}

/**
 * Generate AI-powered refresh recommendations
 */
async function generateRefreshRecommendations(db, pagePath) {
  const page = await db.prepare(`
    SELECT p.*, lc.last_major_update, lc.editorial_notes
    FROM pages p
    LEFT JOIN page_lifecycle lc ON p.path = lc.page_path
    WHERE p.path = ?
  `).bind(pagePath).first();

  const performance = await db.prepare(`
    SELECT * FROM page_performance
    WHERE page_path = ?
    ORDER BY date DESC
    LIMIT 30
  `).bind(pagePath).all();

  const topPerformerInTopic = await db.prepare(`
    SELECT p.path, p.title, p.summary
    FROM pages p
    JOIN page_topics pt ON p.path = pt.page_path
    JOIN page_performance perf ON p.path = perf.page_path
    WHERE pt.topic = ? AND p.path != ?
    GROUP BY p.path
    ORDER BY AVG(perf.conversion_rate) DESC
    LIMIT 1
  `).bind(page.primary_topic, pagePath).first();

  const recommendations = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Analyze this underperforming content and recommend specific improvements.

## PAGE DETAILS
- Path: ${page.path}
- Title: ${page.title}
- Topic: ${page.primary_topic}
- Funnel Stage: ${page.funnel_stage}
- Last Updated: ${page.last_major_update || 'Unknown'}
- Summary: ${page.summary}

## RECENT PERFORMANCE (Last 30 days)
- Avg pageviews/day: ${average(performance.results, 'pageviews')}
- Avg bounce rate: ${(average(performance.results, 'bounce_rate') * 100).toFixed(1)}%
- Avg conversion rate: ${(average(performance.results, 'conversion_rate') * 100).toFixed(2)}%
- Avg time on page: ${average(performance.results, 'avg_time_on_page').toFixed(0)}s

## TOP PERFORMER IN SAME TOPIC (For Reference)
${topPerformerInTopic
  ? `- ${topPerformerInTopic.title}\n- Summary: ${topPerformerInTopic.summary}`
  : 'No comparison available'}

Provide specific, actionable recommendations:
1. What's likely causing the poor performance?
2. What structural changes would help?
3. What content additions/removals?
4. What A/B tests should we run?
5. Priority order for changes`
    }]
  });

  return recommendations.content[0].text;
}

function average(arr, field) {
  if (!arr.length) return 0;
  return arr.reduce((sum, item) => sum + (item[field] || 0), 0) / arr.length;
}

export { getContentNeedingReview, generateRefreshRecommendations };
```

---

## Complete Lifecycle Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      ENTERPRISE CONTENT LIFECYCLE                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ╔═══════════════════════════════════════════════════════════════════════════╗  │
│  ║  ENTERPRISE CONTEXT (Adobe Owns - Sticky)                                 ║  │
│  ║  ┌─────────────────────────────────────────────────────────────────────┐  ║  │
│  ║  │  Content Inventory  │  Performance Data  │  Quality Signals        │  ║  │
│  ║  │  - Topics           │  - Pageviews       │  - Brand voice score    │  ║  │
│  ║  │  - Entities         │  - Conversions     │  - Readability          │  ║  │
│  ║  │  - Audiences        │  - Engagement      │  - SEO score            │  ║  │
│  ║  │  - Relationships    │  - A/B results     │  - Freshness            │  ║  │
│  ║  └─────────────────────────────────────────────────────────────────────┘  ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════╝  │
│                                       │                                         │
│                                       ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  AI GENERATION (Commodity - But Constrained by Context)                   │  │
│  │                                                                           │  │
│  │  Context transforms:  "Write about X"  ──▶  "Write about X using our     │  │
│  │                                              terminology, matching our    │  │
│  │                                              top performers, avoiding     │  │
│  │                                              patterns that don't convert" │  │
│  │                                                                           │  │
│  │  Output: 80% first draft (not garbage)                                    │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                       │                                         │
│                                       ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  VISUAL REFINEMENT (Humans in DA/AEM)                                     │  │
│  │                                                                           │  │
│  │  - Collaborative editing                                                  │  │
│  │  - Block-based visual composition                                         │  │
│  │  - Brand governance & approval workflows                                  │  │
│  │  - Human judgment & creativity                                            │  │
│  │                                                                           │  │
│  │  Output: 100% publish-ready content                                       │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                       │                                         │
│                                       ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  PUBLISH (Edge Delivery Services)                                         │  │
│  │                                                                           │  │
│  │  - Sub-second delivery globally                                           │  │
│  │  - Perfect Lighthouse scores                                              │  │
│  │  - Real User Monitoring (RUM) data collection                             │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                       │                                         │
│                                       ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  MEASURE (Analytics + RUM)                                                │  │
│  │                                                                           │  │
│  │  - Page performance metrics                                               │  │
│  │  - Conversion tracking                                                    │  │
│  │  - Engagement signals                                                     │  │
│  │  - A/B test results                                                       │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                       │                                         │
│                                       │                                         │
│           ┌───────────────────────────┘                                         │
│           │                                                                     │
│           │   FEEDBACK LOOP                                                     │
│           │   - Performance data enriches ontology                              │
│           │   - Learnings inform future generation                              │
│           │   - Context gets smarter over time                                  │
│           │   - AI output quality improves continuously                         │
│           │                                                                     │
│           └──────────────────────────▶ Back to ENTERPRISE CONTEXT               │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Why This Matters

### Without Enterprise Context
```
User: "Write a blog post about cloud security"

AI: [Generic content that could be from any company]
    - Wrong terminology
    - No awareness of existing content
    - May conflict with other pages
    - No conversion optimization
    - Requires 80% rewrite

Result: Garbage that wastes everyone's time
```

### With Enterprise Context
```
User: "Write a blog post about cloud security"

AI: [Informed by your ontology + performance data]
    - Uses your product names and terminology
    - Fills identified content gap (consideration stage)
    - Links to your top-performing related content
    - Uses block patterns that convert
    - Applies learnings from past experiments
    - Matches your brand voice score targets

Result: 80% first draft ready for human polish in DA/AEM
```

### The Competitive Moat

| Aspect | Commodity AI | Enterprise Context + AI |
|--------|--------------|-------------------------|
| Content quality | 20% usable | 80% usable |
| Brand consistency | Random | Enforced |
| Terminology | Generic | Your vocabulary |
| Performance | Hope-based | Data-informed |
| Improvement | None | Continuous via feedback loop |
| Switching cost | Zero | High (years of data) |

**This is why Enterprise Context is sticky and defensible.** It takes years to build a rich ontology with performance history. That data makes your AI output dramatically better than competitors using generic AI.

---

## Resources

- **DA Admin API:** https://opensource.adobe.com/da-admin/
- **DA Documentation:** https://docs.da.live/
- **DA GitHub:** https://github.com/adobe/da-live
- **EDS RUM:** https://www.aem.live/developer/rum
- **Cloudflare D1:** https://developers.cloudflare.com/d1/
- **Claude API:** https://docs.anthropic.com/
