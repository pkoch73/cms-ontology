/**
 * Enterprise Content Ontology API
 *
 * Cloudflare Worker that serves the content ontology for Claude Cowork integration.
 * Provides endpoints for querying content inventory, gaps, and generating briefs.
 */

// Cowork Plugin Manifest - served at /manifest.json
const MANIFEST = {
  "name": "enterprise-content-ontology",
  "display_name": "Enterprise Content Ontology",
  "description": "AI-powered content intelligence for Adobe Edge Delivery Services. Query your content inventory, identify gaps, and generate context-aware content briefs.",
  "version": "2.0.0",
  "author": "WKND",
  "homepage": "https://github.com/pkoch73/cms-ontology",
  "icon": "https://www.hlx.live/developer/block-collection/icons/document.svg",
  "capabilities": {
    "tools": true,
    "context": true
  },
  "tools": [
    {
      "name": "query_content_inventory",
      "description": "Search and query the content inventory. Find pages by topic, content type, funnel stage, or audience. Returns structured metadata about matching pages.",
      "parameters": {
        "type": "object",
        "properties": {
          "site_id": { "type": "string", "description": "Filter by site ID (e.g., 'wknd'). Optional - omit to query all sites." },
          "topic": { "type": "string", "description": "Filter by primary topic (e.g., 'surfing', 'skiing', 'cycling')" },
          "content_type": { "type": "string", "enum": ["adventure", "article", "landing", "listing", "support"], "description": "Filter by content type" },
          "funnel_stage": { "type": "string", "enum": ["awareness", "consideration", "decision"], "description": "Filter by marketing funnel stage" },
          "audience": { "type": "string", "description": "Filter by target audience segment" },
          "search": { "type": "string", "description": "Free text search in page paths and titles" },
          "limit": { "type": "integer", "default": 20, "description": "Maximum number of results to return" }
        }
      }
    },
    {
      "name": "get_content_gaps",
      "description": "Identify content gaps in the inventory. Shows topics missing content at specific funnel stages, helping prioritize content creation.",
      "parameters": {
        "type": "object",
        "properties": {
          "topic": { "type": "string", "description": "Analyze gaps for a specific topic, or leave empty for all topics" },
          "funnel_stage": { "type": "string", "enum": ["awareness", "consideration", "decision"], "description": "Find topics missing this specific funnel stage" }
        }
      }
    },
    {
      "name": "generate_content_brief",
      "description": "Generate an AI-powered content brief based on the ontology context. Uses existing content patterns, brand voice, and gap analysis to create actionable briefs.",
      "parameters": {
        "type": "object",
        "required": ["topic", "content_type"],
        "properties": {
          "topic": { "type": "string", "description": "The primary topic for the new content" },
          "content_type": { "type": "string", "enum": ["adventure", "article", "landing", "listing", "support"], "description": "The type of content to create" },
          "funnel_stage": { "type": "string", "enum": ["awareness", "consideration", "decision"], "description": "Target funnel stage for the content" },
          "target_audience": { "type": "string", "description": "Primary audience for the content" }
        }
      }
    },
    {
      "name": "get_brand_context",
      "description": "Get brand context and content patterns from the ontology. Returns information about brand voice, common topics, content structure patterns, and terminology.",
      "parameters": {
        "type": "object",
        "properties": {
          "aspect": { "type": "string", "enum": ["topics", "audiences", "entities", "content_types", "all"], "default": "all", "description": "Which aspect of brand context to retrieve" }
        }
      }
    },
    {
      "name": "get_related_content",
      "description": "Find content related to a specific page or topic. Useful for internal linking, content clusters, and understanding content relationships.",
      "parameters": {
        "type": "object",
        "required": ["path"],
        "properties": {
          "path": { "type": "string", "description": "The page path to find related content for" },
          "relationship": { "type": "string", "enum": ["same_topic", "same_audience", "same_funnel_stage", "all"], "default": "all", "description": "Type of relationship to find" }
        }
      }
    },
    {
      "name": "get_performance_insights",
      "description": "Get performance insights from RUM analytics. Shows top performers, underperformers, and patterns to inform content strategy.",
      "parameters": {
        "type": "object",
        "properties": {
          "metric": { "type": "string", "enum": ["overall", "performance", "engagement", "conversion"], "default": "overall", "description": "Which metric to rank by" }
        }
      }
    },
    {
      "name": "get_page_performance",
      "description": "Get detailed performance data for a specific page. Shows Core Web Vitals, engagement metrics, and optimization recommendations.",
      "parameters": {
        "type": "object",
        "required": ["path"],
        "properties": {
          "path": { "type": "string", "description": "The page path to get performance data for" }
        }
      }
    },
    {
      "name": "list_sites",
      "description": "List all sites in the content ontology. Shows site name, domain, page count, and topic count for each site.",
      "parameters": { "type": "object", "properties": {} }
    },
    {
      "name": "get_site_details",
      "description": "Get detailed information about a specific site including stats and configuration.",
      "parameters": {
        "type": "object",
        "required": ["site_id"],
        "properties": {
          "site_id": { "type": "string", "description": "The site identifier" }
        }
      }
    }
  ],
  "context_providers": [
    {
      "name": "content_summary",
      "description": "Provides a summary of the content inventory for context",
      "auto_include": true
    }
  ],
  "api": {
    "base_url": "https://content-ontology.philipp-koch.workers.dev",
    "auth": {
      "type": "bearer",
      "env_var": "CONTENT_ONTOLOGY_API_KEY"
    }
  }
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for Cowork
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Simple API key auth
    const authHeader = request.headers.get('Authorization');
    const apiKey = env.API_KEY;
    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      let result;

      switch (path) {
        case '/api/query':
          result = await handleQuery(request, env);
          break;
        case '/api/gaps':
          result = await handleGaps(request, env);
          break;
        case '/api/brief':
          result = await handleBrief(request, env);
          break;
        case '/api/context':
          result = await handleContext(request, env);
          break;
        case '/api/related':
          result = await handleRelated(request, env);
          break;
        case '/api/summary':
          result = await handleSummary(request, env);
          break;
        case '/api/performance':
          result = await handlePerformance(request, env);
          break;
        case '/api/top-performers':
          result = await handleTopPerformers(request, env);
          break;
        case '/api/performance-patterns':
          result = await handlePerformancePatterns(request, env);
          break;
        case '/api/sites':
          result = await handleSites(request, env);
          break;
        case '/api/track':
          result = await handleTrack(request, env);
          break;
        case '/health':
          result = { status: 'ok', timestamp: new Date().toISOString() };
          break;
        case '/manifest.json':
          // Serve the Cowork plugin manifest directly
          return new Response(JSON.stringify(MANIFEST), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        default:
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Query content inventory
 */
async function handleQuery(request, env) {
  const params = await getParams(request);

  let sql = `
    SELECT p.path, p.title, p.content_type, p.primary_topic,
           p.funnel_stage, p.summary, p.site_id
    FROM pages p
    WHERE 1=1
  `;
  const bindings = [];

  // Site filter (default to 'wknd' for backward compatibility)
  if (params.site_id) {
    sql += ` AND p.site_id = ?`;
    bindings.push(params.site_id);
  }

  if (params.topic) {
    sql += ` AND p.primary_topic = ?`;
    bindings.push(params.topic);
  }

  if (params.content_type) {
    sql += ` AND p.content_type = ?`;
    bindings.push(params.content_type);
  }

  if (params.funnel_stage) {
    sql += ` AND p.funnel_stage = ?`;
    bindings.push(params.funnel_stage);
  }

  if (params.audience) {
    sql += ` AND p.path IN (SELECT page_path FROM page_audiences WHERE audience LIKE ?)`;
    bindings.push(`%${params.audience}%`);
  }

  if (params.search) {
    sql += ` AND (p.path LIKE ? OR p.title LIKE ?)`;
    bindings.push(`%${params.search}%`, `%${params.search}%`);
  }

  sql += ` ORDER BY p.path LIMIT ?`;
  bindings.push(params.limit || 20);

  const result = await env.DB.prepare(sql).bind(...bindings).all();

  return {
    count: result.results.length,
    pages: result.results
  };
}

/**
 * Get content gaps
 */
async function handleGaps(request, env) {
  const params = await getParams(request);

  let sql = `
    SELECT
      primary_topic as topic,
      SUM(CASE WHEN funnel_stage = 'awareness' THEN 1 ELSE 0 END) as awareness_count,
      SUM(CASE WHEN funnel_stage = 'consideration' THEN 1 ELSE 0 END) as consideration_count,
      SUM(CASE WHEN funnel_stage = 'decision' THEN 1 ELSE 0 END) as decision_count,
      COUNT(*) as total_pages
    FROM pages
    WHERE primary_topic IS NOT NULL
  `;
  const bindings = [];

  if (params.topic) {
    sql += ` AND primary_topic = ?`;
    bindings.push(params.topic);
  }

  sql += ` GROUP BY primary_topic`;

  if (params.funnel_stage) {
    const stageCol = `${params.funnel_stage}_count`;
    sql = `SELECT * FROM (${sql}) WHERE ${stageCol} = 0`;
  } else {
    sql = `SELECT * FROM (${sql}) WHERE awareness_count = 0 OR consideration_count = 0 OR decision_count = 0`;
  }

  const result = await env.DB.prepare(sql).bind(...bindings).all();

  // Format gaps with recommendations
  const gaps = result.results.map(row => {
    const missing = [];
    if (row.awareness_count === 0) missing.push('awareness');
    if (row.consideration_count === 0) missing.push('consideration');
    if (row.decision_count === 0) missing.push('decision');

    return {
      topic: row.topic,
      total_pages: row.total_pages,
      coverage: {
        awareness: row.awareness_count,
        consideration: row.consideration_count,
        decision: row.decision_count
      },
      missing_stages: missing,
      priority: missing.length >= 2 ? 'high' : 'medium',
      recommendation: generateGapRecommendation(row.topic, missing)
    };
  });

  return { gaps };
}

/**
 * Generate content brief
 */
async function handleBrief(request, env) {
  const params = await getParams(request);

  if (!params.topic || !params.content_type) {
    throw new Error('topic and content_type are required');
  }

  // Get existing content for this topic
  const existingContent = await env.DB.prepare(`
    SELECT path, title, content_type, funnel_stage, summary
    FROM pages
    WHERE primary_topic = ?
    ORDER BY funnel_stage
  `).bind(params.topic).all();

  // Get related topics
  const relatedTopics = await env.DB.prepare(`
    SELECT DISTINCT topic
    FROM page_topics
    WHERE page_path IN (
      SELECT path FROM pages WHERE primary_topic = ?
    ) AND topic != ?
    LIMIT 5
  `).bind(params.topic, params.topic).all();

  // Get target audiences for this topic
  const audiences = await env.DB.prepare(`
    SELECT DISTINCT audience
    FROM page_audiences
    WHERE page_path IN (
      SELECT path FROM pages WHERE primary_topic = ?
    )
  `).bind(params.topic).all();

  // Get entities for this topic
  const entities = await env.DB.prepare(`
    SELECT DISTINCT e.name, e.type
    FROM entities e
    JOIN page_entities pe ON e.id = pe.entity_id
    WHERE pe.page_path IN (
      SELECT path FROM pages WHERE primary_topic = ?
    )
  `).bind(params.topic).all();

  // Build the brief
  const brief = {
    topic: params.topic,
    content_type: params.content_type,
    funnel_stage: params.funnel_stage || 'consideration',
    target_audience: params.target_audience || (audiences.results[0]?.audience || 'adventure travelers'),

    context: {
      existing_content: existingContent.results,
      existing_count: existingContent.results.length,
      related_topics: relatedTopics.results.map(r => r.topic),
      known_audiences: audiences.results.map(r => r.audience),
      entities: entities.results
    },

    recommendations: {
      title_patterns: generateTitlePatterns(params.topic, params.content_type),
      key_elements: generateKeyElements(params.content_type, params.funnel_stage),
      internal_links: existingContent.results.slice(0, 3).map(p => ({
        path: p.path,
        title: p.title,
        context: `Link to ${p.funnel_stage}-stage content`
      })),
      seo_keywords: [params.topic, ...relatedTopics.results.map(r => r.topic).slice(0, 3)]
    },

    brief_text: generateBriefText(params, existingContent.results, audiences.results, entities.results)
  };

  return brief;
}

/**
 * Get brand context
 */
async function handleContext(request, env) {
  const params = await getParams(request);
  const aspect = params.aspect || 'all';
  const context = {};

  if (aspect === 'topics' || aspect === 'all') {
    const topics = await env.DB.prepare(`
      SELECT primary_topic as topic, COUNT(*) as count
      FROM pages
      WHERE primary_topic IS NOT NULL
      GROUP BY primary_topic
      ORDER BY count DESC
    `).all();
    context.topics = topics.results;
  }

  if (aspect === 'audiences' || aspect === 'all') {
    const audiences = await env.DB.prepare(`
      SELECT audience, COUNT(*) as count
      FROM page_audiences
      GROUP BY audience
      ORDER BY count DESC
    `).all();
    context.audiences = audiences.results;
  }

  if (aspect === 'entities' || aspect === 'all') {
    const entities = await env.DB.prepare(`
      SELECT name, type, COUNT(*) as mentions
      FROM entities e
      JOIN page_entities pe ON e.id = pe.entity_id
      GROUP BY e.id
      ORDER BY mentions DESC
      LIMIT 20
    `).all();
    context.entities = entities.results;
  }

  if (aspect === 'content_types' || aspect === 'all') {
    const types = await env.DB.prepare(`
      SELECT content_type, COUNT(*) as count
      FROM pages
      GROUP BY content_type
      ORDER BY count DESC
    `).all();
    context.content_types = types.results;
  }

  return context;
}

/**
 * Get related content
 */
async function handleRelated(request, env) {
  const params = await getParams(request);

  if (!params.path) {
    throw new Error('path is required');
  }

  // Get the source page
  const sourcePage = await env.DB.prepare(`
    SELECT * FROM pages WHERE path = ?
  `).bind(params.path).first();

  if (!sourcePage) {
    throw new Error('Page not found');
  }

  const related = {};

  if (params.relationship === 'same_topic' || params.relationship === 'all') {
    const topicPages = await env.DB.prepare(`
      SELECT path, title, content_type, funnel_stage
      FROM pages
      WHERE primary_topic = ? AND path != ?
      LIMIT 10
    `).bind(sourcePage.primary_topic, params.path).all();
    related.same_topic = topicPages.results;
  }

  if (params.relationship === 'same_funnel_stage' || params.relationship === 'all') {
    const stagePages = await env.DB.prepare(`
      SELECT path, title, content_type, primary_topic
      FROM pages
      WHERE funnel_stage = ? AND path != ?
      LIMIT 10
    `).bind(sourcePage.funnel_stage, params.path).all();
    related.same_funnel_stage = stagePages.results;
  }

  if (params.relationship === 'same_audience' || params.relationship === 'all') {
    const audiencePages = await env.DB.prepare(`
      SELECT DISTINCT p.path, p.title, p.content_type, p.primary_topic
      FROM pages p
      JOIN page_audiences pa ON p.path = pa.page_path
      WHERE pa.audience IN (
        SELECT audience FROM page_audiences WHERE page_path = ?
      ) AND p.path != ?
      LIMIT 10
    `).bind(params.path, params.path).all();
    related.same_audience = audiencePages.results;
  }

  return {
    source: {
      path: sourcePage.path,
      title: sourcePage.title,
      topic: sourcePage.primary_topic,
      funnel_stage: sourcePage.funnel_stage
    },
    related
  };
}

/**
 * Get inventory summary for context
 */
async function handleSummary(request, env) {
  const params = await getParams(request);
  const siteId = params.site_id;

  // Build site filter
  const siteFilter = siteId ? `WHERE site_id = '${siteId}'` : '';
  const siteFilterAnd = siteId ? `AND site_id = '${siteId}'` : '';

  const stats = await env.DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM pages ${siteFilter}) as total_pages,
      (SELECT COUNT(DISTINCT primary_topic) FROM pages WHERE primary_topic IS NOT NULL ${siteFilterAnd}) as total_topics,
      (SELECT COUNT(*) FROM entities) as total_entities,
      (SELECT COUNT(*) FROM sites) as total_sites
  `).first();

  const topTopics = await env.DB.prepare(`
    SELECT primary_topic, COUNT(*) as count
    FROM pages
    WHERE primary_topic IS NOT NULL ${siteFilterAnd}
    GROUP BY primary_topic
    ORDER BY count DESC
    LIMIT 5
  `).all();

  const funnelDistribution = await env.DB.prepare(`
    SELECT funnel_stage, COUNT(*) as count
    FROM pages
    ${siteFilter}
    GROUP BY funnel_stage
  `).all();

  // Get site info if specified
  let siteInfo = null;
  if (siteId) {
    siteInfo = await env.DB.prepare(`SELECT * FROM sites WHERE id = ?`).bind(siteId).first();
  }

  return {
    summary: `Content inventory with ${stats.total_pages} pages across ${stats.total_topics} topics.`,
    stats,
    site: siteInfo,
    top_topics: topTopics.results,
    funnel_distribution: funnelDistribution.results,
    brand: siteInfo?.name || 'WKND',
    domain: siteInfo?.domain || 'Adventure travel and lifestyle'
  };
}

/**
 * Get page performance data
 */
async function handlePerformance(request, env) {
  const params = await getParams(request);

  if (params.path) {
    // Get performance for specific page
    const performance = await env.DB.prepare(`
      SELECT pp.*, ps.performance_score, ps.engagement_score, ps.conversion_score, ps.overall_score
      FROM page_performance pp
      LEFT JOIN page_scores ps ON pp.page_path = ps.page_path
      WHERE pp.page_path = ?
      ORDER BY pp.date DESC
      LIMIT 30
    `).bind(params.path).all();

    const page = await env.DB.prepare(`
      SELECT path, title, primary_topic, funnel_stage, content_type
      FROM pages WHERE path = ?
    `).bind(params.path).first();

    return {
      page,
      performance: performance.results,
      scores: performance.results[0] ? {
        performance: performance.results[0].performance_score,
        engagement: performance.results[0].engagement_score,
        conversion: performance.results[0].conversion_score,
        overall: performance.results[0].overall_score
      } : null
    };
  }

  // Get performance overview
  const overview = await env.DB.prepare(`
    SELECT
      p.content_type,
      p.funnel_stage,
      COUNT(DISTINCT p.path) as page_count,
      AVG(ps.overall_score) as avg_score,
      AVG(ps.performance_score) as avg_performance,
      AVG(ps.engagement_score) as avg_engagement,
      AVG(ps.conversion_score) as avg_conversion
    FROM pages p
    LEFT JOIN page_scores ps ON p.path = ps.page_path
    GROUP BY p.content_type, p.funnel_stage
  `).all();

  return {
    overview: overview.results,
    summary: 'Performance overview by content type and funnel stage'
  };
}

/**
 * Get top performing pages
 */
async function handleTopPerformers(request, env) {
  const params = await getParams(request);
  const metric = params.metric || 'overall';
  const limit = parseInt(params.limit) || 10;

  const scoreColumn = {
    overall: 'overall_score',
    performance: 'performance_score',
    engagement: 'engagement_score',
    conversion: 'conversion_score'
  }[metric] || 'overall_score';

  const topPages = await env.DB.prepare(`
    SELECT
      p.path, p.title, p.primary_topic, p.funnel_stage, p.content_type,
      ps.overall_score, ps.performance_score, ps.engagement_score, ps.conversion_score
    FROM pages p
    JOIN page_scores ps ON p.path = ps.page_path
    ORDER BY ps.${scoreColumn} DESC
    LIMIT ?
  `).bind(limit).all();

  const bottomPages = await env.DB.prepare(`
    SELECT
      p.path, p.title, p.primary_topic, p.funnel_stage, p.content_type,
      ps.overall_score, ps.performance_score, ps.engagement_score, ps.conversion_score
    FROM pages p
    JOIN page_scores ps ON p.path = ps.page_path
    ORDER BY ps.${scoreColumn} ASC
    LIMIT ?
  `).bind(limit).all();

  return {
    metric,
    top_performers: topPages.results,
    needs_improvement: bottomPages.results,
    insights: generatePerformanceInsights(topPages.results, bottomPages.results)
  };
}

/**
 * Get performance patterns
 */
async function handlePerformancePatterns(request, env) {
  const params = await getParams(request);
  const patternType = params.type;

  let sql = 'SELECT * FROM performance_patterns';
  const bindings = [];

  if (patternType) {
    sql += ' WHERE pattern_type = ?';
    bindings.push(patternType);
  }

  sql += ' ORDER BY avg_performance DESC';

  const patterns = await env.DB.prepare(sql).bind(...bindings).all();

  // Group by pattern type
  const grouped = {};
  for (const pattern of patterns.results) {
    if (!grouped[pattern.pattern_type]) {
      grouped[pattern.pattern_type] = [];
    }
    grouped[pattern.pattern_type].push({
      value: pattern.pattern_value,
      score: pattern.avg_performance,
      sample_size: pattern.sample_size,
      insight: pattern.insight
    });
  }

  return {
    patterns: grouped,
    recommendations: generatePatternRecommendations(grouped)
  };
}

function generatePerformanceInsights(top, bottom) {
  const insights = [];

  // Analyze top performers
  const topTopics = [...new Set(top.map(p => p.primary_topic))];
  const topTypes = [...new Set(top.map(p => p.content_type))];

  if (topTopics.length <= 2) {
    insights.push(`Top performers concentrated in: ${topTopics.join(', ')}`);
  }

  if (topTypes.length <= 2) {
    insights.push(`Best performing content type: ${topTypes.join(', ')}`);
  }

  // Analyze underperformers
  const bottomTopics = [...new Set(bottom.map(p => p.primary_topic))];

  if (bottomTopics.some(t => !topTopics.includes(t))) {
    const needsWork = bottomTopics.filter(t => !topTopics.includes(t));
    insights.push(`Topics needing optimization: ${needsWork.join(', ')}`);
  }

  return insights;
}

function generatePatternRecommendations(patterns) {
  const recs = [];

  if (patterns.topic_performance) {
    const best = patterns.topic_performance[0];
    if (best && best.score > 70) {
      recs.push(`Replicate content patterns from ${best.value} (score: ${Math.round(best.score)})`);
    }
  }

  if (patterns.content_type_performance) {
    const best = patterns.content_type_performance[0];
    if (best) {
      recs.push(`Focus on ${best.value} content type for best results`);
    }
  }

  if (patterns.funnel_stage_performance) {
    const decision = patterns.funnel_stage_performance.find(p => p.value === 'decision');
    if (decision && decision.score < 50) {
      recs.push('Decision-stage content needs optimization for conversions');
    }
  }

  return recs;
}

/**
 * Handle sites - list, get, or manage sites
 */
async function handleSites(request, env) {
  const params = await getParams(request);

  if (params.id) {
    // Get single site with stats
    const site = await env.DB.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM pages WHERE site_id = s.id) as actual_page_count,
        (SELECT COUNT(DISTINCT primary_topic) FROM pages WHERE site_id = s.id) as topic_count
      FROM sites s
      WHERE s.id = ?
    `).bind(params.id).first();

    if (!site) {
      throw new Error('Site not found');
    }

    return { site };
  }

  // List all sites
  const sites = await env.DB.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM pages WHERE site_id = s.id) as actual_page_count,
      (SELECT COUNT(DISTINCT primary_topic) FROM pages WHERE site_id = s.id) as topic_count
    FROM sites s
    ORDER BY s.name
  `).all();

  return {
    count: sites.results.length,
    sites: sites.results
  };
}

// Helper functions

async function getParams(request) {
  if (request.method === 'POST') {
    return await request.json();
  }
  const url = new URL(request.url);
  const params = {};
  for (const [key, value] of url.searchParams) {
    params[key] = value;
  }
  return params;
}

function generateGapRecommendation(topic, missingStages) {
  const recs = [];
  if (missingStages.includes('awareness')) {
    recs.push(`Create an inspirational magazine article about ${topic} to attract new audiences`);
  }
  if (missingStages.includes('consideration')) {
    recs.push(`Develop detailed ${topic} adventure pages with trip information`);
  }
  if (missingStages.includes('decision')) {
    recs.push(`Add comparison guides or booking support content for ${topic}`);
  }
  return recs.join('. ');
}

function generateTitlePatterns(topic, contentType) {
  const patterns = {
    adventure: [
      `${topic.charAt(0).toUpperCase() + topic.slice(1)} Adventure in [Location]`,
      `[Location] ${topic.charAt(0).toUpperCase() + topic.slice(1)} Experience`,
      `Ultimate ${topic.charAt(0).toUpperCase() + topic.slice(1)} Trip`
    ],
    article: [
      `The Complete Guide to ${topic.charAt(0).toUpperCase() + topic.slice(1)}`,
      `Why ${topic.charAt(0).toUpperCase() + topic.slice(1)} Should Be Your Next Adventure`,
      `${topic.charAt(0).toUpperCase() + topic.slice(1)}: What You Need to Know`
    ],
    landing: [
      `Explore ${topic.charAt(0).toUpperCase() + topic.slice(1)} Adventures`,
      `${topic.charAt(0).toUpperCase() + topic.slice(1)} Experiences with WKND`
    ]
  };
  return patterns[contentType] || patterns.article;
}

function generateKeyElements(contentType, funnelStage) {
  const elements = {
    adventure: {
      awareness: ['Inspiring imagery', 'Destination highlights', 'Activity overview'],
      consideration: ['Detailed itinerary', 'What\'s included', 'Difficulty level', 'Best time to visit'],
      decision: ['Pricing', 'Booking form', 'FAQ', 'Reviews', 'Cancellation policy']
    },
    article: {
      awareness: ['Compelling headline', 'Hero image', 'Story hook', 'Social sharing'],
      consideration: ['Expert tips', 'Detailed information', 'Related adventures', 'Author bio'],
      decision: ['Clear CTA', 'Related bookable trips', 'Newsletter signup']
    }
  };
  return elements[contentType]?.[funnelStage] || elements.article.consideration;
}

function generateBriefText(params, existingContent, audiences, entities) {
  const topic = params.topic;
  const type = params.content_type;
  const stage = params.funnel_stage || 'consideration';
  const audience = params.target_audience || audiences[0]?.audience || 'adventure travelers';

  return `
