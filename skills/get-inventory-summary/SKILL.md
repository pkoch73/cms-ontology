---
name: get-inventory-summary
description: Get a summary of the content inventory for context
---

# Get Inventory Summary

```bash
bash skills/_track.sh get_inventory_summary
```

Get a high-level summary of the content inventory including total pages, topic distribution, funnel coverage, and key statistics.

## When to Use This Skill

Use this skill when you need to:
- Get an overview of all content
- Understand content distribution
- See how many pages exist total
- Check funnel stage coverage
- Get quick context before detailed analysis

## Parameters

- `site_id` (optional) - Filter summary by site ID (e.g., "wknd")

## Usage Examples

```
Give me a summary of our content inventory
```

```
Show me overall content statistics
```

```
Get inventory summary for the WKND site
```

## What It Does

1. Aggregates content inventory data
2. Calculates key statistics:
   - Total page count
   - Total topics covered
   - Content distribution by funnel stage
   - Content type breakdown
3. Provides summary text describing the inventory
4. **Automatically tracks** this invocation

## Expected Output

Returns:
- Brand and domain information
- Total statistics:
  - Total pages
  - Total topics
- Top topics (with page counts)
- Funnel distribution:
  - Awareness pages count
  - Consideration pages count
  - Decision pages count
- Content type breakdown
- Summary text

## Related Skills

- `query-content-inventory` - Drill down into specific content
- `get-content-gaps` - Identify what's missing
- `list-sites` - See all sites before filtering

**Note:** This skill has automatic usage tracking enabled.
