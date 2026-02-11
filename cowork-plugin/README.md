# Enterprise Content Ontology - Cowork Plugin

AI-powered content intelligence for Adobe Edge Delivery Services, integrated with Claude Cowork.

## Overview

This plugin provides Claude with access to your content inventory, enabling:

- **Content Discovery**: Search pages by topic, type, audience, or funnel stage
- **Gap Analysis**: Identify missing content across the customer journey
- **Brief Generation**: Create context-aware content briefs using ontology data
- **Brand Context**: Access brand voice, terminology, and content patterns
- **Related Content**: Find linked content for internal linking strategies
- **Automatic Tracking**: Built-in usage analytics via PostToolUse hook (zero configuration)

## Installation

### 1. Deploy the API Worker

```bash
cd workers/ontology-api
npm install -g wrangler
wrangler login
wrangler deploy
```

### 2. Set API Key (Optional)

```bash
wrangler secret put API_KEY
```

### 3. Install Plugin in Cowork

1. Open Claude Cowork
2. Go to Settings → Plugins
3. Click "Add Plugin"
4. Enter the manifest URL or upload `manifest.json`
5. Configure the API key if required

## Available Tools

### query_content_inventory

Search and filter the content inventory.

```json
{
  "topic": "surfing",
  "content_type": "adventure",
  "funnel_stage": "consideration",
  "limit": 10
}
```

### get_content_gaps

Identify topics with missing funnel stages.

```json
{
  "funnel_stage": "decision"
}
```

### generate_content_brief

Create a content brief with ontology context.

```json
{
  "topic": "cycling",
  "content_type": "article",
  "funnel_stage": "awareness",
  "target_audience": "cyclists"
}
```

### get_brand_context

Retrieve brand patterns and terminology.

```json
{
  "aspect": "all"
}
```

### get_related_content

Find content related to a specific page.

```json
{
  "path": "/us/en/adventures/bali-surf-camp.html",
  "relationship": "same_topic"
}
```

## Example Workflows

### Content Gap Filling

1. "What content gaps do we have?"
2. "Generate a brief for a cycling awareness article"
3. "What existing cycling content can I link to?"

### Content Planning

1. "Show me all decision-stage content"
2. "Which topics have the most consideration content but no decision content?"
3. "Create briefs for the top 3 gap priorities"

### Brand Consistency

1. "What's our brand context for adventure content?"
2. "What audiences do we typically target?"
3. "Show me examples of our skiing content"

## Features

### Automatic Usage Tracking

This plugin includes a **PostToolUse hook** that automatically tracks skill usage with zero configuration required. When the plugin is installed:

- ✅ All skill invocations are automatically logged
- ✅ Analytics dashboard shows usage patterns
- ✅ No manual tracking code needed in skills
- ✅ Works in both Claude Code and Cowork

**View Analytics**: [https://skill-analytics.pages.dev](https://skill-analytics.pages.dev)

The tracking hook sends data to the same Worker API endpoint and stores events in D1 for analytics.

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `CONTENT_ONTOLOGY_API_URL` | Worker API endpoint | Yes |
| `CONTENT_ONTOLOGY_API_KEY` | API authentication key (also used for tracking) | No |

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Claude Cowork  │────▶│  Ontology API    │────▶│  Cloudflare D1  │
│     Plugin      │     │  (CF Worker)     │     │    Database     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Development

### Local Testing

```bash
cd workers/ontology-api
wrangler dev
```

### Adding New Skills

1. Create skill file in `skills/`
2. Export handler function
3. Add to `index.js` tools map
4. Update `manifest.json` with tool definition

## License

MIT
