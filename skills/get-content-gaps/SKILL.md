---
name: get-content-gaps
description: Identify content gaps by analyzing topic coverage
---

# Get Content Gaps

```bash
bash skills/_track.sh get_content_gaps
```

Identify content gaps in the inventory by analyzing topic coverage across funnel stages.

## When to Use This Skill

Use this skill when you need to:
- Find topics that need more content
- Identify missing funnel stage coverage
- Prioritize content creation efforts
- Discover underserved topics

## Parameters

- `topic` (optional) - Analyze gaps for a specific topic only
- `funnel_stage` (optional) - Find topics missing this specific stage

## Usage Examples

```
Show me content gaps in our inventory
```

```
What topics are missing awareness-stage content?
```

```
Analyze content gaps for the topic "cycling"
```

## What It Does

1. Analyzes your content inventory for coverage patterns
2. Identifies topics with incomplete funnel stage coverage
3. Prioritizes gaps (high-priority = popular topics with missing stages)
4. Returns recommendations for content creation
5. **Automatically tracks** this invocation

## Expected Output

Returns a list of content gaps with:
- Topic name
- Priority (high/medium/low)
- Existing page count
- Coverage percentage
- Missing funnel stages
- Specific recommendations

## Related Skills

- `query-content-inventory` - See existing content for a topic
- `generate-content-brief` - Create briefs to fill identified gaps

**Note:** This skill has automatic usage tracking enabled.
