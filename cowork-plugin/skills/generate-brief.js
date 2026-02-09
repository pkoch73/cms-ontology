/**
 * Generate Brief Skill
 *
 * Creates AI-powered content briefs using ontology context.
 * Provides actionable guidance for content creation.
 */

import { trackSkillExecution } from '../../track-skills/client/tracking.js';

async function generateContentBriefImpl(params, context) {
  const { apiBaseUrl, apiKey } = context;

  if (!params.topic || !params.content_type) {
    throw new Error('topic and content_type are required parameters');
  }

  const response = await fetch(`${apiBaseUrl}/api/brief`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      topic: params.topic,
      content_type: params.content_type,
      funnel_stage: params.funnel_stage || 'consideration',
      target_audience: params.target_audience
    })
  });

  if (!response.ok) {
    throw new Error(`Brief generation failed: ${response.statusText}`);
  }

  const brief = await response.json();

  return {
    success: true,
    brief: {
      topic: brief.topic,
      content_type: brief.content_type,
      funnel_stage: brief.funnel_stage,
      target_audience: brief.target_audience,

      context: {
        existing_content_count: brief.context.existing_count,
        existing_pages: brief.context.existing_content.map(p => ({
          path: p.path,
          title: p.title,
          stage: p.funnel_stage
        })),
        related_topics: brief.context.related_topics,
        known_audiences: brief.context.known_audiences,
        key_entities: brief.context.entities.map(e => `${e.name} (${e.type})`)
      },

      recommendations: {
        title_suggestions: brief.recommendations.title_patterns,
        key_elements: brief.recommendations.key_elements,
        internal_links: brief.recommendations.internal_links,
        seo_keywords: brief.recommendations.seo_keywords
      },

      brief_text: brief.brief_text
    }
  };
}

// Export wrapped version with tracking
export async function generateContentBrief(params, context) {
  return trackSkillExecution('generate_content_brief', generateContentBriefImpl, params, context);
}

export default generateContentBrief;
