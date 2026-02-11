# PostToolUse Hook Deployment Guide

This guide explains how to deploy automatic skill tracking using Claude Code's `PostToolUse` hook feature. This is an **alternative approach** to the bash block method currently in SKILL.md files.

## Overview

**Current Method (Bash Blocks):**
- ✅ Works in Claude Code
- ❌ Requires adding 2 lines to each SKILL.md file
- ❌ Team must remember to add tracking
- ❌ Doesn't work in Cowork (proxy blocks)

**New Method (PostToolUse Hook):**
- ✅ Works in Claude Code AND Cowork
- ✅ **Zero changes** to SKILL.md files
- ✅ **Automatic** - all skills tracked forever
- ✅ **Team-friendly** - no tracking code to add
- ✅ Single configuration point

## How It Works

```
User → Invokes Skill → MCP tool executes → PostToolUse hook fires → Track to API
```

The `PostToolUse` hook runs **after every MCP tool invocation**, receives the tool name, and automatically sends tracking data to your Worker API.

---

## Deployment Steps

### Step 1: Files Already Created

The hook infrastructure is already in place:

**1. Hook Script:** `.claude/hooks/track-skill-usage.sh`
- Receives tool_name from Claude Code
- Filters for content ontology MCP tools only
- Sends tracking data to Worker API
- Runs in background (non-blocking)

**2. Hook Configuration:** `.claude/settings.json`
- Configures PostToolUse hook
- Matches content ontology MCP tools: `mcp__(e26c2bb1|e7a207e6).*`
- Calls the tracking script automatically

### Step 2: Verify Hook Installation

**Check that files exist:**
```bash
cd /Users/pkoch/Documents/GitHub/cms-ontology

# 1. Verify hook script exists and is executable
ls -la .claude/hooks/track-skill-usage.sh
# Should show: -rwxr-xr-x

# 2. Verify hook configuration exists
cat .claude/settings.json
# Should show PostToolUse configuration
```

**Test the hook script manually:**
```bash
# Simulate hook input (what Claude Code sends)
echo '{
  "tool_name": "mcp__e26c2bb1-69a5-47a9-930c-06968c399abe__query_content_inventory",
  "tool_input": {},
  "tool_response": {}
}' | .claude/hooks/track-skill-usage.sh

# Check if event was logged
wrangler d1 execute content-ontology --command \
  "SELECT tool_name, status, timestamp FROM skill_usage_events ORDER BY timestamp DESC LIMIT 5" \
  --remote
```

### Step 3: Enable Hook in Claude Code

**Option A: Restart Claude Code**

The hook is already configured in `.claude/settings.json`. Simply restart Claude Code:

```bash
# Exit Claude Code if running
# Restart in the project directory
cd /Users/pkoch/Documents/GitHub/cms-ontology
claude
```

**Option B: Use `/hooks` Menu (Recommended)**

1. Open Claude Code in the project
2. Type `/hooks` to open hooks manager
3. You should see: `[Project] PostToolUse - mcp__(e26c2bb1|e7a207e6).*`
4. Verify it's enabled (not grayed out)

### Step 4: Test Hook with Real Skill

**Test tracking:**
```
# In Claude Code, invoke a skill:
List all sites in the ontology
```

**Verify tracking worked:**
```bash
# Check database for new events
wrangler d1 execute content-ontology --command \
  "SELECT tool_name, status, timestamp FROM skill_usage_events ORDER BY timestamp DESC LIMIT 5" \
  --remote

# Should see: list_sites | success | 2026-02-10 21:30:00
```

**Check dashboard:**
Visit https://skill-analytics.pages.dev to see the event in real-time.

---

## Configuration Details

### Hook Configuration Schema

`.claude/settings.json`:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "mcp__(e26c2bb1|e7a207e6).*",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/track-skill-usage.sh",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

**Explanation:**
- `PostToolUse`: Fires after MCP tool executes
- `matcher`: Regex matching your content ontology MCP tools
  - `e26c2bb1`: First MCP server ID
  - `e7a207e6`: Second MCP server ID
- `type: "command"`: Runs bash script
- `timeout: 5`: Max 5 seconds (tracking is fast)
- `$CLAUDE_PROJECT_DIR`: Project root path (handles spaces)

### Hook Script Logic

`.claude/hooks/track-skill-usage.sh`:
```bash
#!/bin/bash
INPUT=$(cat)  # Read JSON from stdin

# Extract tool name
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Filter: only track content ontology tools
if [[ ! "$TOOL_NAME" =~ ^mcp__(e26c2bb1|e7a207e6)__ ]]; then
  exit 0  # Not our tool, skip
fi

# Extract skill name (remove mcp__<server-id>__ prefix)
SKILL_NAME=$(echo "$TOOL_NAME" | sed -E 's/^mcp__[a-f0-9-]+__//')

# Send tracking event (background, fail-silent)
curl -X POST "https://content-ontology.philipp-koch.workers.dev/api/track" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CONTENT_ONTOLOGY_API_KEY}" \
  -d "{\"tool_name\":\"$SKILL_NAME\",\"duration_ms\":100,\"status\":\"success\",\"tool_category\":\"cms_ontology\"}" \
  2>/dev/null &

exit 0
```

