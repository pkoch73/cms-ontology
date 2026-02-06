/**
 * analyze-content.js
 *
 * Uses Claude AI to analyze crawled content and extract structured metadata.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=xxx CLOUDFLARE_API_TOKEN=xxx node analyze-content.js
 */

import Anthropic from '@anthropic-ai/sdk';

const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || '20d334d5ba35350f096dc007d7d0fa0d';
const D1_DATABASE = process.env.D1_DATABASE_ID || 'e6c6614f-030b-4451-8a70-45de3481bde2';
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const anthropic = new Anthropic();

/**
 * Execute D1 query
 */
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
  return result.result[0]?.results || [];
}

/**
 * Extract text from HTML
 */
function extractText(html) {
  if (!html) return '';
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * Analyze a page with Claude
 */
async function analyzePage(path, html) {
  const textContent = extractText(html);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Analyze this webpage from WKND, an adventure travel and lifestyle brand, and extract structured metadata.

PATH: ${path}

CONTENT:
${textContent.substring(0, 4000)}

Extract as JSON (no markdown, just valid JSON):
{
  "title": "page title",
  "content_type": "adventure|article|landing|listing|support",
  "primary_topic": "main topic (e.g., 'surfing', 'skiing', 'cycling', 'food & wine', 'camping')",
  "secondary_topics": ["related topic 1", "related topic 2"],
  "entities": [
    {"name": "entity name", "type": "activity|location|feature|brand"}
  ],
  "target_audience": ["audience segment 1", "audience segment 2"],
  "funnel_stage": "awareness|consideration|decision",
  "key_messages": ["message 1", "message 2"],
  "word_count": <number>,
  "summary": "2-3 sentence summary"
}

Guidelines:
- content_type: "adventure" for bookable trips, "article" for magazine content, "landing" for index pages, "listing" for category pages
- funnel_stage: "awareness" for inspiration/magazine, "consideration" for trip details, "decision" for booking-ready pages
- Be specific with topics (e.g., "surf travel" not just "surfing")
- Extract locations mentioned as entities`
    }]
  });

  try {
    const jsonStr = response.content[0].text;
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error(`Failed to parse response for ${path}:`, e.message);
    return null;
  }
}

/**
 * Store analysis results in D1
 */
async function storeAnalysis(path, analysis) {
  // Update main page record
  await d1Query(
    `UPDATE pages SET
      content_type = ?,
      primary_topic = ?,
      funnel_stage = ?,
      word_count = ?,
      summary = ?
    WHERE path = ?`,
    [
      analysis.content_type,
      analysis.primary_topic,
      analysis.funnel_stage,
      analysis.word_count,
      analysis.summary,
      path
    ]
  );

  // Store topics
  await d1Query(
    `INSERT OR REPLACE INTO page_topics (page_path, topic, is_primary) VALUES (?, ?, TRUE)`,
    [path, analysis.primary_topic]
  );

  for (const topic of (analysis.secondary_topics || [])) {
    await d1Query(
      `INSERT OR REPLACE INTO page_topics (page_path, topic, is_primary) VALUES (?, ?, FALSE)`,
      [path, topic]
    );
  }

  // Store entities
  for (const entity of (analysis.entities || [])) {
    await d1Query(
      `INSERT OR IGNORE INTO entities (name, type) VALUES (?, ?)`,
      [entity.name, entity.type]
    );

    const entityRow = await d1Query(
      `SELECT id FROM entities WHERE name = ?`,
      [entity.name]
    );

    if (entityRow.length > 0) {
      await d1Query(
        `INSERT OR REPLACE INTO page_entities (page_path, entity_id) VALUES (?, ?)`,
        [path, entityRow[0].id]
      );
    }
  }

  // Store audiences
  for (const audience of (analysis.target_audience || [])) {
    await d1Query(
      `INSERT OR REPLACE INTO page_audiences (page_path, audience) VALUES (?, ?)`,
      [path, audience]
    );
  }

  // Store key messages
  for (const message of (analysis.key_messages || [])) {
    await d1Query(
      `INSERT INTO page_messages (page_path, message) VALUES (?, ?)`,
      [path, message]
    );
  }
}

/**
 * Main
 */
async function main() {
  if (!CF_TOKEN) {
    console.error('CLOUDFLARE_API_TOKEN required');
    process.exit(1);
  }

  console.log('Fetching pages from D1...\n');

  const pages = await d1Query(`SELECT path, title, raw_html FROM pages WHERE content_type IS NULL`);

  console.log(`Found ${pages.length} pages to analyze\n`);

  let analyzed = 0;
  let errors = 0;

  for (const page of pages) {
    console.log(`Analyzing: ${page.path}`);

    try {
      const analysis = await analyzePage(page.path, page.raw_html || '');

      if (analysis) {
        await storeAnalysis(page.path, analysis);
        console.log(`  ✓ ${analysis.content_type} | ${analysis.primary_topic} | ${analysis.funnel_stage}`);
        analyzed++;
      } else {
        errors++;
      }
    } catch (e) {
      console.log(`  ✗ Error: ${e.message}`);
      errors++;
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n========================================`);
  console.log(`Analysis Complete`);
  console.log(`========================================`);
  console.log(`Analyzed: ${analyzed}`);
  console.log(`Errors: ${errors}`);
}

main().catch(console.error);

export { analyzePage, storeAnalysis };
