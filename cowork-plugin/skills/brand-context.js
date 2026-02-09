/**
 * Brand Context Skill
 *
 * Retrieves brand context and content patterns from the ontology.
 * Provides information about brand voice, topics, audiences, and terminology.
 */

import { trackSkillExecution } from '../../track-skills/client/tracking.js';

async function getBrandContextImpl(params, context) {
  const { apiBaseUrl, apiKey } = context;

  const aspect = params.aspect || 'all';

  const response = await fetch(`${apiBaseUrl}/api/context?aspect=${aspect}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Context retrieval failed: ${response.statusText}`);
  }

  const data = await response.json();

  // Build formatted context
  const brandContext = {
    success: true,
    brand: 'WKND',
    domain: 'Adventure travel and lifestyle',
    voice: {
      tone: 'Adventurous, inspiring, authentic',
      style: 'Active voice, vivid descriptions, expert yet approachable',
      values: ['Adventure', 'Authenticity', 'Expertise', 'Community']
    }
  };

  if (data.topics) {
    brandContext.topics = {
      primary: data.topics.slice(0, 5).map(t => t.topic),
      all: data.topics.map(t => ({
        name: t.topic,
        content_count: t.count
      }))
    };
  }

  if (data.audiences) {
    brandContext.audiences = {
      primary: data.audiences.slice(0, 5).map(a => a.audience),
      all: data.audiences.map(a => ({
        segment: a.audience,
        content_count: a.count
      }))
    };
  }

  if (data.entities) {
    brandContext.entities = {
      locations: data.entities.filter(e => e.type === 'location').map(e => e.name),
      activities: data.entities.filter(e => e.type === 'activity').map(e => e.name),
      all: data.entities
    };
  }

  if (data.content_types) {
    brandContext.content_types = data.content_types.map(t => ({
      type: t.content_type,
      count: t.count,
      purpose: getTypePurpose(t.content_type)
    }));
  }

  brandContext.summary = formatContextSummary(brandContext);

  return brandContext;
}

function getTypePurpose(type) {
  const purposes = {
    adventure: 'Bookable trip experiences with detailed itineraries',
    article: 'Magazine-style content for inspiration and education',
    landing: 'Brand and category entry points',
    listing: 'Index pages for content discovery',
    support: 'FAQ and customer support content'
  };
  return purposes[type] || 'General content';
}

function formatContextSummary(context) {
  const parts = [];

  if (context.topics?.primary) {
    parts.push(`Top topics: ${context.topics.primary.join(', ')}`);
  }

  if (context.audiences?.primary) {
    parts.push(`Key audiences: ${context.audiences.primary.join(', ')}`);
  }

  if (context.entities?.locations) {
    parts.push(`Featured destinations: ${context.entities.locations.slice(0, 5).join(', ')}`);
  }

  return parts.join('. ');
}

// Export wrapped version with tracking
export async function getBrandContext(params, context) {
  return trackSkillExecution('get_brand_context', getBrandContextImpl, params, context);
}

export default getBrandContext;
