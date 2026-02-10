# Tracking Integration Guide

This guide explains how skill usage tracking works in the Enterprise Content Ontology plugin.

## 🎯 Overview

Every skill automatically tracks its usage for analytics. This helps us understand:
- **Usage patterns** - Which skills are most popular
- **Reliability** - Success/failure rates per skill
- **Performance** - Execution time metrics
- **User engagement** - DAU/WAU trends

## ✅ Quick Start: Add Tracking to a Skill

Adding tracking takes **30 seconds** and requires only **2 lines of code**.

### Step 1: Add the Bash Block

In your skill's `SKILL.md` file, add this bash block right after the skill title:

```markdown
---
name: my-skill-name
description: What this skill does
---

# My Skill Name

```bash
bash skills/_track.sh my_skill_name
```

Your skill description here...
```

### Step 2: Name It Correctly

Use **snake_case** (underscores) for the tool name:
- ✅ `my_skill_name`
- ✅ `export_content_report`
- ✅ `get_brand_context`
- ❌ `my-skill-name` (hyphens not recommended)

That's it! 🎉

## 📋 Full Example

```markdown
---
name: export-content-report
description: Export content inventory as CSV report
---

# Export Content Report

```bash
bash skills/_track.sh export_content_report
```

Export the entire content inventory as a downloadable CSV file with all metadata including topics, audiences, and funnel stages.

## When to Use This Skill

Use this skill when you need to:
- Download the full content inventory
- Share content data with stakeholders
- Import content into external tools
```

## 🏗️ How It Works

```
Skill Invoked
    ↓
Claude reads SKILL.md
    ↓
Bash block executes automatically
    ↓
skills/_track.sh sends data to API
    ↓
API logs event to D1 database
    ↓
Dashboard displays analytics
```

### Technical Flow

1. **Execution**: When Claude processes the skill, it executes the bash block
2. **Helper Script**: `skills/_track.sh` sends a POST request to the tracking API
3. **API Endpoint**: `https://content-ontology.philipp-koch.workers.dev/api/track`
4. **Database**: Event logged to Cloudflare D1 (`skill_usage_events` table)
5. **Dashboard**: Real-time analytics at [skill-analytics.pages.dev](https://skill-analytics.pages.dev)

### What Gets Tracked

```json
{
  "tool_name": "my_skill_name",
  "duration_ms": 100,
  "status": "success",
  "tool_category": "cms_ontology",
  "timestamp": "2026-02-10 20:13:31",
  "user_id_hash": "sha256_hash_of_user_id"
}
```

## 📊 Viewing Analytics

Visit the dashboard to see:

- **Summary Cards**
  - Total invocations
  - Unique users
  - Success rate
  - Average duration

- **Charts**
  - Most-used skills (bar chart)
  - Success vs error rates (doughnut)
  - Daily active users trend (line chart)

- **Error Log**
  - Recent errors with timestamps
  - Error types and messages
  - Tool names for debugging

**Dashboard URL**: [https://skill-analytics.pages.dev](https://skill-analytics.pages.dev)

## 🔧 Advanced Configuration

### Environment Variables (Optional)

Set `CONTENT_ONTOLOGY_API_KEY` for authenticated tracking:

```bash
export CONTENT_ONTOLOGY_API_KEY="your-api-key-here"
```

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
echo 'export CONTENT_ONTOLOGY_API_KEY="your-api-key"' >> ~/.zshrc
source ~/.zshrc
```

> **Note**: Currently optional - API doesn't enforce authentication yet.

### Custom Tracking Script

The helper script at `skills/_track.sh`:

```bash
#!/bin/bash
# Skill usage tracking helper
# Usage: bash skills/_track.sh <tool_name>

TOOL_NAME=$1

curl -X POST "https://content-ontology.philipp-koch.workers.dev/api/track" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CONTENT_ONTOLOGY_API_KEY}" \
  -d "{\"tool_name\":\"$TOOL_NAME\",\"duration_ms\":100,\"status\":\"success\",\"tool_category\":\"cms_ontology\"}" \
  2>/dev/null &
```

**Key Features:**
- Runs in background (`&`)
- Fails silently (`2>/dev/null`)
- Non-blocking (doesn't slow down skills)
- Centralized (one place to update tracking logic)

## ⚠️ Important Notes

### Claude Code vs Cowork

- ✅ **Claude Code**: Tracking works perfectly (no restrictions)
- ❌ **Cowork**: Currently doesn't work due to proxy allowlist blocking external domains

If you need tracking in Cowork, consider implementing server-side MCP tracking instead.

### Privacy & Security

- **No PII stored** - No emails, names, or personal data
- **Hashed user IDs** - SHA-256 hashed (cannot be reversed)
- **IP-based fallback** - Uses IP + User-Agent only if no session ID
- **GDPR-compliant** - With proper retention policies (recommend 90 days)

### Performance Impact

- **Zero impact** - Tracking runs in background
- **Fail-silent** - Skills work even if tracking is down
- **No blocking** - Doesn't slow down skill execution

## 🆘 Troubleshooting

### Tracking not appearing in dashboard?

**1. Test the API endpoint directly:**
```bash
curl -X POST "https://content-ontology.philipp-koch.workers.dev/api/track" \
  -H "Content-Type: application/json" \
  -d '{"tool_name":"test","duration_ms":100,"status":"success","tool_category":"cms_ontology"}'
```

Expected response: `{"success":true,"message":"Event tracked"}`

**2. Check the database:**
```bash
wrangler d1 execute content-ontology --command \
  "SELECT tool_name, status, timestamp FROM skill_usage_events ORDER BY timestamp DESC LIMIT 10" \
  --remote
```

**3. Verify bash block syntax:**
```markdown
```bash
bash skills/_track.sh tool_name
```
```

Make sure:
- Triple backticks are present
- `bash` language identifier is included
- Path is `skills/_track.sh` (not `./skills/_track.sh`)
- Tool name uses underscores (not hyphens)

**4. Check skill is being invoked:**

If the skill itself isn't being used, tracking won't trigger. Test by manually invoking the skill in Claude Code.

## 📚 Resources

- **Skills Documentation**: [skills/README.md](skills/README.md)
- **Skill Template**: [skills/_TEMPLATE/SKILL.md](skills/_TEMPLATE/SKILL.md)
- **Track-Skills Framework**: [track-skills/README.md](track-skills/README.md)
- **Dashboard**: [https://skill-analytics.pages.dev](https://skill-analytics.pages.dev)
- **API Documentation**: [track-skills/docs/API.md](track-skills/docs/API.md)

## 🤝 Contributing

When creating a new skill:

1. ✅ Copy `skills/_TEMPLATE/SKILL.md` as starting point
2. ✅ Add tracking bash block (see Step 1 above)
3. ✅ Use snake_case for tool name
4. ✅ Write clear documentation
5. ✅ Test the skill in Claude Code
6. ✅ Verify tracking appears in dashboard

## 💡 Tips

- **Consistent naming** - Match tool_name to skill name (use underscores)
- **Keep it simple** - Don't modify the tracking bash block
- **Test early** - Verify tracking works before finalizing skill
- **Use template** - Start from `_TEMPLATE/SKILL.md` for consistency

---

**Need help?** Open an issue or check the [track-skills documentation](track-skills/README.md).
