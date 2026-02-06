# Enterprise Content Ontology - Demo Walkthrough

This guide demonstrates how to use the Content Ontology system with Claude to create context-aware content.

## The Vision

> "Enterprise Context is what transforms generic AI output into 80% first drafts that are actually useful. Without it, AI generates garbage. With it, AI generates content consistent with your brand, terminology, and proven patterns."

## Live System

**API:** `https://content-ontology.philipp-koch.workers.dev`
**Database:** 25 pages | 14 topics | 31 entities | 12 performance patterns

---

## Demo Scenarios

### Scenario 1: Content Gap Discovery

**Goal:** Find what content is missing from your site.

```bash
# What topics are missing decision-stage content?
curl -s "https://content-ontology.philipp-koch.workers.dev/api/gaps" | jq '.gaps[] | select(.priority == "high") | {topic, missing: .missing_stages}'
```

**Result:**
```json
{"topic": "cycling", "missing": ["awareness", "decision"]}
{"topic": "rock climbing", "missing": ["awareness", "decision"]}
{"topic": "food and wine", "missing": ["awareness", "decision"]}
```

**Insight:** Cycling has 3 consideration pages but zero awareness or decision content. This is a prime opportunity for content creation.

---

### Scenario 2: Generate a Content Brief

**Goal:** Create a brief for missing cycling awareness content.

```bash
curl -s -X POST https://content-ontology.philipp-koch.workers.dev/api/brief \
  -H "Content-Type: application/json" \
  -d '{"topic":"cycling","content_type":"article","funnel_stage":"awareness"}' | jq .
```

**Result:**
```json
{
  "topic": "cycling",
  "content_type": "article",
  "funnel_stage": "awareness",
  "target_audience": "cyclists",
  "context": {
    "existing_count": 3,
    "existing_pages": [
      {"path": "/us/en/adventures/cycling-tuscany.html", "stage": "consideration"},
      {"path": "/us/en/adventures/cycling-southern-utah.html", "stage": "consideration"},
      {"path": "/us/en/adventures/west-coast-cycling.html", "stage": "consideration"}
    ]
  },
  "recommendations": {
    "title_suggestions": [
      "The Complete Guide to Cycling",
      "Why Cycling Should Be Your Next Adventure",
      "Cycling: What You Need to Know"
    ],
    "key_elements": ["Compelling headline", "Hero image", "Story hook", "Social sharing"],
    "internal_links": [existing cycling pages to link to]
  }
}
```

**Use Case:** Hand this brief to Claude and ask it to write the article. Claude now has context about existing content, brand patterns, and internal linking opportunities.

---

### Scenario 3: Performance-Informed Decisions

**Goal:** Understand what content performs best to replicate those patterns.

```bash
curl -s "https://content-ontology.philipp-koch.workers.dev/api/top-performers?limit=3" | jq .
```

**Result:**
```json
{
  "top_performers": [
    {"title": "FAQs", "score": 60.7, "topic": "customer support"},
    {"title": "Ski Touring Mont Blanc", "score": 58.8, "topic": "skiing"},
    {"title": "Napa Wine Tasting", "score": 58.8, "topic": "food and wine"}
  ],
  "needs_improvement": [
    {"title": "Riverside Camping Australia", "score": 40.8},
    {"title": "Climbing New Zealand", "score": 41.8}
  ],
  "insights": [
    "Best performing content type: support, adventure",
    "Topics needing optimization: camping, rock climbing, craft beer"
  ]
}
```

**Insight:** Food & wine content performs well (57 avg score). When creating new content, analyze what makes Napa Wine Tasting successful and replicate those patterns.

---

### Scenario 4: Find Related Content for Internal Linking

**Goal:** When updating a page, find related content to link to.

```bash
curl -s "https://content-ontology.philipp-koch.workers.dev/api/related?path=/us/en/adventures/tahoe-skiing.html" | jq .
```

**Result:**
```json
{
  "source": {
    "path": "/us/en/adventures/tahoe-skiing.html",
    "title": "Tahoe Skiing",
    "topic": "skiing",
    "funnel_stage": "consideration"
  },
  "related": {
    "same_topic": [
      {"path": "/us/en/adventures/ski-touring-mont-blanc.html", "title": "Ski Touring Mont Blanc"},
      {"path": "/us/en/adventures/downhill-skiing-wyoming.html", "title": "Downhill Skiing Wyoming"},
      {"path": "/us/en/magazine/ski-touring.html", "title": "Ski Touring"}
    ]
  }
}
```

