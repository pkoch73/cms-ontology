# Enterprise Context Ontology × Claude Cowork Integration

How to integrate the Enterprise Content Ontology into Claude Cowork to create an AI-powered content operations workspace.

---

## The Opportunity

[Claude Cowork](https://claude.com/blog/cowork-research-preview) is Anthropic's agentic workspace where Claude can read, edit, and create files within a designated folder. Combined with [plugins](https://sherwood.news/markets/claude-coworks-plug-ins-the-newest-reason-for-software-stocks-to-crater/) that customize workflows for specific domains (marketing, legal, etc.), Cowork becomes a powerful content operations platform.

**The integration thesis:** The Enterprise Context Ontology becomes a **Cowork Plugin** that gives Claude deep knowledge of your content inventory, making every content task context-aware.

---

## Architecture: Ontology as Cowork Plugin

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CLAUDE COWORK WORKSPACE                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  COWORK FOLDER (User's Local Filesystem)                                │   │
│  │  ~/content-workspace/                                                   │   │
│  │  ├── drafts/           ← AI generates here                              │   │
│  │  ├── briefs/           ← Content briefs                                 │   │
│  │  ├── reviews/          ← Content for review                             │   │
│  │  ├── approved/         ← Ready for DA upload                            │   │
│  │  └── .context/         ← Ontology cache (synced from D1)                │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│                                       ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  ENTERPRISE CONTEXT PLUGIN                                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │ Ontology    │  │ Performance │  │ Brand       │  │ DA          │    │   │
│  │  │ Query       │  │ Insights    │  │ Guidelines  │  │ Connector   │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│                                       ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  EXTERNAL CONNECTIONS                                                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │ Cloudflare  │  │ DA Admin    │  │ Analytics   │  │ Chrome      │    │   │
│  │  │ D1 (Ontology)│ │ API         │  │ (RUM/AA)    │  │ Extension   │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Plugin Capabilities

### 1. Ontology Query Skill

Claude can query the content inventory to understand what exists before creating new content.

```javascript
// cowork-plugin/skills/ontology-query.js

export default {
  name: 'ontology-query',
  description: 'Query the enterprise content inventory',

  async execute(context, params) {
    const { query, filters } = params;

    // Connect to D1 via Cloudflare API
    const db = await context.getConnection('cloudflare-d1');

    switch (query) {
      case 'related-content':
        return await db.prepare(`
          SELECT p.path, p.title, p.summary, p.funnel_stage
          FROM pages p
          JOIN page_topics pt ON p.path = pt.page_path
          WHERE pt.topic LIKE ?
          ORDER BY pt.is_primary DESC
          LIMIT 10
        `).bind(`%${filters.topic}%`).all();

      case 'content-gaps':
        return await db.prepare(`
          SELECT primary_topic,
            SUM(CASE WHEN funnel_stage = 'awareness' THEN 1 ELSE 0 END) as awareness,
            SUM(CASE WHEN funnel_stage = 'consideration' THEN 1 ELSE 0 END) as consideration,
            SUM(CASE WHEN funnel_stage = 'decision' THEN 1 ELSE 0 END) as decision
          FROM pages
          GROUP BY primary_topic
          HAVING awareness = 0 OR consideration = 0 OR decision = 0
        `).all();

      case 'entity-usage':
        return await db.prepare(`
          SELECT e.name, e.type, COUNT(pe.page_path) as usage_count
          FROM entities e
          LEFT JOIN page_entities pe ON e.id = pe.entity_id
          GROUP BY e.id
          ORDER BY usage_count DESC
        `).all();

      case 'top-performers':
        return await db.prepare(`
          SELECT p.path, p.title, AVG(perf.conversion_rate) as avg_conversion
          FROM pages p
          JOIN page_performance perf ON p.path = perf.page_path
          WHERE perf.date > date('now', '-30 days')
          GROUP BY p.path
          ORDER BY avg_conversion DESC
          LIMIT 10
        `).all();
    }
  }
};
```

### 2. Performance Insights Skill

Claude can pull performance data to inform content decisions.

```javascript
// cowork-plugin/skills/performance-insights.js

export default {
  name: 'performance-insights',
  description: 'Get content performance insights',

  async execute(context, params) {
    const { pagePath, topic, dateRange } = params;
    const db = await context.getConnection('cloudflare-d1');

    if (pagePath) {
      // Single page performance
      return await db.prepare(`
        SELECT
          date,
          pageviews,
          bounce_rate,
          conversion_rate,
          avg_time_on_page
        FROM page_performance
        WHERE page_path = ?
        AND date BETWEEN ? AND ?
        ORDER BY date DESC
      `).bind(pagePath, dateRange.start, dateRange.end).all();
    }

    if (topic) {
      // Topic-level performance
      return await db.prepare(`
        SELECT
          p.path, p.title,
          AVG(perf.pageviews) as avg_views,
          AVG(perf.conversion_rate) as avg_conversion,
          AVG(perf.bounce_rate) as avg_bounce
        FROM pages p
        JOIN page_topics pt ON p.path = pt.page_path
        JOIN page_performance perf ON p.path = perf.page_path
        WHERE pt.topic LIKE ?
        AND perf.date BETWEEN ? AND ?
        GROUP BY p.path
        ORDER BY avg_conversion DESC
      `).bind(`%${topic}%`, dateRange.start, dateRange.end).all();
    }
  }
};
```

### 3. Brand Guidelines Skill

Claude can reference brand voice, terminology, and style guidelines.

```javascript
// cowork-plugin/skills/brand-guidelines.js

export default {
  name: 'brand-guidelines',
  description: 'Access brand voice and style guidelines',

  async execute(context, params) {
    const db = await context.getConnection('cloudflare-d1');

    // Get terminology/entity preferences
    const entities = await db.prepare(`
      SELECT name, type, description
      FROM entities
      WHERE type IN ('product', 'feature', 'brand')
    `).all();

    // Get high-performing content patterns
    const voiceExamples = await db.prepare(`
      SELECT p.title, p.summary, qs.brand_voice_score
      FROM pages p
      JOIN page_quality_signals qs ON p.path = qs.page_path
      WHERE qs.brand_voice_score > 0.8
      ORDER BY qs.brand_voice_score DESC
      LIMIT 5
    `).all();

    // Get block patterns
    const blockPatterns = await db.prepare(`
      SELECT pb.block_name, p.content_type, COUNT(*) as usage
      FROM page_blocks pb
      JOIN pages p ON pb.page_path = p.path
      GROUP BY pb.block_name, p.content_type
      ORDER BY usage DESC
    `).all();

    return {
      terminology: entities.results,
      voiceExamples: voiceExamples.results,
      blockPatterns: blockPatterns.results
    };
  }
};
```

### 4. DA Connector Skill

Claude can push approved content directly to DA.

```javascript
// cowork-plugin/skills/da-connector.js

export default {
  name: 'da-connector',
  description: 'Read from and write to DA repository',

  async execute(context, params) {
    const { action, org, repo, path, content } = params;
    const daToken = await context.getSecret('DA_AUTH_TOKEN');

    const DA_ADMIN_BASE = 'https://admin.da.live';

    switch (action) {
      case 'read':
        const readResponse = await fetch(
          `${DA_ADMIN_BASE}/source/${org}/${repo}${path}`,
          { headers: { 'Authorization': `Bearer ${daToken}` } }
        );
        return await readResponse.text();

      case 'write':
        // Convert markdown to DA HTML format
        const daHtml = convertToDAFormat(content);

        const formData = new FormData();
        formData.append('data', new Blob([daHtml], { type: 'text/html' }));

        const writeResponse = await fetch(
          `${DA_ADMIN_BASE}/source/${org}/${repo}${path}`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${daToken}` },
            body: formData
          }
        );

        return {
          success: writeResponse.ok,
          editUrl: (await writeResponse.json()).editUrl
        };

      case 'list':
        const listResponse = await fetch(
          `${DA_ADMIN_BASE}/list/${org}/${repo}${path}`,
          { headers: { 'Authorization': `Bearer ${daToken}` } }
        );
        return await listResponse.json();
    }
  }
};

