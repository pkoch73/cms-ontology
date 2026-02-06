/**
 * Store crawled WKND pages in Cloudflare D1
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const CF_ACCOUNT = '20d334d5ba35350f096dc007d7d0fa0d';
const D1_DATABASE = 'e6c6614f-030b-4451-8a70-45de3481bde2';
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

async function d1Query(sql, params = []) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${D1_DATABASE}/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_TOKEN}`,
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

function extractTitle(html) {
  const match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  return match ? match[1].trim() : null;
}

async function main() {
  const pagesDir = '/tmp/wknd-pages';
  const files = readdirSync(pagesDir).filter(f => f.endsWith('.html'));

  console.log(`Found ${files.length} pages to store\n`);

  // Start crawl log
  await d1Query(`INSERT INTO crawl_log (status) VALUES ('running')`);

  let stored = 0;
  let errors = 0;

  for (const file of files) {
    const path = '/' + file.replace(/_/g, '/').replace('.html', '');
    const fullPath = path + '.html';
    const html = readFileSync(join(pagesDir, file), 'utf-8');
    const title = extractTitle(html);

    try {
      await d1Query(
        `INSERT OR REPLACE INTO pages (path, title, raw_html, last_crawled) VALUES (?, ?, ?, datetime('now'))`,
        [fullPath, title, html]
      );
      console.log(`✓ ${fullPath} - ${title || '(no title)'}`);
      stored++;
    } catch (e) {
      console.log(`✗ ${fullPath} - ${e.message}`);
      errors++;
    }
  }

  // Update crawl log
  await d1Query(
    `UPDATE crawl_log SET completed_at = datetime('now'), pages_crawled = ?, status = ? WHERE id = (SELECT MAX(id) FROM crawl_log)`,
    [stored, errors > 0 ? 'completed_with_errors' : 'completed']
  );

  console.log(`\n========================================`);
  console.log(`Stored: ${stored} pages`);
  console.log(`Errors: ${errors}`);
}

main().catch(console.error);
