#!/bin/bash

# Crawl WKND DA repository and store in D1
# Usage: ./crawl-wknd.sh

DA_TOKEN="$1"
CF_TOKEN="$2"
CF_ACCOUNT="20d334d5ba35350f096dc007d7d0fa0d"
D1_DATABASE="e6c6614f-030b-4451-8a70-45de3481bde2"

if [ -z "$DA_TOKEN" ] || [ -z "$CF_TOKEN" ]; then
    echo "Usage: ./crawl-wknd.sh <DA_TOKEN> <CF_TOKEN>"
    exit 1
fi

# Function to extract title from HTML
extract_title() {
    echo "$1" | grep -oP '(?<=<h1[^>]*>)[^<]+' | head -1
}

# Function to store page in D1
store_page() {
    local path="$1"
    local title="$2"
    local html="$3"

    # Escape the HTML for JSON
    local escaped_html=$(echo "$html" | jq -Rs .)
    local escaped_title=$(echo "$title" | jq -Rs .)

    curl -s -X POST \
        "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT/d1/database/$D1_DATABASE/query" \
        -H "Authorization: Bearer $CF_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"sql\": \"INSERT OR REPLACE INTO pages (path, title, raw_html, last_crawled) VALUES (?, ?, ?, datetime('now'))\",
            \"params\": [\"$path\", $escaped_title, $escaped_html]
        }" > /dev/null

    echo "  ✓ Stored: $path"
}

echo "========================================"
echo "WKND DA Repository Crawler"
echo "========================================"
echo ""

# All HTML pages to crawl (US English only for now)
PAGES=(
    "/us/en/about-us.html"
    "/us/en/adventures.html"
    "/us/en/faqs.html"
    "/us/en/magazine.html"
    "/us/en/adventures/bali-surf-camp.html"
    "/us/en/adventures/beervana-portland.html"
    "/us/en/adventures/climbing-new-zealand.html"
    "/us/en/adventures/colorado-rock-climbing.html"
    "/us/en/adventures/cycling-southern-utah.html"
    "/us/en/adventures/cycling-tuscany.html"
    "/us/en/adventures/downhill-skiing-wyoming.html"
    "/us/en/adventures/gastronomic-marais-tour.html"
    "/us/en/adventures/napa-wine-tasting.html"
    "/us/en/adventures/riverside-camping-australia.html"
    "/us/en/adventures/ski-touring-mont-blanc.html"
    "/us/en/adventures/surf-camp-costa-rica.html"
    "/us/en/adventures/tahoe-skiing.html"
    "/us/en/adventures/west-coast-cycling.html"
    "/us/en/adventures/whistler-mountain-biking.html"
    "/us/en/adventures/yosemite-backpacking.html"
    "/us/en/magazine/arctic-surfing.html"
    "/us/en/magazine/guide-la-skateparks.html"
    "/us/en/magazine/san-diego-surf.html"
    "/us/en/magazine/ski-touring.html"
    "/us/en/magazine/western-australia.html"
)

count=0
errors=0

for page in "${PAGES[@]}"; do
    echo "Fetching: $page"

    # Fetch HTML content
    html=$(curl -s -H "Authorization: Bearer $DA_TOKEN" "https://admin.da.live/source/pkoch73/wknd$page")

    if [ -n "$html" ]; then
        # Extract title
        title=$(echo "$html" | grep -oP '(?<=<h1[^>]*>)[^<]+' | head -1)

        # Store in D1
        store_page "$page" "$title" "$html"
        ((count++))
    else
        echo "  ✗ Failed to fetch"
        ((errors++))
    fi

    # Rate limit
    sleep 0.1
done

echo ""
echo "========================================"
echo "Crawl Complete"
echo "========================================"
echo "Pages crawled: $count"
echo "Errors: $errors"