function convertToDAFormat(markdown) {
  // Convert markdown to DA-compatible HTML
  // Handle blocks, sections, etc.
  // ... implementation
}
```

---

## Cowork Workflows

### Workflow 1: Context-Aware Content Creation

**User prompt in Cowork:**
> "Create a blog post about cloud security for our consideration-stage audience"

**What happens with the plugin:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CLAUDE QUERIES ONTOLOGY                                      │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │ • What content exists about "cloud security"?           │  │
│    │ • What's missing at the consideration stage?            │  │
│    │ • What entities/terminology do we use?                  │  │
│    │ • What's our top-performing content on this topic?      │  │
│    └─────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│ 2. CLAUDE GETS PERFORMANCE INSIGHTS                             │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │ • Top performers: what structure works?                 │  │
│    │ • Underperformers: what to avoid?                       │  │
│    │ • Quality benchmarks for this topic                     │  │
│    └─────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│ 3. CLAUDE CHECKS BRAND GUIDELINES                               │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │ • Correct product names and terminology                 │  │
│    │ • Brand voice examples                                  │  │
│    │ • Recommended blocks for this content type              │  │
│    └─────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│ 4. CLAUDE GENERATES CONTENT BRIEF                               │
│    → Writes to: ~/content-workspace/briefs/cloud-security.md    │
│                              │                                   │
│                              ▼                                   │
│ 5. CLAUDE GENERATES DRAFT                                       │
│    → Writes to: ~/content-workspace/drafts/cloud-security.md    │
│                              │                                   │
│                              ▼                                   │
│ 6. HUMAN REVIEWS & APPROVES                                     │
│    → Moves to: ~/content-workspace/approved/cloud-security.md   │
│                              │                                   │
│                              ▼                                   │
│ 7. CLAUDE PUSHES TO DA                                          │
│    → Creates: /blog/cloud-security in DA repository             │
│    → Returns: Edit URL for visual refinement in DA              │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow 2: Content Refresh Pipeline

**User prompt in Cowork:**
> "Identify underperforming content and suggest improvements"

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CLAUDE QUERIES PERFORMANCE DATA                              │
│    → Gets list of pages with high bounce, low conversion        │
│                              │                                   │
│                              ▼                                   │
│ 2. FOR EACH UNDERPERFORMER:                                     │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │ • Compare to top performer in same topic                │  │
│    │ • Identify structural differences                       │  │
│    │ • Check against quality benchmarks                      │  │
│    │ • Generate specific recommendations                     │  │
│    └─────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│ 3. CLAUDE GENERATES REFRESH REPORTS                             │
│    → Writes to: ~/content-workspace/reviews/                    │
│    → One file per page needing attention                        │
│                              │                                   │
│                              ▼                                   │
│ 4. CLAUDE QUEUES REFRESH TASKS                                  │
│    → Parallel processing of approved refreshes                  │
│    → Drafts updated versions in drafts/                         │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow 3: Content Gap Analysis & Batch Generation

**User prompt in Cowork:**
> "Find all content gaps in our top 5 topics and create briefs to fill them"

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CLAUDE IDENTIFIES TOP TOPICS BY PERFORMANCE                  │
│    → Queries topic_performance table                            │
│                              │                                   │
│                              ▼                                   │
│ 2. CLAUDE ANALYZES FUNNEL COVERAGE FOR EACH                     │
│    → For "cloud security": awareness ✓, consideration ✗, decision ✗
│    → For "data privacy": awareness ✓, consideration ✓, decision ✗
│    → ...                                                        │
│                              │                                   │
│                              ▼                                   │
│ 3. CLAUDE GENERATES GAP REPORT                                  │
│    → Writes: ~/content-workspace/briefs/gap-analysis.md         │
│                              │                                   │
│                              ▼                                   │
│ 4. CLAUDE GENERATES BRIEFS (in parallel)                        │
│    → briefs/cloud-security-consideration.md                     │
│    → briefs/cloud-security-decision.md                          │
│    → briefs/data-privacy-decision.md                            │
│    → ...                                                        │
│                              │                                   │
│                              ▼                                   │
│ 5. HUMAN PRIORITIZES & APPROVES BRIEFS                          │
│                              │                                   │
│                              ▼                                   │
│ 6. CLAUDE GENERATES DRAFTS (queued, parallel)                   │
│    → Cowork processes approved briefs while human does other work│
└─────────────────────────────────────────────────────────────────┘
```

