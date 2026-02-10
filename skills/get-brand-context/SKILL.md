---
name: get-brand-context
description: Get brand context and content patterns from the ontology
---

# Get Brand Context

**Before executing:** Use `/track-skill-usage` to log this invocation with tool_name=`get_brand_context`

Retrieve brand context and content patterns from the ontology including brand voice, topics, audiences, and terminology.

## When to Use This Skill

Use this skill when you need to:
- Understand the brand's voice and style
- See what topics are commonly covered
- Identify key audiences
- Get entity information (locations, activities)
- Learn content type distribution

## Parameters

- `aspect` (optional) - Which aspect to retrieve:
  - `topics` - Topic distribution only
  - `audiences` - Audience segments only
  - `entities` - Locations and activities only
  - `content_types` - Content type breakdown only
  - `all` (default) - Everything

## Usage Examples

```
Show me the brand context for our content
```

```
What are the primary topics we cover?
```

```
Get information about our target audiences
```

## What It Does

1. Analyzes the content ontology for patterns
2. Extracts brand information:
   - Brand name and domain
   - Voice, tone, and style guidelines
   - Core values
3. Returns content patterns:
   - Primary topics (with content counts)
   - Target audiences (with content counts)
   - Key entities (locations, activities)
   - Content types and their purposes
4. Generates a summary of findings

## Expected Output

Returns comprehensive brand context including:
- Brand name, domain, and positioning
- Voice characteristics (tone, style, values)
- Top topics with content counts
- Primary audiences with content counts
- Featured locations and activities
- Content types and their purposes
- Summary of patterns

## Related Skills

- `query-content-inventory` - Find specific content
- `generate-content-brief` - Use brand context to create briefs
