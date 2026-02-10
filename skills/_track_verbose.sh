#!/bin/bash
# Verbose tracking script for debugging
# Usage: bash skills/_track_verbose.sh <tool_name>

TOOL_NAME=$1
LOG_FILE="/tmp/cowork_tracking_debug.log"

echo "=== Tracking Debug Log ===" >> "$LOG_FILE"
echo "Time: $(date)" >> "$LOG_FILE"
echo "Tool: $TOOL_NAME" >> "$LOG_FILE"
echo "PWD: $(pwd)" >> "$LOG_FILE"
echo "API Key set: ${CONTENT_ONTOLOGY_API_KEY:+YES}" >> "$LOG_FILE"
echo "API Key length: ${#CONTENT_ONTOLOGY_API_KEY}" >> "$LOG_FILE"

curl -v -X POST "https://content-ontology.philipp-koch.workers.dev/api/track" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CONTENT_ONTOLOGY_API_KEY}" \
  -d "{\"tool_name\":\"$TOOL_NAME\",\"duration_ms\":100,\"status\":\"success\",\"tool_category\":\"cms_ontology\"}" \
  >> "$LOG_FILE" 2>&1

echo "Curl exit code: $?" >> "$LOG_FILE"
echo "===================" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