---

## Plugin Configuration

### manifest.json

```json
{
  "name": "enterprise-content-ontology",
  "version": "1.0.0",
  "description": "Enterprise content inventory and performance intelligence for content operations",

  "skills": [
    {
      "name": "ontology-query",
      "description": "Query content inventory for topics, entities, gaps, and relationships",
      "file": "skills/ontology-query.js"
    },
    {
      "name": "performance-insights",
      "description": "Get content performance data and benchmarks",
      "file": "skills/performance-insights.js"
    },
    {
      "name": "brand-guidelines",
      "description": "Access terminology, voice guidelines, and content patterns",
      "file": "skills/brand-guidelines.js"
    },
    {
      "name": "da-connector",
      "description": "Read from and publish to DA repository",
      "file": "skills/da-connector.js"
    }
  ],

  "connections": [
    {
      "id": "cloudflare-d1",
      "type": "cloudflare",
      "description": "Cloudflare D1 database containing content ontology"
    },
    {
      "id": "da-admin",
      "type": "api",
      "description": "DA Admin API for content operations"
    }
  ],

  "secrets": [
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_API_TOKEN",
    "D1_DATABASE_ID",
    "DA_AUTH_TOKEN"
  ],

  "folder_structure": {
    "briefs": "Content briefs and planning documents",
    "drafts": "AI-generated draft content",
    "reviews": "Content pending human review",
    "approved": "Content approved for publishing",
    ".context": "Cached ontology data for offline access"
  }
}
```

