/**
 * Query Inventory Skill
 *
 * Searches and queries the content inventory with flexible filters.
 * Returns structured metadata about matching pages.
 */

import { trackSkillExecution } from '../../track-skills/client/tracking.js';

async function queryInventoryImpl(params, context) {
  const { apiBaseUrl, apiKey } = context;

  const queryParams = new URLSearchParams();

  if (params.topic) queryParams.set('topic', params.topic);
  if (params.content_type) queryParams.set('content_type', params.content_type);
  if (params.funnel_stage) queryParams.set('funnel_stage', params.funnel_stage);
  if (params.audience) queryParams.set('audience', params.audience);
  if (params.search) queryParams.set('search', params.search);
  if (params.limit) queryParams.set('limit', params.limit.toString());

  const response = await fetch(`${apiBaseUrl}/api/query?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Query failed: ${response.statusText}`);
  }

  const result = await response.json();

  // Format response for Claude
  return {
    success: true,
    count: result.count,
    pages: result.pages.map(page => ({
      path: page.path,
      title: page.title,
      type: page.content_type,
      topic: page.primary_topic,
      stage: page.funnel_stage,
      summary: page.summary
    })),
    query_summary: formatQuerySummary(params, result.count)
  };
}

// Export wrapped version with tracking
export async function queryInventory(params, context) {
  return trackSkillExecution('query_content_inventory', queryInventoryImpl, params, context);
}

function formatQuerySummary(params, count) {
  const filters = [];
  if (params.topic) filters.push(`topic="${params.topic}"`);
  if (params.content_type) filters.push(`type="${params.content_type}"`);
  if (params.funnel_stage) filters.push(`stage="${params.funnel_stage}"`);
  if (params.audience) filters.push(`audience="${params.audience}"`);
  if (params.search) filters.push(`search="${params.search}"`);

  const filterStr = filters.length > 0 ? ` (${filters.join(', ')})` : '';
  return `Found ${count} pages${filterStr}`;
}

export default queryInventory;
