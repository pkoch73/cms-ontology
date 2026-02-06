/**
 * query-ontology.js
 *
 * Simple CLI tool to query the content ontology database.
 *
 * Usage:
 *   node query-ontology.js <command> [args]
 *
 * Commands:
 *   stats           - Show database statistics
 *   pages           - List all pages
 *   topics          - List all topics with page counts
 *   gaps            - Show content gaps (missing funnel stages)
 *   search <term>   - Search pages by path or title
 */

const config = {
  cfApiToken: process.env.CLOUDFLARE_API_TOKEN,
  cfAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || '20d334d5ba35350f096dc007d7d0fa0d',
  d1DatabaseId: process.env.D1_DATABASE_ID || 'e6c6614f-030b-4451-8a70-45de3481bde2'
};

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
  return result.result[0]?.results || [];
}

/**
 * Show database statistics
 */
async function showStats() {
  console.log('\n📊 DATABASE STATISTICS\n');

  const tables = [
    'pages', 'page_topics', 'entities', 'page_entities',
    'page_audiences', 'page_blocks', 'page_links', 'page_messages', 'crawl_log'
  ];

  for (const table of tables) {
    try {
      const result = await d1Query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  ${table}: ${result[0]?.count || 0} rows`);
    } catch (e) {
      console.log(`  ${table}: error - ${e.message}`);
    }
  }

  // Last crawl info
  console.log('\n📅 LAST CRAWL\n');
  const crawlLog = await d1Query(`
    SELECT * FROM crawl_log ORDER BY started_at DESC LIMIT 1
  `);

  if (crawlLog.length > 0) {
    const log = crawlLog[0];
    console.log(`  Started: ${log.started_at}`);
    console.log(`  Completed: ${log.completed_at || 'In progress'}`);
    console.log(`  Pages: ${log.pages_crawled}`);
    console.log(`  Status: ${log.status}`);
  } else {
    console.log('  No crawls recorded yet');
  }
}

/**
 * List all pages
 */
async function listPages() {
  console.log('\n📄 PAGES\n');

  const pages = await d1Query(`
    SELECT path, title, content_type, primary_topic, funnel_stage
    FROM pages
    ORDER BY path
    LIMIT 100
  `);

  if (pages.length === 0) {
    console.log('  No pages found. Run the crawler first.');
    return;
  }

  for (const page of pages) {
    const type = page.content_type ? `[${page.content_type}]` : '';
    const topic = page.primary_topic ? `(${page.primary_topic})` : '';
    const stage = page.funnel_stage ? `{${page.funnel_stage}}` : '';
    console.log(`  ${page.path}`);
    console.log(`    ${page.title || '(no title)'} ${type} ${topic} ${stage}`);
  }

  console.log(`\n  Total: ${pages.length} pages (showing first 100)`);
}

/**
 * List topics with page counts
 */
async function listTopics() {
  console.log('\n🏷️  TOPICS\n');

  const topics = await d1Query(`
    SELECT
      primary_topic,
      COUNT(*) as page_count,
      GROUP_CONCAT(DISTINCT funnel_stage) as stages
    FROM pages
    WHERE primary_topic IS NOT NULL
    GROUP BY primary_topic
    ORDER BY page_count DESC
  `);

  if (topics.length === 0) {
    console.log('  No topics found. Run the analyzer first.');
    return;
  }

  for (const topic of topics) {
    console.log(`  ${topic.primary_topic}: ${topic.page_count} pages`);
    console.log(`    Stages: ${topic.stages || 'none'}`);
  }
}

/**
 * Show content gaps
 */
async function showGaps() {
  console.log('\n⚠️  CONTENT GAPS\n');

  const gaps = await d1Query(`
    SELECT
      primary_topic,
      SUM(CASE WHEN funnel_stage = 'awareness' THEN 1 ELSE 0 END) as awareness,
      SUM(CASE WHEN funnel_stage = 'consideration' THEN 1 ELSE 0 END) as consideration,
      SUM(CASE WHEN funnel_stage = 'decision' THEN 1 ELSE 0 END) as decision
    FROM pages
    WHERE primary_topic IS NOT NULL
    GROUP BY primary_topic
    HAVING awareness = 0 OR consideration = 0 OR decision = 0
    ORDER BY awareness DESC
  `);

  if (gaps.length === 0) {
    console.log('  No gaps found (or no topics analyzed yet).');
    return;
  }

  console.log('  Topics with missing funnel stages:\n');
  for (const gap of gaps) {
    const missing = [];
    if (gap.awareness === 0) missing.push('awareness');
    if (gap.consideration === 0) missing.push('consideration');
    if (gap.decision === 0) missing.push('decision');

    console.log(`  ${gap.primary_topic}`);
    console.log(`    Missing: ${missing.join(', ')}`);
    console.log(`    Current: A=${gap.awareness} C=${gap.consideration} D=${gap.decision}`);
  }
}

/**
 * Search pages
 */
async function searchPages(term) {
  console.log(`\n🔍 SEARCH: "${term}"\n`);

  const pages = await d1Query(`
    SELECT path, title, primary_topic, funnel_stage
    FROM pages
    WHERE path LIKE ? OR title LIKE ?
    ORDER BY path
    LIMIT 20
  `, [`%${term}%`, `%${term}%`]);

  if (pages.length === 0) {
    console.log('  No matches found.');
    return;
  }

  for (const page of pages) {
    console.log(`  ${page.path}`);
    console.log(`    ${page.title || '(no title)'}`);
  }

  console.log(`\n  Found: ${pages.length} pages`);
}

/**
 * Main entry point
 */
async function main() {
  const [,, command, ...args] = process.argv;

  if (!config.cfApiToken) {
    console.error('Error: CLOUDFLARE_API_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'stats':
        await showStats();
        break;
      case 'pages':
        await listPages();
        break;
      case 'topics':
        await listTopics();
        break;
      case 'gaps':
        await showGaps();
        break;
      case 'search':
        if (!args[0]) {
          console.error('Usage: node query-ontology.js search <term>');
          process.exit(1);
        }
        await searchPages(args[0]);
        break;
      default:
        console.log(`
Usage: node query-ontology.js <command> [args]

Commands:
  stats           - Show database statistics
  pages           - List all pages
  topics          - List all topics with page counts
  gaps            - Show content gaps (missing funnel stages)
  search <term>   - Search pages by path or title
        `);
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

main();

export { d1Query, showStats, listPages, listTopics, showGaps, searchPages };
