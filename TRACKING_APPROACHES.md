# Skill Tracking: Two Parallel Approaches

The CMS Ontology plugin supports **two tracking methods** that can run in parallel or independently.

## Quick Comparison

| | Bash Blocks | PostToolUse Hook |
|---|---|---|
| **Setup Complexity** | Low | Medium |
| **Per-Skill Effort** | 2 lines per SKILL.md | Zero (automatic) |
| **Works in Claude Code** | ✅ Yes | ✅ Yes |
| **Works in Cowork** | ❌ No (proxy blocks) | ✅ Yes |
| **Team Adoption** | Manual | Automatic |
| **Documentation** | [TRACKING_INTEGRATION.md](TRACKING_INTEGRATION.md) | [HOOK_TRACKING_DEPLOYMENT.md](HOOK_TRACKING_DEPLOYMENT.md) |

---

## Approach 1: Bash Blocks in SKILL.md

### How It Works
Each SKILL.md file contains a bash code block that executes when Claude reads the skill:

```markdown
---
name: query-content
---

# Query Content

```bash
bash skills/_track.sh query_content
```

Your skill description...
```

### Architecture
```
User → Skill invoked → Claude reads SKILL.md → Bash executes → curl to API
```

### Pros
- ✅ Simple to understand
- ✅ Visible in SKILL.md (self-documenting)
- ✅ Works in Claude Code
- ✅ Already implemented in all skills

### Cons
- ❌ Requires 2 lines per skill
- ❌ Team must remember to add
- ❌ Doesn't work in Cowork (proxy blocks external API)

### Files Involved
- `skills/_track.sh` - Helper script
- Each `skills/*/SKILL.md` - Bash block

### Documentation
See [TRACKING_INTEGRATION.md](TRACKING_INTEGRATION.md) for complete guide.

---

## Approach 2: PostToolUse Hook

### How It Works
One hook in `.claude/settings.json` automatically tracks **all** MCP tool invocations:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "mcp__(e26c2bb1|e7a207e6).*",
      "hooks": [{
        "type": "command",
        "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/track-skill-usage.sh"
      }]
    }]
  }
}
```

### Architecture
```
User → Skill invoked → MCP tool executes → PostToolUse hook → curl to API
```

### Pros
- ✅ **Zero per-skill effort** (automatic)
- ✅ Works in both Claude Code AND Cowork
- ✅ Team-friendly (no tracking code needed)
- ✅ Centralized configuration
- ✅ Future-proof (new skills auto-tracked)

### Cons
- ⚠️ Requires Claude Code hook support
- ⚠️ Less visible (hidden in settings)
- ⚠️ Requires understanding hooks

### Files Involved
- `.claude/settings.json` - Hook configuration
- `.claude/hooks/track-skill-usage.sh` - Hook script

### Documentation
See [HOOK_TRACKING_DEPLOYMENT.md](HOOK_TRACKING_DEPLOYMENT.md) for deployment guide.

---

## Current Status

**Both approaches are implemented and can run in parallel:**

1. **Bash blocks** are in all SKILL.md files (9 skills)
2. **PostToolUse hook** is configured in `.claude/settings.json`

**Result:** Each skill invocation generates **two tracking events** (one from bash, one from hook).

---

## Recommendations

### For Production (Now)

**Keep both approaches running in parallel:**
- Bash blocks: Proven, works in Claude Code
- PostToolUse hook: New, but more powerful
- Accept duplicate events temporarily
- Monitor both for reliability

### For Long-Term (After Testing)

**Option A: Migrate to Hook Only** ⭐ Recommended
1. Verify hook works reliably for 2-4 weeks
2. Remove bash blocks from all SKILL.md files
3. Keep only PostToolUse hook
4. Update team documentation

**Benefits:**
- Zero maintenance per skill
- Works in both Claude Code and Cowork
- Cleaner SKILL.md files
- Automatic for new skills

**Option B: Keep Bash Blocks Only**
1. Remove `.claude/settings.json` hook
2. Continue with current bash approach
3. Accept Cowork limitation

**Benefits:**
- Simpler (no hooks to understand)
- Visible in each skill
- Already working

---

## Migration Steps (If Choosing Hook-Only)

### Phase 1: Validation (2-4 weeks)
1. ✅ Both approaches running
2. Monitor tracking events
3. Compare counts (should be roughly 2x)
4. Verify hook reliability

### Phase 2: Cleanup
1. Remove bash blocks from SKILL.md files:
   ```bash
   # For each skill, remove:
   ```bash
   bash skills/_track.sh skill_name
   ```
   ```
2. Delete `skills/_track.sh` helper script
3. Update `skills/README.md` to mention hook-based tracking
4. Update `TRACKING_INTEGRATION.md`

### Phase 3: Team Documentation
1. Update onboarding docs: "Tracking is automatic via PostToolUse hook"
2. Remove "add tracking" from new skill checklist
3. Document hook location for future reference

---

## Testing Both Approaches

### Test Bash Block Approach
```bash
# Directly invoke helper script
bash skills/_track.sh test_bash_block

