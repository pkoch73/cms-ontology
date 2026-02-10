---
name: generate-content-brief
description: Generate AI-powered content briefs using ontology context
---

# Generate Content Brief

```bash
bash skills/_track.sh generate_content_brief
```

Create AI-powered content briefs based on ontology context, existing content patterns, and brand voice.

## When to Use This Skill

Use this skill when you need to:
- Create a brief for new content
- Get guidance on what to write about a topic
- Understand existing content patterns for a topic
- Get SEO keywords and internal linking suggestions

## Parameters (Required)

- `topic` (required) - The primary topic for the new content
- `content_type` (required) - Type: adventure, article, landing, listing, support

## Parameters (Optional)

- `funnel_stage` (optional) - Target stage: awareness, consideration, decision
- `target_audience` (optional) - Primary audience for the content

## Usage Examples

```
Generate a content brief for an article about surfing at the awareness stage
```

```
Create a brief for a landing page targeting adventure seekers interested in skiing
```

## What It Does

1. Analyzes existing content about the topic
2. Identifies related topics and content patterns
3. Extracts brand voice and terminology
4. Generates recommendations for:
   - Title suggestions
   - Key elements to include
   - Internal links to add
   - SEO keywords
5. Creates a comprehensive content brief
6. **Automatically tracks** this invocation

## Expected Output

Returns a detailed brief including:
- Topic and content type
- Existing content count and pages
- Related topics and audiences
- Key entities (locations, activities)
- Title pattern suggestions
- Recommended key elements
- Internal linking opportunities
- SEO keywords
- Full brief text

## Related Skills

- `get-content-gaps` - Identify what briefs to create first
- `get-brand-context` - Understand brand voice before writing

**Note:** This skill has automatic usage tracking enabled.
