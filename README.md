# Enterprise Content Ontology

An AI-powered content intelligence platform for Adobe Edge Delivery Services (DA.live).

## Overview

This project builds an **Enterprise Content Ontology** that:
1. Crawls your DA.live content repository
2. Extracts structured metadata using AI (topics, entities, audiences)
3. Stores it in Cloudflare D1 for fast querying
4. Integrates with Claude Cowork for AI-assisted content operations
5. Closes the loop with performance data from RUM/Analytics

**The value:** Enterprise Context is what transforms generic AI output into 80% first drafts that are actually useful. Without it, AI generates garbage. With it, AI generates content consistent with your brand, terminology, and proven patterns.

## Quick Start

### Prerequisites

- Node.js 18+
- DA.live repository with content
- Cloudflare account (for D1 database)
- Anthropic API key (for Phase 2 AI analysis)

### Installation

```bash
cd cms-ontology
npm install
```

### Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# DA Admin API
DA_AUTH_TOKEN=your_token

# Cloudflare
CLOUDFLARE_API_TOKEN=your_token
CLOUDFLARE_ACCOUNT_ID=20d334d5ba35350f096dc007d7d0fa0d
D1_DATABASE_ID=e6c6614f-030b-4451-8a70-45de3481bde2

# Claude API (Phase 2)
ANTHROPIC_API_KEY=your_key
```

### Crawl Your Content

```bash
# Crawl a DA repository
node tools/crawl-da-inventory.js <org> <repo>

# Example
node tools/crawl-da-inventory.js adobe my-site
```

### Query the Ontology

```bash
# Show database statistics
node tools/query-ontology.js stats

# List all pages
node tools/query-ontology.js pages

# Search for content
node tools/query-ontology.js search "cloud"
```

## Project Structure

```
cms-ontology/
├── docs/
│   ├── DA-Content-Inventory-Ontology.md  # Technical architecture
│   ├── Cowork-Integration-Strategy.md    # Claude Cowork plugin design
│   └── E2E-Implementation-Plan.md        # Full implementation roadmap
│
├── schemas/
│   └── core-schema.sql                   # D1 database schema
│
├── tools/
│   ├── crawl-da-inventory.js             # DA crawler
│   ├── query-ontology.js                 # CLI query tool
│   ├── analyze-content.js                # AI analysis (Phase 2)
│   └── ingest-analytics.js               # RUM ingestion (Phase 4)
│
├── cowork-plugin/                        # Claude Cowork plugin (Phase 3)
│   ├── manifest.json
│   └── skills/
│
└── workers/                              # Cloudflare Workers (Phase 4)
```

## Implementation Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1. Foundation | ✅ Complete | D1 database, crawler, basic queries |
| 2. Intelligence | ✅ Complete | AI extraction of topics, entities, audiences |
| 3. Cowork | ✅ Complete | Claude Cowork plugin with 9 skills |
| 4. Feedback | ✅ Complete | RUM ingestion, performance-informed generation |
| 5. Scale | ✅ Complete | Multi-site support, site filtering |

## Live API

The ontology API is deployed and accessible:

**Base URL:** `https://content-ontology.philipp-koch.workers.dev`

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/summary` | Content inventory overview |
| `/api/query` | Search pages by topic, type, stage |
| `/api/gaps` | Content gap analysis |
| `/api/brief` | Generate content briefs |
| `/api/context` | Brand context and patterns |
| `/api/related` | Find related content |
| `/api/performance` | Page performance data |
| `/api/top-performers` | Best/worst performing pages |
| `/api/performance-patterns` | Performance insights by topic/type |
| `/api/sites` | List and manage sites (multi-site) |

## Cowork Plugin

The plugin provides 9 tools for Claude:

1. **query_content_inventory** - Search by topic, type, stage, audience, site
2. **get_content_gaps** - Find missing funnel stages
3. **generate_content_brief** - Create context-aware briefs
4. **get_brand_context** - Access brand patterns
5. **get_related_content** - Internal linking suggestions
6. **get_performance_insights** - RUM analytics overview
7. **get_page_performance** - Individual page metrics
8. **list_sites** - List all sites in ontology
9. **get_site_details** - Get details for a specific site

## Database Schema

The D1 database contains:

- `pages` - All crawled content with metadata
- `page_topics` - Topic assignments (primary + secondary)
- `entities` - Products, features, concepts, brands
- `page_entities` - Entity mentions per page
- `page_audiences` - Target audience segments
- `page_blocks` - DA blocks used
- `page_links` - Internal link graph
- `page_messages` - Key messages per page
- `crawl_log` - Crawl operation history
- `page_performance` - RUM metrics per page/date
- `page_scores` - Aggregate performance scores
- `performance_patterns` - Insights by topic/type/stage
- `sites` - Multi-site configuration and metadata

## Cloudflare Resources

- **Database Name:** content-ontology
- **Database ID:** e6c6614f-030b-4451-8a70-45de3481bde2
- **Account ID:** 20d334d5ba35350f096dc007d7d0fa0d

## 📊 Skill Analytics

All skills include built-in usage tracking for analytics:

- **Dashboard**: [https://skill-analytics.pages.dev](https://skill-analytics.pages.dev)
- **Integration Guide**: [TRACKING_INTEGRATION.md](./TRACKING_INTEGRATION.md)
- **Skills Documentation**: [skills/README.md](./skills/README.md)

View real-time metrics including invocation counts, success rates, performance, and user engagement.

## Documentation

- [Technical Architecture](./DA-Content-Inventory-Ontology.md)
- [Cowork Integration](./Cowork-Integration-Strategy.md)
- [Implementation Plan](./E2E-Implementation-Plan.md)
- [Tracking Integration Guide](./TRACKING_INTEGRATION.md) - How to add tracking to skills
- [Skills Documentation](./skills/README.md) - All available skills and how to create new ones

## License

MIT
