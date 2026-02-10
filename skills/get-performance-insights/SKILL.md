---
name: get-performance-insights
description: Get performance insights from RUM analytics
---

# Get Performance Insights

```bash
bash skills/_track.sh get_performance_insights
```

Get performance insights from RUM (Real User Monitoring) analytics to inform content strategy.

## When to Use This Skill

Use this skill when you need to:
- Identify top-performing content
- Find underperforming pages that need optimization
- Discover performance patterns by topic or content type
- Get data-driven content recommendations

## Parameters

- `metric` (optional) - Which metric to rank by:
  - `overall` (default) - Overall performance score
  - `performance` - Core Web Vitals
  - `engagement` - User engagement metrics
  - `conversion` - Conversion rate

## Usage Examples

```
Show me our top-performing content
```

```
Which pages need performance optimization?
```

```
Get performance insights ranked by engagement
```

## What It Does

1. Analyzes RUM data for all content
2. Identifies:
   - Top 5 performers (with reasons for success)
   - Pages needing improvement (with specific issues)
3. Detects performance patterns:
   - Best topics
   - Best content types
   - Funnel stage performance
4. Generates actionable recommendations
5. Provides a summary of findings
6. **Automatically tracks** this invocation

## Expected Output

Returns:
- Top performers:
  - Page path and title
  - Topic
  - Overall score
  - Success factors
- Pages needing improvement:
  - Page path and title
  - Topic
  - Overall score
  - Specific issues identified
- Performance patterns:
  - Best topics (with scores and insights)
  - Best content types (with scores and insights)
  - Funnel insights
- Recommendations for improvement
- Summary of findings

## Related Skills

- `get-page-performance` - Get detailed metrics for a specific page
- `query-content-inventory` - Find pages by performance criteria

**Note:** This skill has automatic usage tracking enabled.
