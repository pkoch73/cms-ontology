/**
 * ingest-rum.js
 *
 * Ingests RUM (Real User Monitoring) data from Adobe Edge Delivery Services
 * and stores it in the content ontology database for performance-informed
 * content generation.
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=xxx node ingest-rum.js [--domain example.com] [--days 30]
 *
 * Data Sources:
 *   - Adobe RUM API (helix-services.adobe.io)
 *   - Or simulated data for demo purposes
 */

const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || '20d334d5ba35350f096dc007d7d0fa0d';
const D1_DATABASE = process.env.D1_DATABASE_ID || 'e6c6614f-030b-4451-8a70-45de3481bde2';
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

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
 * Fetch RUM data from Adobe Edge Delivery Services
 * Note: This requires appropriate API access
 */
async function fetchRumData(domain, days = 30) {
  // Adobe RUM API endpoint (requires authentication)
  const rumApiUrl = `https://helix-services.adobe.io/rum/${domain}`;

  // For demo purposes, we'll generate realistic sample data
  // In production, you'd fetch from the actual RUM API
  console.log(`Generating sample RUM data for demo (${days} days)...`);

  return generateSampleRumData(days);
}

/**
 * Generate sample RUM data for demonstration
 * Simulates realistic performance patterns
 */
async function generateSampleRumData(days) {
  const pages = await d1Query('SELECT path, content_type, primary_topic, funnel_stage FROM pages');
  const data = [];

  const today = new Date();

  for (const page of pages) {
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Generate realistic metrics based on content type and funnel stage
      const baseMetrics = getBaseMetrics(page.content_type, page.funnel_stage);

      // Add some variance
      const variance = () => 0.8 + Math.random() * 0.4;

      data.push({
        page_path: page.path,
        date: dateStr,
        pageviews: Math.floor(baseMetrics.pageviews * variance()),
        visits: Math.floor(baseMetrics.visits * variance()),
        avg_lcp: Math.round(baseMetrics.lcp * variance()),
        avg_cls: Math.round(baseMetrics.cls * variance() * 100) / 100,
        avg_inp: Math.round(baseMetrics.inp * variance()),
        bounce_rate: Math.min(1, Math.max(0, baseMetrics.bounceRate * variance())),
        avg_engagement_time: Math.round(baseMetrics.engagementTime * variance()),
        conversion_rate: Math.min(1, Math.max(0, baseMetrics.conversionRate * variance()))
      });
    }
  }

  return data;
}

/**
 * Get base metrics based on content characteristics
 */
function getBaseMetrics(contentType, funnelStage) {
  const metrics = {
    adventure: {
      awareness: { pageviews: 50, visits: 40, lcp: 2200, cls: 0.05, inp: 120, bounceRate: 0.45, engagementTime: 90, conversionRate: 0.02 },
      consideration: { pageviews: 80, visits: 65, lcp: 2400, cls: 0.08, inp: 150, bounceRate: 0.35, engagementTime: 180, conversionRate: 0.08 },
      decision: { pageviews: 30, visits: 25, lcp: 2000, cls: 0.03, inp: 100, bounceRate: 0.25, engagementTime: 240, conversionRate: 0.15 }
    },
    article: {
      awareness: { pageviews: 120, visits: 100, lcp: 1800, cls: 0.04, inp: 80, bounceRate: 0.55, engagementTime: 120, conversionRate: 0.01 },
      consideration: { pageviews: 60, visits: 50, lcp: 2000, cls: 0.05, inp: 100, bounceRate: 0.40, engagementTime: 150, conversionRate: 0.03 },
      decision: { pageviews: 20, visits: 15, lcp: 1900, cls: 0.04, inp: 90, bounceRate: 0.30, engagementTime: 200, conversionRate: 0.10 }
    },
    listing: {
      awareness: { pageviews: 150, visits: 120, lcp: 2100, cls: 0.06, inp: 110, bounceRate: 0.50, engagementTime: 60, conversionRate: 0.05 },
      consideration: { pageviews: 100, visits: 80, lcp: 2200, cls: 0.07, inp: 130, bounceRate: 0.40, engagementTime: 90, conversionRate: 0.08 },
      decision: { pageviews: 40, visits: 30, lcp: 2000, cls: 0.05, inp: 100, bounceRate: 0.30, engagementTime: 120, conversionRate: 0.12 }
    },
    landing: {
      awareness: { pageviews: 200, visits: 150, lcp: 1600, cls: 0.03, inp: 70, bounceRate: 0.60, engagementTime: 45, conversionRate: 0.03 },
      consideration: { pageviews: 80, visits: 60, lcp: 1800, cls: 0.04, inp: 90, bounceRate: 0.45, engagementTime: 75, conversionRate: 0.06 },
      decision: { pageviews: 30, visits: 25, lcp: 1700, cls: 0.03, inp: 80, bounceRate: 0.35, engagementTime: 100, conversionRate: 0.10 }
    },
    support: {
      awareness: { pageviews: 40, visits: 35, lcp: 1500, cls: 0.02, inp: 60, bounceRate: 0.30, engagementTime: 180, conversionRate: 0.01 },
      consideration: { pageviews: 30, visits: 25, lcp: 1600, cls: 0.03, inp: 70, bounceRate: 0.25, engagementTime: 200, conversionRate: 0.02 },
      decision: { pageviews: 50, visits: 45, lcp: 1400, cls: 0.02, inp: 50, bounceRate: 0.20, engagementTime: 240, conversionRate: 0.05 }
    }
  };

  const typeMetrics = metrics[contentType] || metrics.article;
  return typeMetrics[funnelStage] || typeMetrics.consideration;
}

