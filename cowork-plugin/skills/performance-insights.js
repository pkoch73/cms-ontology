/**
 * Performance Insights Skill
 *
 * Provides performance data and insights from RUM analytics
 * to inform content strategy and optimization.
 */

export async function getPerformanceInsights(params, context) {
  const { apiBaseUrl, apiKey } = context;

  // Get top performers and underperformers
  const performersResponse = await fetch(`${apiBaseUrl}/api/top-performers?limit=5`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  // Get performance patterns
  const patternsResponse = await fetch(`${apiBaseUrl}/api/performance-patterns`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!performersResponse.ok || !patternsResponse.ok) {
    throw new Error('Failed to fetch performance data');
  }

  const performers = await performersResponse.json();
  const patterns = await patternsResponse.json();

  return {
    success: true,

    top_performers: performers.top_performers.map(p => ({
      path: p.path,
      title: p.title,
      topic: p.primary_topic,
      score: p.overall_score,
      why: explainSuccess(p)
    })),

    needs_improvement: performers.needs_improvement.map(p => ({
      path: p.path,
      title: p.title,
      topic: p.primary_topic,
      score: p.overall_score,
      issues: identifyIssues(p)
    })),

    patterns: {
      best_topics: patterns.patterns.topic_performance?.slice(0, 3).map(p => ({
        topic: p.value,
        score: p.score,
        insight: p.insight
      })) || [],

      best_content_types: patterns.patterns.content_type_performance?.slice(0, 3).map(p => ({
        type: p.value,
        score: p.score,
        insight: p.insight
      })) || [],

      funnel_insights: patterns.patterns.funnel_stage_performance?.map(p => ({
        stage: p.value,
        score: p.score,
        insight: p.insight
      })) || []
    },

    recommendations: [
      ...performers.insights,
      ...patterns.recommendations
    ],

    summary: generatePerformanceSummary(performers, patterns)
  };
}

function explainSuccess(page) {
  const reasons = [];

  if (page.performance_score > 85) {
    reasons.push('Excellent Core Web Vitals');
  }
  if (page.engagement_score > 70) {
    reasons.push('High user engagement');
  }
  if (page.conversion_score > 10) {
    reasons.push('Strong conversion rate');
  }

  return reasons.length > 0 ? reasons.join(', ') : 'Balanced performance across metrics';
}

function identifyIssues(page) {
  const issues = [];

  if (page.performance_score < 70) {
    issues.push('Slow page load (optimize images, reduce JS)');
  }
  if (page.engagement_score < 55) {
    issues.push('Low engagement (improve content relevance)');
  }
  if (page.conversion_score < 6) {
    issues.push('Low conversions (add clearer CTAs)');
  }

  return issues.length > 0 ? issues : ['General optimization needed'];
}

function generatePerformanceSummary(performers, patterns) {
  const topTopic = patterns.patterns.topic_performance?.[0]?.value || 'N/A';
  const topType = patterns.patterns.content_type_performance?.[0]?.value || 'N/A';
  const avgScore = performers.top_performers.reduce((a, p) => a + p.overall_score, 0) / performers.top_performers.length;

  return `Top performers average ${Math.round(avgScore)} score. Best topic: ${topTopic}. Best content type: ${topType}. ${performers.insights[0] || ''}`;
}

export async function getPagePerformance(params, context) {
  const { apiBaseUrl, apiKey } = context;

  if (!params.path) {
    throw new Error('path is required');
  }

  const response = await fetch(`${apiBaseUrl}/api/performance?path=${encodeURIComponent(params.path)}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch page performance');
  }

  const data = await response.json();

  return {
    success: true,
    page: data.page,
    scores: data.scores,
    recent_metrics: data.performance?.slice(0, 7) || [],
    analysis: analyzePagePerformance(data)
  };
}

function analyzePagePerformance(data) {
  if (!data.scores) {
    return { status: 'No performance data available' };
  }

  const analysis = {
    status: data.scores.overall > 55 ? 'Performing well' :
            data.scores.overall > 45 ? 'Average performance' :
            'Needs improvement',
    strengths: [],
    weaknesses: []
  };

  if (data.scores.performance > 80) {
    analysis.strengths.push('Fast loading times');
  } else if (data.scores.performance < 70) {
    analysis.weaknesses.push('Page speed optimization needed');
  }

  if (data.scores.engagement > 70) {
    analysis.strengths.push('Good user engagement');
  } else if (data.scores.engagement < 55) {
    analysis.weaknesses.push('Improve content engagement');
  }

  if (data.scores.conversion > 8) {
    analysis.strengths.push('Strong conversion performance');
  } else if (data.scores.conversion < 5) {
    analysis.weaknesses.push('Add clearer conversion paths');
  }

  return analysis;
}

export default { getPerformanceInsights, getPagePerformance };
