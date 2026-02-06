/**
 * crawl-da-inventory.js
 *
 * Crawls a DA (Document Authoring) repository and stores content in Cloudflare D1.
 * Supports multi-site management with site_id.
 *
 * Usage:
 *   DA_AUTH_TOKEN=xxx CLOUDFLARE_API_TOKEN=xxx node crawl-da-inventory.js <org> <repo> [--site-id=xxx]
 *
 * Environment variables:
 *   DA_AUTH_TOKEN        - Bearer token for DA Admin API
 *   CLOUDFLARE_API_TOKEN - Cloudflare API token with D1 access
 *   CLOUDFLARE_ACCOUNT_ID - Cloudflare account ID
 *   D1_DATABASE_ID       - D1 database ID (default: content-ontology)
 *
 * Options:
 *   --site-id=xxx        - Site identifier (default: derived from org/repo)
 *   --name="Site Name"   - Site display name (for new sites)
 *   --domain=domain.com  - Site domain (for new sites)
 */

const DA_ADMIN_BASE = 'https://admin.da.live';

// Configuration
const config = {
  daAuthToken: process.env.DA_AUTH_TOKEN,
  cfApiToken: process.env.CLOUDFLARE_API_TOKEN,
  cfAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || '20d334d5ba35350f096dc007d7d0fa0d',
  d1DatabaseId: process.env.D1_DATABASE_ID || 'e6c6614f-030b-4451-8a70-45de3481bde2',
  rateLimitMs: 100,  // Delay between requests
  skipPaths: ['/nav', '/footer', '/header', '/.']  // Paths to skip
};

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a D1 query via Cloudflare API
 */
async function d1Query(sql, params = []) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.cfAccountId}/d1/database/${config.d1DatabaseId}/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.cfApiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql, params })
    }
  );

  const result = await response.json();
  if (!result.success) {
    throw new Error(`D1 query failed: ${JSON.stringify(result.errors)}`);
  }
  return result.result;
}

/**
 * List contents of a DA directory
 */
async function listDirectory(org, repo, path = '') {
  const url = `${DA_ADMIN_BASE}/list/${org}/${repo}${path}`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${config.daAuthToken}` }
  });

  if (!response.ok) {
    if (response.status === 404) {
      console.warn(`  Directory not found: ${path}`);
      return [];
    }
    throw new Error(`Failed to list ${path}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch content of a DA document
 */
async function fetchDocumentContent(org, repo, path) {
  const url = `${DA_ADMIN_BASE}/source/${org}/${repo}${path}`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${config.daAuthToken}` }
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }

  return response.text();
}

/**
 * Check if path should be skipped
 */
function shouldSkip(path) {
  return config.skipPaths.some(skip => path.includes(skip));
}

/**
 * Extract title from HTML content
 */
function extractTitle(html) {
  if (!html) return null;

  // Try h1 first
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) return h1Match[1].trim();

  // Try title tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) return titleMatch[1].trim();

  return null;
}

/**
 * Recursively crawl a DA repository
 */
async function crawlRepository(org, repo) {
  const inventory = [];
  const errors = [];
  let crawlLogId;

  // Start crawl log
  try {
    await d1Query(
      `INSERT INTO crawl_log (status) VALUES ('running')`
    );
    const logResult = await d1Query(`SELECT last_insert_rowid() as id`);
    crawlLogId = logResult[0]?.results?.[0]?.id;
  } catch (e) {
    console.warn('Could not create crawl log:', e.message);
  }

  console.log(`\nStarting crawl of ${org}/${repo}...`);
  console.log('=' .repeat(50));

  async function crawlDirectory(path = '') {
    try {
      const items = await listDirectory(org, repo, path);

      for (const item of items) {
        // Skip unwanted paths
        if (shouldSkip(item.path)) {
          console.log(`  Skipping: ${item.path}`);
          continue;
        }

        if (item.ext === 'html' || (!item.ext && !item.name?.includes('.'))) {
          // It's a document - fetch content
          try {
            const content = await fetchDocumentContent(org, repo, item.path);

            if (content) {
              const title = extractTitle(content);

              inventory.push({
                path: item.path,
                title: title,
                rawHtml: content,
                editUrl: item.editUrl,
                contentUrl: item.contentUrl,
                previewUrl: item.aemPreview,
                liveUrl: item.aemLive,
                crawledAt: new Date().toISOString()
              });

              console.log(`  ✓ ${item.path} (${title || 'no title'})`);
            }
          } catch (e) {
            console.error(`  ✗ Error fetching ${item.path}: ${e.message}`);
            errors.push({ path: item.path, error: e.message });
          }

          await sleep(config.rateLimitMs);
        }

        // Check if it's a directory (has children or no extension)
        if (item.name && !item.name.includes('.')) {
          // Recurse into subdirectory
          await crawlDirectory(item.path);
        }
      }
    } catch (e) {
      console.error(`  ✗ Error listing ${path}: ${e.message}`);
      errors.push({ path, error: e.message });
    }
  }

  await crawlDirectory();

  console.log('\n' + '=' .repeat(50));
  console.log(`Crawl complete: ${inventory.length} pages, ${errors.length} errors`);

  // Update crawl log
  if (crawlLogId) {
    try {
      await d1Query(
        `UPDATE crawl_log SET
          completed_at = CURRENT_TIMESTAMP,
          pages_crawled = ?,
          errors = ?,
          status = ?
        WHERE id = ?`,
        [inventory.length, JSON.stringify(errors), errors.length > 0 ? 'completed_with_errors' : 'completed', crawlLogId]
      );
    } catch (e) {
      console.warn('Could not update crawl log:', e.message);
    }
  }

  return { inventory, errors };
}

/**
 * Store inventory in D1
 */
async function storeInventory(inventory, siteId = 'default') {
  console.log(`\nStoring ${inventory.length} pages in D1 (site: ${siteId})...`);

  let stored = 0;
  let failed = 0;

  for (const page of inventory) {
    try {
      await d1Query(
        `INSERT OR REPLACE INTO pages
          (path, title, raw_html, edit_url, preview_url, live_url, last_crawled, site_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          page.path,
          page.title,
          page.rawHtml,
          page.editUrl,
          page.previewUrl,
          page.liveUrl,
          page.crawledAt,
          siteId
        ]
      );
      stored++;
    } catch (e) {
      console.error(`  Failed to store ${page.path}: ${e.message}`);
      failed++;
    }
  }

  console.log(`Stored: ${stored}, Failed: ${failed}`);
  return { stored, failed };
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const result = { org: null, repo: null, siteId: null, name: null, domain: null };

  for (const arg of args) {
    if (arg.startsWith('--site-id=')) {
      result.siteId = arg.split('=')[1];
    } else if (arg.startsWith('--name=')) {
      result.name = arg.split('=')[1];
    } else if (arg.startsWith('--domain=')) {
      result.domain = arg.split('=')[1];
    } else if (!arg.startsWith('--')) {
      if (!result.org) result.org = arg;
      else if (!result.repo) result.repo = arg;
    }
  }

  // Default site ID from org/repo
  if (!result.siteId && result.org && result.repo) {
    result.siteId = result.repo.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  return result;
}

