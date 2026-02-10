---
name: debug-tracking
description: Debug tracking execution to identify issues
---

# Debug Tracking

This skill tests various aspects of bash execution in Cowork to identify why tracking isn't working.

## Test 1: Basic Echo (verify bash execution works)

```bash
echo "=== DEBUG: Bash execution started ==="
date
echo "Current directory: $(pwd)"
echo "=== DEBUG: Bash execution completed ==="
```

## Test 2: Check Environment Variable

```bash
echo "=== DEBUG: Checking CONTENT_ONTOLOGY_API_KEY ==="
if [ -z "$CONTENT_ONTOLOGY_API_KEY" ]; then
  echo "ERROR: CONTENT_ONTOLOGY_API_KEY is NOT set"
else
  echo "SUCCESS: CONTENT_ONTOLOGY_API_KEY is set (length: ${#CONTENT_ONTOLOGY_API_KEY})"
fi
```

## Test 3: Check File Access

```bash
echo "=== DEBUG: Checking file paths ==="
ls -la skills/ 2>&1 || echo "ERROR: Cannot access skills/ directory"
ls -la skills/_track.sh 2>&1 || echo "ERROR: Cannot access skills/_track.sh"
if [ -f skills/_track.sh ]; then
  echo "SUCCESS: skills/_track.sh exists and is accessible"
  file skills/_track.sh
else
  echo "ERROR: skills/_track.sh not found"
fi
```

## Test 4: Try Running Helper Script (foreground, capture output)

```bash
echo "=== DEBUG: Attempting to run tracking script ==="
bash skills/_track.sh debug_test_foreground 2>&1
echo "Exit code: $?"
```

## Test 5: Test Direct Curl (without helper script)

```bash
echo "=== DEBUG: Testing direct curl to /api/track ==="
curl -v -X POST "https://content-ontology.philipp-koch.workers.dev/api/track" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CONTENT_ONTOLOGY_API_KEY}" \
  -d '{"tool_name":"debug_direct_curl","duration_ms":999,"status":"success","tool_category":"cms_ontology"}' \
  2>&1
echo "Curl exit code: $?"
```

## Test 6: Alternative Paths

```bash
echo "=== DEBUG: Trying alternative paths ==="

# Try absolute path from root
if [ -f /Users/pkoch/Documents/GitHub/cms-ontology/skills/_track.sh ]; then
  echo "Found at absolute path"
  bash /Users/pkoch/Documents/GitHub/cms-ontology/skills/_track.sh debug_absolute_path
fi

# Try relative from current directory
if [ -f ./_track.sh ]; then
  echo "Found at ./_track.sh"
  bash ./_track.sh debug_relative_path
fi

# Try without path prefix
if command -v _track.sh &> /dev/null; then
  echo "Found in PATH"
  _track.sh debug_in_path
fi
```

## Expected Output

This skill should output detailed debug information showing:
- Whether bash execution works at all
- Whether environment variables are accessible
- Whether the helper script file can be found
- What errors occur when trying to run tracking
- Whether direct curl works

After invoking this skill, check the output to see which tests pass or fail.
