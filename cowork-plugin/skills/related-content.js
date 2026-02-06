/**
 * Related Content Skill
 *
 * Finds content related to a specific page or topic.
 * Useful for internal linking and content clusters.
 */

export async function getRelatedContent(params, context) {
  const { apiBaseUrl, apiKey } = context;

  if (!params.path) {
    throw new Error('path is required');
  }

  const queryParams = new URLSearchParams();
  queryParams.set('path', params.path);
  if (params.relationship) queryParams.set('relationship', params.relationship);

  const response = await fetch(`${apiBaseUrl}/api/related?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Related content lookup failed: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    success: true,
    source_page: data.source,
    related: {
      by_topic: data.related.same_topic?.map(p => ({
        path: p.path,
        title: p.title,
        type: p.content_type,
        stage: p.funnel_stage,
        link_context: `Related ${data.source.topic} content`
      })) || [],

      by_funnel_stage: data.related.same_funnel_stage?.map(p => ({
        path: p.path,
        title: p.title,
        type: p.content_type,
        topic: p.primary_topic,
        link_context: `Other ${data.source.funnel_stage}-stage content`
      })) || [],

      by_audience: data.related.same_audience?.map(p => ({
        path: p.path,
        title: p.title,
        type: p.content_type,
        topic: p.primary_topic,
        link_context: 'Appeals to similar audience'
      })) || []
    },
    linking_suggestions: generateLinkingSuggestions(data)
  };
}

function generateLinkingSuggestions(data) {
  const suggestions = [];

  // Suggest cross-funnel links
  if (data.related.same_topic?.length > 0) {
    const differentStage = data.related.same_topic.find(
      p => p.funnel_stage !== data.source.funnel_stage
    );
    if (differentStage) {
      suggestions.push({
        target: differentStage.path,
        reason: `Link to ${differentStage.funnel_stage}-stage content to guide user journey`,
        anchor_suggestion: differentStage.funnel_stage === 'decision'
          ? 'Book this adventure'
          : differentStage.funnel_stage === 'awareness'
            ? 'Learn more about ' + data.source.topic
            : 'Explore ' + differentStage.title
      });
    }
  }

  // Suggest topic cluster links
  if (data.related.same_topic?.length >= 2) {
    suggestions.push({
      type: 'cluster',
      reason: 'Build topic cluster with related content',
      pages: data.related.same_topic.slice(0, 3).map(p => p.path)
    });
  }

  return suggestions;
}

export default getRelatedContent;
