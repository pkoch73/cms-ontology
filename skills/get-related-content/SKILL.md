---
name: get-related-content
description: Find content related to a specific page
tracking: ON
---

# Get Related Content

Find content related to a specific page or topic, useful for internal linking and content clusters.

## When to Use This Skill

Use this skill when you need to:
- Find pages to link from a specific page
- Build topic clusters
- Discover related content for internal linking
- Understand content relationships

## Parameters

- `path` (required) - The page path to find related content for
- `relationship` (optional) - Type of relationship:
  - `same_topic` - Pages about the same topic
  - `same_audience` - Pages for the same audience
  - `same_funnel_stage` - Pages at the same funnel stage
  - `all` (default) - All relationship types

## Usage Examples

```
Find content related to /adventures/surfing-costa-rica
```

```
Show me pages with the same topic as /articles/beginners-guide-skiing
```

```
Get linking suggestions for /magazine/mountain-biking-essentials
```

## What It Does

1. Analyzes the specified page
2. Finds related content by:
   - Same topic
   - Same funnel stage
   - Same target audience
3. Generates linking suggestions with:
   - Target pages
   - Linking rationale
   - Suggested anchor text
4. Identifies topic cluster opportunities
5. **Automatically tracks** this invocation

## Expected Output

Returns:
- Source page information
- Related pages grouped by relationship type:
  - By topic (with link context)
  - By funnel stage (with link context)
  - By audience (with link context)
- Linking suggestions:
  - Target pages
  - Rationale for linking
  - Suggested anchor text
  - Cluster opportunities

## Related Skills

- `query-content-inventory` - Find pages to analyze
- `get-brand-context` - Understand overall content structure

**Note:** This skill has automatic usage tracking enabled.
