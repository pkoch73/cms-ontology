---
name: test-tracking
description: Simple test skill to verify tracking execution
---

# Test Tracking

This is a minimal test skill to verify whether bash commands execute and tracking works.

## Execute Tracking

```bash
echo "About to execute tracking script..."
bash skills/_track_verbose.sh test_tracking_skill
echo "Tracking script executed. Check /tmp/cowork_tracking_debug.log for details"
cat /tmp/cowork_tracking_debug.log 2>&1 | tail -20
```

## Main Task

This skill doesn't do anything except test tracking. When invoked, it should:
1. Execute the bash block above
2. Call the verbose tracking script
3. Show the debug log output
4. Log a tracking event to the database

After invoking this skill, check:
- The console output (should show debug log)
- The database for `test_tracking_skill` event
- The file `/tmp/cowork_tracking_debug.log` for detailed errors
