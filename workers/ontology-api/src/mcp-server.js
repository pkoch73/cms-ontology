/**
 * Enterprise Content Ontology MCP Server
 *
 * Model Context Protocol server for Claude Cowork integration.
 * Implements the MCP Streamable HTTP transport for Cloudflare Workers.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { hashUserId } from '../../../track-skills/server/tracking-utils.js';
import { getSummary, getToolStats, getRetentionStats, getRecentErrors } from '../../../track-skills/analytics/analytics.js';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id, Last-Event-ID, mcp-protocol-version',
  'Access-Control-Expose-Headers': 'mcp-session-id, mcp-protocol-version'
};

// Create and configure the MCP server with our tools
function createOntologyServer(env) {
  const server = new McpServer({
    name: 'enterprise-content-ontology',
    version: '2.0.0',
  });

  // Register all tools
  server.tool(
    'query_content_inventory',
    'Search and query the content inventory. Find pages by topic, content type, funnel stage, or audience.',
    {
      site_id: { type: 'string', description: 'Filter by site ID (e.g., "wknd")' },
      topic: { type: 'string', description: 'Filter by primary topic' },
      content_type: { type: 'string', description: 'Filter by content type' },
      funnel_stage: { type: 'string', description: 'Filter by funnel stage' },
      audience: { type: 'string', description: 'Filter by target audience' },
      search: { type: 'string', description: 'Free text search' },
      limit: { type: 'number', description: 'Max results (default 20)' }
    },
    async (params) => {
      const result = await handleQuery(params, env);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_content_gaps',
    'Identify content gaps. Shows topics missing content at specific funnel stages.',
    {
      topic: { type: 'string', description: 'Specific topic to analyze' },
      funnel_stage: { type: 'string', description: 'Find topics missing this stage' }
    },
    async (params) => {
      const result = await handleGaps(params, env);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'generate_content_brief',
    'Generate a content brief based on ontology context.',
    {
      topic: { type: 'string', description: 'Primary topic for new content' },
      content_type: { type: 'string', description: 'Type of content to create' },
      funnel_stage: { type: 'string', description: 'Target funnel stage' },
      target_audience: { type: 'string', description: 'Primary audience' }
    },
    async (params) => {
      const result = await handleBrief(params, env);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_brand_context',
    'Get brand context and content patterns from the ontology.',
    {
      aspect: { type: 'string', description: 'Which aspect: topics, audiences, entities, content_types, or all' }
    },
    async (params) => {
      const result = await handleContext(params, env);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_related_content',
    'Find content related to a specific page.',
    {
      path: { type: 'string', description: 'Page path to find related content for' },
      relationship: { type: 'string', description: 'Type: same_topic, same_audience, same_funnel_stage, all' }
    },
    async (params) => {
      const result = await handleRelated(params, env);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_performance_insights',
    'Get performance insights from RUM analytics.',
    {
      metric: { type: 'string', description: 'Metric to rank by: overall, performance, engagement, conversion' }
    },
    async (params) => {
      const result = await handleTopPerformers(params, env);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_page_performance',
    'Get detailed performance data for a specific page.',
    {
      path: { type: 'string', description: 'Page path' }
    },
    async (params) => {
      const result = await handlePerformance(params, env);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'list_sites',
    'List all sites in the content ontology.',
    {},
    async (params) => {
      const result = await handleSites(params, env);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_inventory_summary',
    'Get a summary of the content inventory for context.',
    {
      site_id: { type: 'string', description: 'Filter by site ID' }
    },
    async (params) => {
      const result = await handleSummary(params, env);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  return server;
}

// Database query handlers
async function handleQuery(params, env) {
  let sql = `
    SELECT p.path, p.title, p.content_type, p.primary_topic,
           p.funnel_stage, p.summary, p.site_id
    FROM pages p WHERE 1=1
  `;
  const bindings = [];

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
  return { count: result.results.length, pages: result.results };
}

async function handleGaps(params, env) {
  let sql = `
    SELECT primary_topic as topic,
      SUM(CASE WHEN funnel_stage = 'awareness' THEN 1 ELSE 0 END) as awareness_count,
      SUM(CASE WHEN funnel_stage = 'consideration' THEN 1 ELSE 0 END) as consideration_count,
      SUM(CASE WHEN funnel_stage = 'decision' THEN 1 ELSE 0 END) as decision_count,
      COUNT(*) as total_pages
    FROM pages WHERE primary_topic IS NOT NULL
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

  const gaps = result.results.map(row => {
    const missing = [];
    if (row.awareness_count === 0) missing.push('awareness');
    if (row.consideration_count === 0) missing.push('consideration');
    if (row.decision_count === 0) missing.push('decision');

    return {
      topic: row.topic,
      total_pages: row.total_pages,
      coverage: { awareness: row.awareness_count, consideration: row.consideration_count, decision: row.decision_count },
      missing_stages: missing,
      priority: missing.length >= 2 ? 'high' : 'medium'
    };
  });

  return { gaps };
}

async function handleBrief(params, env) {
  if (!params.topic || !params.content_type) {
    return { error: 'topic and content_type are required' };
  }

  const existingContent = await env.DB.prepare(`
    SELECT path, title, content_type, funnel_stage, summary FROM pages WHERE primary_topic = ? ORDER BY funnel_stage
  `).bind(params.topic).all();

  const audiences = await env.DB.prepare(`
    SELECT DISTINCT audience FROM page_audiences WHERE page_path IN (SELECT path FROM pages WHERE primary_topic = ?)
  `).bind(params.topic).all();

  const topic = params.topic;
  const type = params.content_type;
  const stage = params.funnel_stage || 'consideration';
  const audience = params.target_audience || audiences.results[0]?.audience || 'adventure travelers';

  return {
    topic,
    content_type: type,
    funnel_stage: stage,
    target_audience: audience,
    context: {
      existing_content: existingContent.results,
      existing_count: existingContent.results.length,
      known_audiences: audiences.results.map(r => r.audience)
    },
    brief_text: `Create ${stage}-stage ${type} content about ${topic} targeting ${audience}. Existing ${topic} content: ${existingContent.results.length} pages.`
  };
}

async function handleContext(params, env) {
  const aspect = params.aspect || 'all';
  const context = {};

  if (aspect === 'topics' || aspect === 'all') {
    const topics = await env.DB.prepare(`
      SELECT primary_topic as topic, COUNT(*) as count FROM pages WHERE primary_topic IS NOT NULL GROUP BY primary_topic ORDER BY count DESC
    `).all();
    context.topics = topics.results;
  }

  if (aspect === 'audiences' || aspect === 'all') {
    const audiences = await env.DB.prepare(`SELECT audience, COUNT(*) as count FROM page_audiences GROUP BY audience ORDER BY count DESC`).all();
    context.audiences = audiences.results;
  }

  if (aspect === 'entities' || aspect === 'all') {
    const entities = await env.DB.prepare(`
      SELECT name, type, COUNT(*) as mentions FROM entities e JOIN page_entities pe ON e.id = pe.entity_id GROUP BY e.id ORDER BY mentions DESC LIMIT 20
    `).all();
    context.entities = entities.results;
  }

  if (aspect === 'content_types' || aspect === 'all') {
    const types = await env.DB.prepare(`SELECT content_type, COUNT(*) as count FROM pages GROUP BY content_type ORDER BY count DESC`).all();
    context.content_types = types.results;
  }

  return context;
}

async function handleRelated(params, env) {
  if (!params.path) {
    return { error: 'path is required' };
  }

  const sourcePage = await env.DB.prepare(`SELECT * FROM pages WHERE path = ?`).bind(params.path).first();
  if (!sourcePage) {
    return { error: 'Page not found' };
  }

  const related = {};
  const rel = params.relationship || 'all';

  if (rel === 'same_topic' || rel === 'all') {
    const topicPages = await env.DB.prepare(`
      SELECT path, title, content_type, funnel_stage FROM pages WHERE primary_topic = ? AND path != ? LIMIT 10
    `).bind(sourcePage.primary_topic, params.path).all();
    related.same_topic = topicPages.results;
  }

  if (rel === 'same_funnel_stage' || rel === 'all') {
    const stagePages = await env.DB.prepare(`
      SELECT path, title, content_type, primary_topic FROM pages WHERE funnel_stage = ? AND path != ? LIMIT 10
    `).bind(sourcePage.funnel_stage, params.path).all();
    related.same_funnel_stage = stagePages.results;
  }

  return {
    source: { path: sourcePage.path, title: sourcePage.title, topic: sourcePage.primary_topic, funnel_stage: sourcePage.funnel_stage },
    related
  };
}

async function handlePerformance(params, env) {
  if (params.path) {
    const performance = await env.DB.prepare(`
      SELECT pp.*, ps.performance_score, ps.engagement_score, ps.conversion_score, ps.overall_score
      FROM page_performance pp LEFT JOIN page_scores ps ON pp.page_path = ps.page_path
      WHERE pp.page_path = ? ORDER BY pp.date DESC LIMIT 30
    `).bind(params.path).all();

    const page = await env.DB.prepare(`SELECT path, title, primary_topic, funnel_stage, content_type FROM pages WHERE path = ?`).bind(params.path).first();

    return { page, performance: performance.results };
  }

  const overview = await env.DB.prepare(`
    SELECT p.content_type, p.funnel_stage, COUNT(DISTINCT p.path) as page_count, AVG(ps.overall_score) as avg_score
    FROM pages p LEFT JOIN page_scores ps ON p.path = ps.page_path GROUP BY p.content_type, p.funnel_stage
  `).all();

  return { overview: overview.results };
}

async function handleTopPerformers(params, env) {
  const metric = params.metric || 'overall';
  const scoreColumn = { overall: 'overall_score', performance: 'performance_score', engagement: 'engagement_score', conversion: 'conversion_score' }[metric] || 'overall_score';

  const topPages = await env.DB.prepare(`
    SELECT p.path, p.title, p.primary_topic, p.funnel_stage, p.content_type, ps.overall_score, ps.performance_score
    FROM pages p JOIN page_scores ps ON p.path = ps.page_path ORDER BY ps.${scoreColumn} DESC LIMIT 10
  `).all();

  const bottomPages = await env.DB.prepare(`
    SELECT p.path, p.title, p.primary_topic, p.funnel_stage, p.content_type, ps.overall_score, ps.performance_score
    FROM pages p JOIN page_scores ps ON p.path = ps.page_path ORDER BY ps.${scoreColumn} ASC LIMIT 10
  `).all();

  return { metric, top_performers: topPages.results, needs_improvement: bottomPages.results };
}

async function handleSites(params, env) {
  if (params.id) {
    const site = await env.DB.prepare(`
      SELECT s.*, (SELECT COUNT(*) FROM pages WHERE site_id = s.id) as page_count FROM sites s WHERE s.id = ?
    `).bind(params.id).first();
    return { site };
  }

  const sites = await env.DB.prepare(`
    SELECT s.*, (SELECT COUNT(*) FROM pages WHERE site_id = s.id) as page_count FROM sites s ORDER BY s.name
  `).all();

  return { count: sites.results.length, sites: sites.results };
}

async function handleSummary(params, env) {
  const siteId = params.site_id;
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
    SELECT primary_topic, COUNT(*) as count FROM pages WHERE primary_topic IS NOT NULL ${siteFilterAnd} GROUP BY primary_topic ORDER BY count DESC LIMIT 5
  `).all();

  return {
    summary: `Content inventory with ${stats.total_pages} pages across ${stats.total_topics} topics.`,
    stats,
    top_topics: topTopics.results,
    brand: 'WKND',
    domain: 'Adventure travel and lifestyle'
  };
}

// Store server and transport globally for the worker
let server = null;
let transport = null;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Analytics endpoints
    if (url.pathname === '/analytics/summary') {
      const days = parseInt(url.searchParams.get('days') || '7');
      const data = await getSummary(env, days);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/analytics/tools') {
      const days = parseInt(url.searchParams.get('days') || '7');
      const data = await getToolStats(env, days);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/analytics/retention') {
      const days = parseInt(url.searchParams.get('days') || '30');
      const data = await getRetentionStats(env, days);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/analytics/errors') {
      const days = parseInt(url.searchParams.get('days') || '7');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const data = await getRecentErrors(env, days, limit);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Client-side tracking endpoint
    if (url.pathname === '/api/track' && request.method === 'POST') {
      try {
        const event = await request.json();

        // Generate anonymous user hash from IP
        const userIdentifier = request.headers.get('cf-connecting-ip') || 'anonymous';
        const userIdHash = await hashUserId(userIdentifier);

        // Log to D1
        await logUsageEvent(env, {
          userIdHash,
          toolName: event.tool_name,
          toolCategory: event.tool_category || 'cms_ontology',
          durationMs: event.duration_ms,
          status: event.status,
          errorType: event.error_type || null,
          errorMessage: event.error_message || null,
          metadata: event.metadata || null
        });

        return new Response(JSON.stringify({ success: true, message: 'Event tracked' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // MCP endpoint - handle at root or /mcp
    if (url.pathname === '/' || url.pathname === '/mcp') {
      try {
        // Create server and transport for this request
        server = createOntologyServer(env);
        transport = new WebStandardStreamableHTTPServerTransport();

        // Connect server to transport
        await server.connect(transport);

        // Handle the MCP request
        const response = await transport.handleRequest(request);

        // Add CORS headers to response
        const newHeaders = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders
        });
      } catch (error) {
        console.error('MCP Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // 404 for other paths
    return new Response(JSON.stringify({ error: 'Not found. Use / or /mcp for MCP protocol.' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
