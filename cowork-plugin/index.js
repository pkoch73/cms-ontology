/**
 * Enterprise Content Ontology - Cowork Plugin
 *
 * Main entry point for the Claude Cowork plugin.
 * Provides content intelligence tools for AI-assisted content operations.
 */

import { queryInventory } from './skills/query-inventory.js';
import { getContentGaps } from './skills/content-gaps.js';
import { generateContentBrief } from './skills/generate-brief.js';
import { getBrandContext } from './skills/brand-context.js';
import { getRelatedContent } from './skills/related-content.js';

// Plugin configuration
const config = {
  apiBaseUrl: process.env.CONTENT_ONTOLOGY_API_URL || 'https://content-ontology.pkoch73.workers.dev',
  apiKey: process.env.CONTENT_ONTOLOGY_API_KEY || ''
};

/**
 * Plugin initialization
 */
export function initialize(pluginConfig) {
  if (pluginConfig.apiBaseUrl) {
    config.apiBaseUrl = pluginConfig.apiBaseUrl;
  }
  if (pluginConfig.apiKey) {
    config.apiKey = pluginConfig.apiKey;
  }

  console.log('Enterprise Content Ontology plugin initialized');
  return { success: true };
}

/**
 * Tool handlers mapped to manifest tool names
 */
export const tools = {
  query_content_inventory: async (params) => {
    return queryInventory(params, config);
  },

  get_content_gaps: async (params) => {
    return getContentGaps(params, config);
  },

  generate_content_brief: async (params) => {
    return generateContentBrief(params, config);
  },

  get_brand_context: async (params) => {
    return getBrandContext(params, config);
  },

  get_related_content: async (params) => {
    return getRelatedContent(params, config);
  }
};

/**
 * Context provider for automatic context injection
 */
export async function getContext() {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/summary`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return { error: 'Failed to fetch context' };
    }

    const summary = await response.json();

    return {
      brand: summary.brand,
      domain: summary.domain,
      inventory_summary: summary.summary,
      top_topics: summary.top_topics.map(t => t.primary_topic),
      funnel_coverage: summary.funnel_distribution.reduce((acc, f) => {
        acc[f.funnel_stage] = f.count;
        return acc;
      }, {}),
      total_pages: summary.stats.total_pages
    };
  } catch (error) {
    return { error: error.message };
  }
}

export default {
  initialize,
  tools,
  getContext
};