/**
 * Store RUM data in D1
 */
async function storeRumData(data) {
  let stored = 0;

  for (const record of data) {
    try {
      await d1Query(`
        INSERT OR REPLACE INTO page_performance
        (page_path, date, pageviews, visits, avg_lcp, avg_cls, avg_inp, bounce_rate, avg_engagement_time, conversion_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        record.page_path,
        record.date,
        record.pageviews,
        record.visits,
        record.avg_lcp,
        record.avg_cls,
        record.avg_inp,
        record.bounce_rate,
        record.avg_engagement_time,
        record.conversion_rate
      ]);
      stored++;
    } catch (e) {
      console.error(`Failed to store ${record.page_path} ${record.date}: ${e.message}`);
    }
  }

  return stored;
}

/**
 * Calculate aggregate performance scores
 */
async function calculateScores() {
  console.log('\nCalculating performance scores...');

  const pages = await d1Query('SELECT DISTINCT page_path FROM page_performance');

  for (const { page_path } of pages) {
    // Get aggregated metrics for the page
    const metrics = await d1Query(`
      SELECT
        AVG(pageviews) as avg_pageviews,
        AVG(avg_lcp) as avg_lcp,
        AVG(avg_cls) as avg_cls,
        AVG(avg_inp) as avg_inp,
        AVG(bounce_rate) as avg_bounce_rate,
        AVG(avg_engagement_time) as avg_engagement_time,
        AVG(conversion_rate) as avg_conversion_rate
      FROM page_performance
      WHERE page_path = ?
    `, [page_path]);

    if (metrics.length === 0) continue;

    const m = metrics[0];

    // Calculate component scores (0-100)
    const performanceScore = calculatePerformanceScore(m.avg_lcp, m.avg_cls, m.avg_inp);
    const engagementScore = calculateEngagementScore(m.avg_bounce_rate, m.avg_engagement_time);
    const conversionScore = m.avg_conversion_rate * 1000; // Scale up for visibility

    // Overall weighted score
    const overallScore = (performanceScore * 0.3) + (engagementScore * 0.4) + (conversionScore * 0.3);

    await d1Query(`
      INSERT OR REPLACE INTO page_scores
      (page_path, performance_score, engagement_score, conversion_score, overall_score, last_calculated)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `, [page_path, performanceScore, engagementScore, conversionScore, overallScore]);
  }

  console.log(`  Calculated scores for ${pages.length} pages`);
}

/**
 * Calculate Core Web Vitals performance score
 */
function calculatePerformanceScore(lcp, cls, inp) {
  // Based on Google's thresholds
  // LCP: Good < 2.5s, Poor > 4s
  // CLS: Good < 0.1, Poor > 0.25
  // INP: Good < 200ms, Poor > 500ms

  const lcpScore = lcp <= 2500 ? 100 : lcp >= 4000 ? 0 : 100 - ((lcp - 2500) / 15);
  const clsScore = cls <= 0.1 ? 100 : cls >= 0.25 ? 0 : 100 - ((cls - 0.1) * 666);
  const inpScore = inp <= 200 ? 100 : inp >= 500 ? 0 : 100 - ((inp - 200) / 3);

  return (lcpScore + clsScore + inpScore) / 3;
}

/**
 * Calculate engagement score
 */
function calculateEngagementScore(bounceRate, engagementTime) {
  const bounceScore = (1 - bounceRate) * 100;
  const timeScore = Math.min(100, engagementTime / 2); // 200s+ = 100

  return (bounceScore + timeScore) / 2;
}

/**
 * Identify performance patterns
 */
async function identifyPatterns() {
  console.log('\nIdentifying performance patterns...');

  // Pattern: Best performing topics
  const topicPerformance = await d1Query(`
    SELECT
      p.primary_topic,
      AVG(ps.overall_score) as avg_score,
      COUNT(*) as page_count
    FROM pages p
    JOIN page_scores ps ON p.path = ps.page_path
    WHERE p.primary_topic IS NOT NULL
    GROUP BY p.primary_topic
    ORDER BY avg_score DESC
  `);

  for (const tp of topicPerformance) {
    await d1Query(`
      INSERT INTO performance_patterns (pattern_type, pattern_value, avg_performance, sample_size, insight)
      VALUES ('topic_performance', ?, ?, ?, ?)
    `, [
      tp.primary_topic,
      tp.avg_score,
      tp.page_count,
      tp.avg_score > 70 ? 'High-performing topic - replicate patterns' :
        tp.avg_score < 40 ? 'Underperforming topic - needs optimization' :
          'Average performance - room for improvement'
    ]);
  }

  // Pattern: Best performing content types
  const typePerformance = await d1Query(`
    SELECT
      p.content_type,
      AVG(ps.overall_score) as avg_score,
      COUNT(*) as page_count
    FROM pages p
    JOIN page_scores ps ON p.path = ps.page_path
    GROUP BY p.content_type
    ORDER BY avg_score DESC
  `);

  for (const tp of typePerformance) {
    await d1Query(`
      INSERT INTO performance_patterns (pattern_type, pattern_value, avg_performance, sample_size, insight)
      VALUES ('content_type_performance', ?, ?, ?, ?)
    `, [
      tp.content_type,
      tp.avg_score,
      tp.page_count,
      `${tp.content_type} content averages ${Math.round(tp.avg_score)} score`
    ]);
  }

  // Pattern: Funnel stage performance
  const stagePerformance = await d1Query(`
    SELECT
      p.funnel_stage,
      AVG(ps.overall_score) as avg_score,
      AVG(ps.conversion_score) as avg_conversion,
      COUNT(*) as page_count
    FROM pages p
    JOIN page_scores ps ON p.path = ps.page_path
    GROUP BY p.funnel_stage
    ORDER BY avg_score DESC
  `);

  for (const sp of stagePerformance) {
    await d1Query(`
      INSERT INTO performance_patterns (pattern_type, pattern_value, avg_performance, sample_size, insight)
      VALUES ('funnel_stage_performance', ?, ?, ?, ?)
    `, [
      sp.funnel_stage,
      sp.avg_score,
      sp.page_count,
      `${sp.funnel_stage} stage: ${Math.round(sp.avg_score)} overall, ${Math.round(sp.avg_conversion)} conversion`
    ]);
  }

  console.log('  Patterns stored');
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const domain = args.find(a => a.startsWith('--domain='))?.split('=')[1] || 'wknd.site';
  const days = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] || '30');

  if (!CF_TOKEN) {
    console.error('CLOUDFLARE_API_TOKEN required');
    process.exit(1);
  }

  console.log('========================================');
  console.log('RUM Data Ingestion');
  console.log('========================================');
  console.log(`Domain: ${domain}`);
  console.log(`Days: ${days}`);
  console.log('');

  // Fetch RUM data
  const rumData = await fetchRumData(domain, days);
  console.log(`Fetched ${rumData.length} data points`);

  // Store in D1
  const stored = await storeRumData(rumData);
  console.log(`Stored ${stored} records`);

  // Calculate scores
  await calculateScores();

  // Identify patterns
  await identifyPatterns();

  console.log('\n========================================');
  console.log('RUM Ingestion Complete');
  console.log('========================================');

  // Show top performers
  const topPages = await d1Query(`
    SELECT ps.page_path, ps.overall_score, p.primary_topic
    FROM page_scores ps
    JOIN pages p ON ps.page_path = p.path
    ORDER BY ps.overall_score DESC
    LIMIT 5
  `);

  console.log('\nTop Performing Pages:');
  for (const page of topPages) {
    console.log(`  ${Math.round(page.overall_score)} - ${page.page_path} (${page.primary_topic})`);
  }
}

main().catch(console.error);