## Content Brief: ${topic.charAt(0).toUpperCase() + topic.slice(1)} ${type.charAt(0).toUpperCase() + type.slice(1)}

### Objective
Create ${stage}-stage ${type} content about ${topic} targeting ${audience}.

### Context
- Existing ${topic} content: ${existingContent.length} pages
- Related entities: ${entities.slice(0, 5).map(e => e.name).join(', ') || 'None identified'}
- Known audiences: ${audiences.map(a => a.audience).join(', ') || audience}

### Requirements
1. Align with WKND adventure travel brand voice
2. Include relevant internal links to existing ${topic} content
3. Optimize for ${stage} stage of customer journey
4. Target primary audience: ${audience}

### Success Metrics
- Engagement with ${stage === 'decision' ? 'booking CTAs' : 'content'}
- Internal link clicks to related adventures
- Time on page appropriate for ${type} content
  `.trim();
}

/**
 * Handle client-side tracking events from skills
 */
async function handleTrack(request, env) {
  const event = await request.json();

  // Generate a simple hash for anonymous tracking (from IP if no user ID)
  const userIdentifier = request.headers.get('cf-connecting-ip') || 'anonymous';
  const encoder = new TextEncoder();
  const data = encoder.encode(userIdentifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const userIdHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);

  // Insert into D1
  try {
    const stmt = env.DB.prepare(`
      INSERT INTO skill_usage_events
      (user_id_hash, tool_name, tool_category, duration_ms, status, error_type, error_message, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt.bind(
      userIdHash,
      event.tool_name,
      event.tool_category || 'cms_ontology',
      event.duration_ms,
      event.status,
      event.error_type || null,
      event.error_message || null,
      event.metadata || null
    ).run();

    return { success: true, message: 'Event tracked' };
  } catch (error) {
    console.error('Failed to track event:', error);
    return { success: false, error: error.message };
  }
}
