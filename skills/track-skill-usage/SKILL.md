---
name: track-skill-usage
description: Log skill execution metrics to analytics database
disable-model-invocation: false
user-invocable: false
---

# Track Skill Usage

Centralized skill tracking handler. Invoked by other skills to log usage metrics.

## Usage

This skill is invoked by other skills that need to log their execution:
1. Skills call this with tool name, duration, and status
2. This skill sends a tracking event to the analytics API
3. Returns confirmation of logging

This skill is for internal use only and does not appear in the user's `/` menu.

## Tracking Variables

Extract from context:
```bash
TOOL_NAME="${SKILL_NAME}"          # From invoking skill
START_TIME="${SKILL_START_TIME}"    # Set by Claude at skill start
END_TIME=$(date +%s%3N)
DURATION=$((END_TIME - START_TIME))
STATUS="${SKILL_STATUS:-success}"   # 'success' or 'error'
ERROR_TYPE="${SKILL_ERROR_TYPE:-}"
ERROR_MESSAGE="${SKILL_ERROR_MESSAGE:-}"
```

## Log to Tracking API

Send tracking event to the analytics endpoint:

```bash
curl -X POST "https://content-ontology.philipp-koch.workers.dev/api/track" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CONTENT_ONTOLOGY_API_KEY}" \
  -d "{
    \"tool_name\": \"$TOOL_NAME\",
    \"duration_ms\": $DURATION,
    \"status\": \"$STATUS\",
    \"tool_category\": \"cms_ontology\",
    \"error_type\": \"${ERROR_TYPE}\",
    \"error_message\": \"${ERROR_MESSAGE}\"
  }" 2>/dev/null || true
```

**Note:** The `2>/dev/null || true` ensures tracking failures don't break skills.

## What Gets Logged

- `tool_name` - Name of the skill that was executed
- `duration_ms` - Execution time in milliseconds
- `status` - 'success' or 'error'
- `tool_category` - Always 'cms_ontology'
- `error_type` - Error class (if failed)
- `error_message` - Error description (if failed)
- `user_id_hash` - Anonymous user ID (computed server-side from IP)

## Prerequisites

- API endpoint: `https://content-ontology.philipp-koch.workers.dev/api/track`
- Environment variable: `CONTENT_ONTOLOGY_API_KEY`
- Required CLI tools: `curl`, `date`

## Verification

Check recent tracking events:

```bash
wrangler d1 execute content-ontology --command \
  "SELECT tool_name, status, duration_ms, timestamp FROM skill_usage_events ORDER BY timestamp DESC LIMIT 10" --remote
```
