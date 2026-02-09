/**
 * Content Gaps Skill
 *
 * Identifies content gaps in the inventory by analyzing
 * topic coverage across funnel stages.
 */

import { trackSkillExecution } from '../../track-skills/client/tracking.js';

async function getContentGapsImpl(params, context) {
  const { apiBaseUrl, apiKey } = context;

  const queryParams = new URLSearchParams();
  if (params.topic) queryParams.set('topic', params.topic);
  if (params.funnel_stage) queryParams.set('funnel_stage', params.funnel_stage);

  const response = await fetch(`${apiBaseUrl}/api/gaps?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Gap analysis failed: ${response.statusText}`);
  }

  const result = await response.json();

  // Sort by priority
  const sortedGaps = result.gaps.sort((a, b) => {
    if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (b.priority === 'high' && a.priority !== 'high') return 1;
    return b.missing_stages.length - a.missing_stages.length;
  });

  return {
    success: true,
    total_gaps: sortedGaps.length,
    high_priority: sortedGaps.filter(g => g.priority === 'high').length,
    gaps: sortedGaps.map(gap => ({
      topic: gap.topic,
      priority: gap.priority,
      existing_pages: gap.total_pages,
      coverage: gap.coverage,
      missing: gap.missing_stages,
      recommendation: gap.recommendation
    })),
    summary: formatGapSummary(sortedGaps)
  };
}

function formatGapSummary(gaps) {
  const highPriority = gaps.filter(g => g.priority === 'high');
  const missingDecision = gaps.filter(g => g.missing_stages.includes('decision'));
  const missingAwareness = gaps.filter(g => g.missing_stages.includes('awareness'));

  const parts = [];

  if (highPriority.length > 0) {
    parts.push(`${highPriority.length} high-priority topics need attention`);
  }

  if (missingDecision.length > 0) {
    parts.push(`${missingDecision.length} topics lack decision-stage content`);
  }

  if (missingAwareness.length > 0) {
    parts.push(`${missingAwareness.length} topics lack awareness content`);
  }

  return parts.join('. ') || 'No significant content gaps found.';
}

// Export wrapped version with tracking
export async function getContentGaps(params, context) {
  return trackSkillExecution('get_content_gaps', getContentGapsImpl, params, context);
}

export default getContentGaps;
