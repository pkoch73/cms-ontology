---
name: get-page-performance
description: Get detailed performance data for a specific page
tracking: ON
---

# Get Page Performance

Get detailed performance data for a specific page including Core Web Vitals, engagement metrics, and optimization recommendations.

## When to Use This Skill

Use this skill when you need to:
- Analyze performance of a specific page
- Get Core Web Vitals metrics
- Understand user engagement for a page
- Get specific optimization recommendations
- Track performance trends over time

## Parameters

- `path` (required) - The page path to analyze (e.g., "/adventures/surfing-costa-rica")

## Usage Examples

```
Get performance data for /adventures/surfing-costa-rica
```

```
Analyze the performance of /articles/beginners-guide-skiing
```

```
Show me metrics for /magazine/mountain-biking-essentials
```

## What It Does

1. Retrieves RUM data for the specified page
2. Calculates performance scores:
   - Overall performance score
   - Core Web Vitals score
   - Engagement score
   - Conversion score
3. Provides recent metrics (last 7 data points)
4. Analyzes performance and identifies:
   - Strengths (what's working well)
   - Weaknesses (what needs improvement)
   - Overall status (performing well / average / needs improvement)
5. **Automatically tracks** this invocation

## Expected Output

Returns:
- Page information
- Performance scores:
  - Overall score
  - Performance (Core Web Vitals)
  - Engagement
  - Conversion
- Recent metrics trend (last 7 periods)
- Analysis:
  - Status (performing well, average, needs improvement)
  - Strengths (e.g., "Fast loading times", "Good user engagement")
  - Weaknesses (e.g., "Page speed optimization needed", "Add clearer CTAs")

## Related Skills

- `get-performance-insights` - See overall performance patterns
- `query-content-inventory` - Find similar pages to compare

**Note:** This skill has automatic usage tracking enabled.
