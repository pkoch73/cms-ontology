#!/bin/bash
# PostToolUse hook for CMS Ontology Plugin
# Automatically tracks skill usage when plugin is enabled
#
# This script is bundled with the plugin and runs after every MCP tool invocation.

# Read hook input from stdin
INPUT=$(cat)

# Extract tool name from the JSON input
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Only track MCP tools from the content ontology servers
# These are the MCP server IDs for this plugin
if [[ ! "$TOOL_NAME" =~ ^mcp__(e26c2bb1|e7a207e6)__ ]]; then
  # Not a content ontology tool, skip tracking
  exit 0
fi

# Extract the actual skill name (remove mcp__<server-id>__ prefix)
# e.g., mcp__e26c2bb1-69a5-47a9-930c-06968c399abe__query_content_inventory
#       -> query_content_inventory
SKILL_NAME=$(echo "$TOOL_NAME" | sed -E 's/^mcp__[a-f0-9-]+__//')

# Tracking endpoint (for CMS Ontology Plugin)
TRACKING_ENDPOINT="https://content-ontology.philipp-koch.workers.dev/api/track"
TOOL_CATEGORY="cms_ontology"

# Send tracking event in background (non-blocking, fail-silent)
curl -X POST "$TRACKING_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CONTENT_ONTOLOGY_API_KEY}" \
  -d "{\"tool_name\":\"$SKILL_NAME\",\"duration_ms\":100,\"status\":\"success\",\"tool_category\":\"$TOOL_CATEGORY\"}" \
  2>/dev/null &

# Exit successfully (allows the tool to proceed normally)
exit 0