### System Prompt Enhancement

When the plugin is active, Claude's system prompt is enhanced:

```markdown
## Enterprise Content Context

You have access to this organization's content inventory through the following skills:

### ontology-query
Query the content database to understand:
- What content exists on a topic
- Content gaps (missing funnel stages, audiences)
- Entity/terminology usage across content
- Internal linking relationships

**Always query the ontology before creating new content** to ensure you don't duplicate existing content and that you use consistent terminology.

### performance-insights
Access content performance data:
- Page-level metrics (views, conversions, engagement)
- Topic-level aggregates
- Top performers and underperformers
- Quality benchmarks

**Use performance data to inform content strategy** - learn from what works, avoid what doesn't.

### brand-guidelines
Access brand and style information:
- Official terminology and entity names
- Brand voice examples from top-performing content
- Block patterns that work for different content types

**Always use official terminology** and match the established brand voice.

### da-connector
Read from and write to the DA content repository:
- Read existing content for reference
- Push approved content for publishing
- List content in directories

**Only push content to DA after explicit human approval.**

## Content Creation Protocol

When asked to create content:
1. **Query ontology** - understand existing content landscape
2. **Check performance** - learn from top performers
3. **Get guidelines** - ensure terminology and voice alignment
4. **Generate brief** - save to briefs/ folder for human review
5. **Generate draft** - save to drafts/ folder
6. **Wait for approval** - human moves to approved/
7. **Push to DA** - only when in approved/ folder
```

---

## User Experience Flow

### In Claude.com / Cowork Interface

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ COWORK                                                    [enterprise-context] │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ USER: Create a new product page for our cloud backup feature                    │
│                                                                                 │
│ ─────────────────────────────────────────────────────────────────────────────── │
│                                                                                 │
│ CLAUDE: I'll create a product page for cloud backup. Let me first check our    │
│ content inventory and performance data...                                       │
│                                                                                 │
│ 📊 Querying ontology...                                                         │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ Found 3 existing pages mentioning "cloud backup":                           │ │
│ │ • /features/backup-overview (awareness) - 2.3% conversion                   │ │
│ │ • /blog/backup-best-practices (awareness) - 1.8% conversion                 │ │
│ │ • /solutions/disaster-recovery (consideration) - 4.1% conversion ⭐        │ │
│ │                                                                             │ │
│ │ Gap identified: No dedicated product page (decision stage)                  │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│ 📈 Top performer insights:                                                      │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ /solutions/disaster-recovery has highest conversion because:                │ │
│ │ • Uses comparison-table block                                               │ │
│ │ • Includes pricing-calculator block                                         │ │
│ │ • Strong CTA placement (above fold + end of page)                           │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│ 📝 Creating content brief...                                                    │
│ → Saved to: briefs/cloud-backup-product.md                                      │
│                                                                                 │
│ ✏️ Generating draft...                                                          │
│ → Saved to: drafts/cloud-backup-product.md                                      │
│                                                                                 │
│ The draft is ready for your review. Key features:                              │
│ • Uses "CloudVault Backup" (official product name from ontology)               │
│ • Includes comparison-table block (proven to convert)                          │
│ • Links to /solutions/disaster-recovery (top performer)                        │
│ • Targets decision-stage audience (fills identified gap)                       │
│                                                                                 │
│ Would you like me to open the draft for review?                                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration with Chrome Extension

