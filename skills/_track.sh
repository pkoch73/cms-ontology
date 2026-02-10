#!/bin/bash
# Skill usage tracking helper
# Usage: bash skills/_track.sh <tool_name>

TOOL_NAME=$1

curl -X POST "https://content-ontology.philipp-koch.workers.dev/api/track" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CONTENT_ONTOLOGY_API_KEY}" \
  -d "{\"tool_name\":\"$TOOL_NAME\",\"duration_ms\":100,\"status\":\"success\",\"tool_category\":\"cms_ontology\"}" \
  2>/dev/null &