---

### Scenario 5: Brand Context for Consistent Content

**Goal:** Understand brand patterns before writing new content.

```bash
curl -s "https://content-ontology.philipp-koch.workers.dev/api/context?aspect=all" | jq .
```

**Result:**
```json
{
  "topics": [
    {"topic": "skiing", "count": 4},
    {"topic": "surfing", "count": 4},
    {"topic": "cycling", "count": 3}
  ],
  "audiences": [
    {"audience": "cyclists", "count": 3},
    {"audience": "climbers", "count": 2},
    {"audience": "surfers", "count": 2}
  ],
  "entities": [
    {"name": "Bali", "type": "location"},
    {"name": "surfing", "type": "activity"},
    {"name": "California", "type": "location"}
  ],
  "content_types": [
    {"content_type": "adventure", "count": 16},
    {"content_type": "article", "count": 5}
  ]
}
```

---

## Using with Claude Cowork

When the plugin is installed, Claude can:

### 1. Answer Content Strategy Questions

**User:** "What content should we create next?"

**Claude:** *Uses get_content_gaps and get_performance_insights*

> Based on the ontology, I recommend creating:
> 1. **Cycling awareness article** - You have 3 consideration pages but no top-of-funnel content
> 2. **Rock climbing awareness article** - Same gap, plus it's underperforming (44.2 score)
> 3. **Decision-stage content for surfing** - Good awareness/consideration but no booking support

### 2. Generate Contextual Content

**User:** "Write an awareness article about cycling"

**Claude:** *Uses generate_content_brief and get_brand_context*

> Here's a draft based on your brand patterns...
>
> [Article that links to Tuscany, Utah, and West Coast cycling adventures]
> [Uses terminology and topics consistent with existing content]
> [Includes CTAs that guide to consideration-stage content]

### 3. Optimize Underperformers

**User:** "How can we improve the Climbing New Zealand page?"

**Claude:** *Uses get_page_performance and get_related_content*

> The page scores 41.8 overall. Issues:
> - Low engagement (56 score) - Add more compelling visuals
> - Slow performance (62 score) - Optimize images
>
> Consider linking to Colorado Rock Climbing (similar content, better performance at 46.6) to keep users engaged.

---

## The Feedback Loop

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌──────────────┐    ┌──────────────┐    ┌─────────────┐  │
│   │   Content    │    │     AI       │    │   Visual    │  │
│   │   Ontology   │───▶│  Generation  │───▶│  Refinement │  │
│   │  (Context)   │    │   (Claude)   │    │    (AEM)    │  │
│   └──────────────┘    └──────────────┘    └──────────────┘  │
│          ▲                                       │          │
│          │                                       ▼          │
│   ┌──────────────┐                        ┌─────────────┐   │
│   │  Performance │◀───────────────────────│   Publish   │   │
│   │   Patterns   │         RUM Data       │             │   │
│   └──────────────┘                        └─────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**The value:** Every piece of content generated is informed by:
1. What content already exists (avoid duplication)
2. What's missing (fill gaps strategically)
3. What performs well (replicate success patterns)
4. What needs optimization (improve underperformers)

---

## Quick Start Commands

```bash
# Get system overview
curl -s https://content-ontology.philipp-koch.workers.dev/api/summary | jq .

# Find content gaps
curl -s https://content-ontology.philipp-koch.workers.dev/api/gaps | jq '.gaps[:5]'

# Search for content
curl -s "https://content-ontology.philipp-koch.workers.dev/api/query?topic=surfing" | jq .

# Generate a brief
curl -s -X POST https://content-ontology.philipp-koch.workers.dev/api/brief \
  -H "Content-Type: application/json" \
  -d '{"topic":"cycling","content_type":"article","funnel_stage":"awareness"}' | jq .

# Get top performers
curl -s "https://content-ontology.philipp-koch.workers.dev/api/top-performers?limit=5" | jq .

# Get performance patterns
curl -s https://content-ontology.philipp-koch.workers.dev/api/performance-patterns | jq .
```

---

## Next Steps

1. **Install the Cowork Plugin** - Add `cowork-plugin/manifest.json` to Claude Cowork
2. **Crawl Your Content** - Run `node tools/crawl-da-inventory.js <org> <repo>`
3. **Analyze with AI** - Run `node tools/analyze-content.js`
4. **Ingest RUM Data** - Run `node tools/ingest-rum.js`
5. **Start Creating** - Ask Claude about your content strategy!