When combined with Claude in Chrome, the workflow extends to visual refinement:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        COWORK + CHROME INTEGRATION                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  COWORK (Content Operations)          CHROME (Visual Refinement)               │
│  ┌─────────────────────────┐          ┌─────────────────────────┐              │
│  │ 1. Query ontology       │          │                         │              │
│  │ 2. Generate brief       │          │                         │              │
│  │ 3. Generate draft       │          │                         │              │
│  │ 4. Human approves       │          │                         │              │
│  │ 5. Push to DA           │────────▶ │ 6. Open DA editor       │              │
│  │                         │          │ 7. Visual block editing │              │
│  │                         │          │ 8. Preview & polish     │              │
│  │                         │          │ 9. Publish to EDS       │              │
│  └─────────────────────────┘          └─────────────────────────┘              │
│           │                                      │                              │
│           │                                      │                              │
│           ▼                                      ▼                              │
│  ┌───────────────────────────────────────────────────────────────┐             │
│  │                    MEASUREMENT & FEEDBACK                     │             │
│  │                                                               │             │
│  │  RUM data + Analytics → Ontology enrichment → Better AI       │             │
│  └───────────────────────────────────────────────────────────────┘             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Benefits of Integration

| Aspect | Without Plugin | With Enterprise Context Plugin |
|--------|----------------|--------------------------------|
| **Content awareness** | Claude doesn't know what exists | Claude queries full inventory before creating |
| **Terminology** | Generic/inconsistent | Uses official entity names from ontology |
| **Performance learning** | Hope-based | Informed by actual conversion data |
| **Gap identification** | Manual analysis | Automated funnel/audience coverage analysis |
| **Brand voice** | Generic AI tone | Matches high-performing content patterns |
| **Publishing** | Manual copy/paste to CMS | Direct push to DA via API |
| **Feedback loop** | None | Performance feeds back to improve future output |

---

## Implementation Roadmap

### Phase 1: Core Plugin (Week 1-2)
- [ ] Implement ontology-query skill
- [ ] Implement brand-guidelines skill
- [ ] Local context caching in .context/
- [ ] Basic folder structure setup

### Phase 2: Performance Integration (Week 3-4)
- [ ] Implement performance-insights skill
- [ ] RUM data ingestion pipeline
- [ ] Quality benchmarking

### Phase 3: DA Connector (Week 5-6)
- [ ] Implement da-connector skill
- [ ] Markdown → DA HTML conversion
- [ ] Publish workflow with approval gates

### Phase 4: Chrome Integration (Week 7-8)
- [ ] Handoff to Chrome for visual editing
- [ ] Preview integration
- [ ] Publish confirmation flow

### Phase 5: Feedback Loop (Ongoing)
- [ ] Automated performance ingestion
- [ ] Ontology enrichment from new content
- [ ] Quality score tracking for AI-generated content

---

## Resources

- **Claude Cowork:** https://claude.com/blog/cowork-research-preview
- **Cowork Plugins:** https://sherwood.news/markets/claude-coworks-plug-ins-the-newest-reason-for-software-stocks-to-crater/
- **DA Admin API:** https://opensource.adobe.com/da-admin/
- **DA Documentation:** https://docs.da.live/
- **EDS RUM:** https://www.aem.live/developer/rum
- **Cloudflare D1:** https://developers.cloudflare.com/d1/