# Check database
wrangler d1 execute content-ontology --command \
  "SELECT tool_name FROM skill_usage_events WHERE tool_name='test_bash_block'" \
  --remote
```

### Test PostToolUse Hook
```bash
# Simulate hook input
echo '{"tool_name":"mcp__e26c2bb1-69a5-47a9-930c-06968c399abe__test_hook"}' | \
  .claude/hooks/track-skill-usage.sh

# Check database
wrangler d1 execute content-ontology --command \
  "SELECT tool_name FROM skill_usage_events WHERE tool_name='test_hook'" \
  --remote
```

### Test Both Together
```
# In Claude Code, invoke any skill:
List all sites in the ontology
```

```bash
# Check for duplicate events
wrangler d1 execute content-ontology --command \
  "SELECT tool_name, COUNT(*) as count, MIN(timestamp) as first, MAX(timestamp) as last
   FROM skill_usage_events
   WHERE tool_name='list_sites'
   GROUP BY tool_name" \
  --remote

# Should see count=2 if both approaches fired
```

---

## Troubleshooting

### Duplicate Events Appearing

**Expected behavior** when both approaches are active.

**To stop duplicates:**
- Remove bash blocks from SKILL.md files, OR
- Remove PostToolUse hook from `.claude/settings.json`

### Hook Not Firing

See [HOOK_TRACKING_DEPLOYMENT.md](HOOK_TRACKING_DEPLOYMENT.md#debugging) for detailed debugging steps.

### Bash Block Not Firing

See [TRACKING_INTEGRATION.md](TRACKING_INTEGRATION.md#troubleshooting) for troubleshooting guide.

---

## For Team Members

### Adding a New Skill (Current State)

**With bash blocks (manual):**
```markdown
```bash
bash skills/_track.sh your_skill_name
```
```

**With PostToolUse hook (automatic):**
- No action needed! Tracking happens automatically.

### Which One Should I Use?

**Short answer:** Neither! Both are already configured.

**Your new skill will be tracked automatically** via the PostToolUse hook. Adding bash blocks is optional (provides redundancy).

---

## Summary

- ✅ **Bash blocks**: Working, Claude Code only, requires per-skill addition
- ✅ **PostToolUse hook**: Working, both Claude Code & Cowork, automatic
- ✅ **Current state**: Both running (duplicate events expected)
- 📋 **Next decision**: Keep both, or migrate to hook-only after validation

For implementation details:
- **Bash approach**: [TRACKING_INTEGRATION.md](TRACKING_INTEGRATION.md)
- **Hook approach**: [HOOK_TRACKING_DEPLOYMENT.md](HOOK_TRACKING_DEPLOYMENT.md)
