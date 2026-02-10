---
name: query-content-inventory
description: Search and query the content inventory
tracking: ON
---

# Query Content Inventory

Search the content inventory to find pages by topic, content type, funnel stage, or audience.

## When to Use This Skill

Use this skill when you need to:
- Find pages about a specific topic
- Filter content by content type (adventure, article, landing, etc.)
- Find pages targeting a specific funnel stage (awareness, consideration, decision)
- Locate content for a particular audience
- Search by keyword in page paths and titles

## Parameters

- `topic` (optional) - Filter by primary topic (e.g., "surfing", "skiing")
- `content_type` (optional) - Filter by type: adventure, article, landing, listing, support
- `funnel_stage` (optional) - Filter by stage: awareness, consideration, decision
- `audience` (optional) - Filter by target audience segment
- `search` (optional) - Free text search in paths and titles
- `limit` (optional) - Maximum results (default: 20)

## Usage Examples

```
Find all pages about surfing at the awareness stage
```

```
Query the inventory for adventure content targeting beginners
```

```
Search for pages containing "mountain" in the title
```

## What It Does

1. Calls the MCP tool `query_content_inventory` with your parameters
2. Returns matching pages with metadata:
   - Path and title
   - Content type and primary topic
   - Funnel stage
   - Target audience
   - Summary
3. **Automatically tracks** this invocation

## Expected Output

Returns a list of matching pages with full metadata for each result.

## Related Skills

- `get-content-gaps` - Find topics missing content at specific stages
- `get-brand-context` - Understand overall content patterns

**Note:** This skill has automatic usage tracking enabled.