/**
 * Ensure site exists in database
 */
async function ensureSite(siteId, org, repo, name, domain) {
  try {
    // Check if site exists
    const existing = await d1Query(`SELECT id FROM sites WHERE id = ?`, [siteId]);

    if (existing[0]?.results?.length > 0) {
      console.log(`Using existing site: ${siteId}`);
      return;
    }

    // Create new site
    await d1Query(
      `INSERT INTO sites (id, name, domain, da_org, da_repo) VALUES (?, ?, ?, ?, ?)`,
      [siteId, name || siteId, domain || '', org, repo]
    );
    console.log(`Created new site: ${siteId}`);
  } catch (e) {
    console.warn('Could not ensure site:', e.message);
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { org, repo, siteId, name, domain } = args;

  if (!org || !repo) {
    console.error('Usage: node crawl-da-inventory.js <org> <repo> [--site-id=xxx] [--name="Site Name"] [--domain=domain.com]');
    console.error('Example: node crawl-da-inventory.js adobe my-site --site-id=mysite');
    process.exit(1);
  }

  if (!config.daAuthToken) {
    console.error('Error: DA_AUTH_TOKEN environment variable is required');
    process.exit(1);
  }

  if (!config.cfApiToken) {
    console.error('Error: CLOUDFLARE_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    // Ensure site exists
    await ensureSite(siteId, org, repo, name, domain);

    // Crawl the repository
    const { inventory, errors } = await crawlRepository(org, repo);

    // Store in D1 with site_id
    if (inventory.length > 0) {
      await storeInventory(inventory, siteId);
    }

    // Update site page count
    try {
      await d1Query(
        `UPDATE sites SET page_count = ?, last_crawled = CURRENT_TIMESTAMP WHERE id = ?`,
        [inventory.length, siteId]
      );
    } catch (e) {
      console.warn('Could not update site:', e.message);
    }

    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('CRAWL SUMMARY');
    console.log('=' .repeat(50));
    console.log(`Site ID: ${siteId}`);
    console.log(`Organization: ${org}`);
    console.log(`Repository: ${repo}`);
    console.log(`Pages crawled: ${inventory.length}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`D1 Database: ${config.d1DatabaseId}`);

    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(e => console.log(`  - ${e.path}: ${e.error}`));
    }

  } catch (e) {
    console.error('Fatal error:', e);
    process.exit(1);
  }
}

// Run if called directly
main();

export { crawlRepository, storeInventory, listDirectory, fetchDocumentContent };
