---
name: list-sites
description: List all sites in the content ontology
---

# List Sites

List all sites in the content ontology, showing site name, domain, page count, and topic count for each.

## When to Use This Skill

Use this skill when you need to:
- See all available sites in the ontology
- Get an overview of content distribution across sites
- Check how many pages exist per site
- See topic coverage by site

## Usage

Simply ask Claude to list the sites:

```
List all sites in the ontology
```

Or:

```
Show me all sites with their page counts
```

## What It Does

1. Calls the MCP tool `list_sites`
2. Returns a list of all sites with:
   - Site ID
   - Site name
   - Domain
   - Page count
   - Topic count
3. **Automatically tracks** this invocation via PostToolUse hook

## Expected Output

```json
{
  "count": 1,
  "sites": [
    {
      "id": "wknd",
      "name": "WKND Adventures",
      "domain": "wknd.site",
      "page_count": 25,
      "topic_count": 14
    }
  ]
}
```

## Related Skills

- `query-content-inventory` - Search for specific pages within sites
- `get-inventory-summary` - Get detailed statistics for a specific site

