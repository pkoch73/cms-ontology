# Skills Documentation

This directory contains all the skills for the Enterprise Content Ontology plugin.

## 📊 Available Skills

- `query-content-inventory` - Search and query the content inventory
- `list-sites` - List all sites in the content ontology
- `get-content-gaps` - Identify content gaps by topic and funnel stage
- `generate-content-brief` - Generate context-aware content briefs
- `get-brand-context` - Get brand context and content patterns
- `get-related-content` - Find content related to a specific page
- `get-performance-insights` - Get performance insights from RUM analytics
- `get-page-performance` - Get detailed performance data for a specific page
- `get-inventory-summary` - Get a summary of the content inventory

## ✅ Adding Tracking to a New Skill

**Every skill should track its usage for analytics.** This helps us understand:
- Which skills are used most
- Success/failure rates
- Performance metrics
- User engagement

### How to Add Tracking (2 Steps)

**Step 1:** Add the tracking bash block after your skill description:

```markdown
---
name: your-skill-name
description: Brief description
---

# Your Skill Name

```bash
bash skills/_track.sh your_skill_name
```

Your skill description here...
```

**Step 2:** Use snake_case for the tool name (e.g., `export_content_report`, `get_brand_context`)

### Example

For a skill named `export-content-report`:

```markdown
---
name: export-content-report
description: Export content inventory as CSV report
---

# Export Content Report

```bash
bash skills/_track.sh export_content_report
```

Export the content inventory as a downloadable CSV file with all metadata.
```

That's it! The tracking happens automatically when the skill runs in Claude Code.

## 🎯 Tracking Details

### What Gets Tracked

- **Tool name** - Which skill was invoked
- **Duration** - How long it took (currently 100ms placeholder)
- **Status** - Success or error
- **Timestamp** - When it was invoked
- **User hash** - Privacy-preserving user identifier

### Where Data Goes

- **Database**: Cloudflare D1 (`content-ontology` database)
- **API**: `https://content-ontology.philipp-koch.workers.dev/api/track`
- **Dashboard**: [https://skill-analytics.pages.dev](https://skill-analytics.pages.dev)

### How It Works

1. Bash block executes when Claude reads the SKILL.md file
2. Helper script (`skills/_track.sh`) sends data to tracking API
3. API logs event to D1 database
4. Dashboard queries analytics endpoints for visualization

### Privacy

- No personal information is stored
- User IDs are SHA-256 hashed
- IP-based fallback for consistent tracking
- GDPR-compliant with proper retention policies

## 📝 Skill Template

Use this template when creating new skills:

```markdown
---
name: your-skill-name
description: One-line description of what this skill does
---

# Your Skill Name

```bash
bash skills/_track.sh your_skill_name
```

Brief description of the skill and what it does.

## When to Use This Skill

Use this skill when you need to:
- First use case
- Second use case
- Third use case

## Parameters

- `param1` (optional) - Description of parameter
- `param2` (required) - Description of parameter

## Usage Examples

```
Natural language example of how to invoke this skill
```

```
Another example with different parameters
```

## What It Does

1. Step-by-step explanation
2. Of what the skill does
3. When it's invoked

## Expected Output

Description or example of what the skill returns.

## Related Skills

- `other-skill-name` - How it relates
- `another-skill` - How it relates
```

## 🔧 Technical Details

### Helper Script Location

`skills/_track.sh` - Centralized tracking logic

### Tracking Endpoint

POST `https://content-ontology.philipp-koch.workers.dev/api/track`

**Request Body:**
```json
{
  "tool_name": "skill_name",
  "duration_ms": 100,
  "status": "success",
  "tool_category": "cms_ontology"
}
```

### Environment Variables

- `CONTENT_ONTOLOGY_API_KEY` (optional) - API authentication token

Currently not required, but can be set for authenticated tracking in the future.

## ⚠️ Important Notes

1. **Claude Code Only**: Tracking currently works in Claude Code CLI, not in Cowork (due to proxy restrictions)
2. **Non-Blocking**: Tracking runs in background and fails silently if unavailable
3. **No Impact on Skills**: Skills work normally even if tracking endpoint is down
4. **Consistent Naming**: Use snake_case for tool names (e.g., `my_skill_name`)

## 📊 Viewing Analytics

Visit the dashboard to see:
- Total invocations across all skills
- Most-used skills (bar chart)
- Success/error rates (doughnut chart)
- Daily active users trend (line chart)
- Recent errors with details

Dashboard: [https://skill-analytics.pages.dev](https://skill-analytics.pages.dev)

## 🆘 Troubleshooting

### Tracking not showing up?

1. **Check network access**: Test the endpoint directly
   ```bash
   curl -X POST "https://content-ontology.philipp-koch.workers.dev/api/track" \
     -H "Content-Type: application/json" \
     -d '{"tool_name":"test","duration_ms":100,"status":"success","tool_category":"cms_ontology"}'
   ```

2. **Verify database**: Check D1 for events
   ```bash
   wrangler d1 execute content-ontology --command \
     "SELECT * FROM skill_usage_events ORDER BY timestamp DESC LIMIT 5" --remote
   ```

3. **Check bash execution**: Make sure the bash block is properly formatted with triple backticks

4. **Tool name**: Ensure tool name matches skill name (use underscores, not hyphens)

## 🤝 Contributing

When adding a new skill:

1. ✅ Copy the template above
2. ✅ Add the tracking bash block
3. ✅ Use descriptive, clear documentation
4. ✅ Include usage examples
5. ✅ List related skills
6. ✅ Test the skill before committing

---

**Questions?** See [track-skills documentation](../track-skills/README.md) for more details on the tracking framework.