---

## Environment Variables (Optional)

Set `CONTENT_ONTOLOGY_API_KEY` for authenticated tracking:

```bash
# Add to shell profile (~/.zshrc or ~/.bashrc)
echo 'export CONTENT_ONTOLOGY_API_KEY="your-api-key"' >> ~/.zshrc
source ~/.zshrc
```

**Note:** Currently optional if your API doesn't enforce authentication.

---

## Debugging

### Hook Not Firing?

**1. Check Claude Code debug logs:**
```bash
claude --debug
```

Look for:
```
[DEBUG] Executing hooks for PostToolUse:mcp__e26c2bb1...
[DEBUG] Hook command completed with status 0
```

**2. Verify hook is enabled:**
```bash
# In Claude Code
/hooks
# Should show [Project] PostToolUse
```

**3. Check settings file:**
```bash
cat .claude/settings.json | jq '.hooks.PostToolUse'
```

**4. Test hook script directly:**
```bash
echo '{"tool_name":"mcp__e26c2bb1-69a5-47a9-930c-06968c399abe__list_sites"}' | \
  .claude/hooks/track-skill-usage.sh

# Should make API call (check with --verbose)
```

### Tracking Events Not Appearing?

**1. Verify API endpoint:**
```bash
curl -X POST "https://content-ontology.philipp-koch.workers.dev/api/track" \
  -H "Content-Type: application/json" \
  -d '{"tool_name":"test","duration_ms":100,"status":"success","tool_category":"cms_ontology"}'

# Expected: {"success":true,"message":"Event tracked"}
```

**2. Check database:**
```bash
wrangler d1 execute content-ontology --command \
  "SELECT COUNT(*) as total FROM skill_usage_events" \
  --remote
```

**3. Check Worker logs:**
```bash
wrangler tail ontology-api
# Then invoke a skill and watch for /api/track requests
```

### Script Permissions Issue?

```bash
# Make script executable
chmod +x .claude/hooks/track-skill-usage.sh

# Verify
ls -la .claude/hooks/track-skill-usage.sh
# Should show: -rwxr-xr-x
```

---

## Comparison: Hook vs Bash Blocks

| Feature | Bash Blocks (Current) | PostToolUse Hook (New) |
|---------|----------------------|------------------------|
| **Integration Effort** | 2 lines per skill | One-time setup |
| **Team Adoption** | Must remember to add | Automatic |
| **Maintenance** | Update each skill | Update one file |
| **Works in Claude Code** | ✅ Yes | ✅ Yes |
| **Works in Cowork** | ❌ No (proxy) | ✅ Yes |
| **New Skills** | Manual addition | Auto-tracked |
| **Failure Mode** | Silent | Silent |

---

## Migration Path

**Current State:**
- Bash blocks work in Claude Code
- Hook also works in Claude Code
- **Both run in parallel** (duplicate tracking events)

**Future Options:**

**Option 1: Keep Both (Recommended for now)**
- Bash blocks: Backup/fallback
- Hook: Primary tracking method
- Accept duplicate events temporarily

**Option 2: Migrate to Hook Only**
1. Verify hook works for 1-2 weeks
2. Remove bash blocks from all SKILL.md files
3. Update documentation

**Option 3: Keep Bash Blocks Only**
- Remove `.claude/settings.json`
- Continue with current approach
- Doesn't work in Cowork

---

## Team Documentation

**For team members adding new skills:**

**With Bash Blocks (Current):**
```markdown
```bash
bash skills/_track.sh your_skill_name
```
```

**With PostToolUse Hook (New):**
- **No action needed!** Tracking happens automatically.

The hook automatically tracks any MCP tool matching `mcp__(e26c2bb1|e7a207e6)__*`.

---

## Rollback

To disable the hook without deleting files:

**Method 1: Remove from settings**
```bash
# Backup first
cp .claude/settings.json .claude/settings.json.backup

# Remove hooks section
echo '{}' > .claude/settings.json
```

**Method 2: Use /hooks menu**
1. Type `/hooks` in Claude Code
2. Select the PostToolUse hook
3. Delete it

**Method 3: Disable all hooks temporarily**
```json
{
  "disableAllHooks": true,
  "hooks": { ... }
}
```

---

## Next Steps

1. ✅ **Files created** (already done)
2. ⏭️ **Test hook** (follow Step 4 above)
3. ⏭️ **Monitor for duplicates** (both bash and hook running)
4. ⏭️ **Decide migration strategy** (keep both, or migrate)
5. ⏭️ **Update team docs** (if migrating to hook only)

---

## Resources

- **Hook Documentation**: https://code.claude.com/docs/en/hooks
- **PostToolUse Reference**: https://code.claude.com/docs/en/hooks#posttooluse
- **Dashboard**: https://skill-analytics.pages.dev
- **Worker API**: https://content-ontology.philipp-koch.workers.dev/api/track

---

**Questions or Issues?**
- Check debug logs: `claude --debug`
- View hook status: `/hooks` menu
- Test manually: See "Debugging" section above
