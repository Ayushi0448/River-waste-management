/**
 * chatAssistant.js — ZIRA's grounded, offline question-answering.
 *
 * Answers are derived STRICTLY from the current `analysis` object
 * (produced by aiAnalyzer.generateAnalysis). It performs no network calls and
 * cannot invent numbers — if the data isn't present, it says so. This makes the
 * assistant hallucination-free and fully functional without any API key.
 */

import { WASTE_CATEGORIES } from '../config/wasteCategories';

export const SUGGESTED_QUESTIONS = [
  'Give me a pollution summary',
  'What is the most common waste type?',
  'What environmental risks exist?',
  'Suggest cleanup recommendations',
];

const listCategories = (analysis) =>
  analysis.categories.map((c) => `${c.label} (${c.count}, ${c.percentage}%)`).join(', ');

// Find a specific waste category referenced in free text.
function matchCategoryInText(q) {
  for (const [key, meta] of Object.entries(WASTE_CATEGORIES)) {
    const needles = [key.toLowerCase(), ...(meta.aliases || [])];
    if (needles.some((n) => q.includes(n))) return key;
  }
  if (q.includes('bottle')) return 'Plastic Bottle';
  if (q.includes('bag')) return 'Plastic Bag';
  if (q.includes('foam') || q.includes('styro')) return 'Foam Waste';
  if (q.includes('metal') || q.includes('can')) return 'Metal Scrap';
  if (q.includes('debris')) return 'Debris';
  return null;
}

/**
 * @param {string} rawQuestion
 * @param {object|null} analysis  result of generateAnalysis()
 * @returns {string} a data-grounded answer
 */
export function answerQuery(rawQuestion, analysis) {
  const q = (rawQuestion || '').toLowerCase().trim();
  if (!q) return 'Please type a question about the current scan.';

  // ── Identity / greeting / help (always available) ──
  if (/\b(hi|hello|hey|greetings|yo)\b/.test(q))
    return "Hello! I'm ZIRA. Ask me about your latest scan — e.g. “give me a pollution summary” or “how many plastic bottles were detected?”";
  if (q.includes('who are you') || q.includes('your name'))
    return 'I am ZIRA, the analysis assistant for pLitter River. I answer questions strictly from your most recent scan results.';
  if (q.includes('help') || (q.includes('what') && q.includes('can you')))
    return `You can ask me: ${SUGGESTED_QUESTIONS.map((s) => `“${s}”`).join(', ')}.`;

  const noData = !analysis || !analysis.hasData || analysis.total === 0;

  // ── "How many X" / counts (works even with zero data) ──
  if (q.includes('how many') || q.includes('count') || q.includes('number of')) {
    const matchedKey = matchCategoryInText(q);
    if (matchedKey) {
      const cat = analysis && analysis.categories.find((c) => c.key === matchedKey);
      const n = cat ? cat.count : 0;
      if (!cat)
        return `0 ${matchedKey.toLowerCase()} items were detected in the latest scan.`;
      return `${n} ${matchedKey.toLowerCase()}${n !== 1 ? ' items were' : ' was'} detected — ${cat.percentage}% of all waste${
        cat.avgConfidence != null ? `, at an average confidence of ${cat.avgConfidence}%.` : '.'
      }`;
    }
    if (noData)
      return 'No waste was detected in the latest scan, so all counts are currently zero. Please upload an image to analyse.';
    return `A total of ${analysis.total} waste objects were detected: ${listCategories(analysis)}.`;
  }

  if (noData) {
    return 'I don’t have any detection data yet. Please upload and analyse a river image first, then I can answer questions about it.';
  }

  // ── Most common / dominant ──
  if (
    q.includes('most common') ||
    q.includes('dominant') ||
    q.includes('biggest') ||
    q.includes('main') ||
    (q.includes('which') && q.includes('most'))
  ) {
    const d = analysis.dominant;
    return `The most common waste type is ${d.label}, with ${d.count} detection${
      d.count !== 1 ? 's' : ''
    } (${d.percentage}% of all detected waste).`;
  }

  // ── Pollution summary / overview ──
  if (q.includes('summary') || q.includes('overview') || q.includes('overall')) {
    return analysis.summaryText;
  }

  // ── Risk ──
  if (q.includes('risk') || q.includes('danger') || q.includes('severe') || q.includes('threat')) {
    const r = analysis.risk;
    return `Pollution Level: ${r.pollutionLevel}. Environmental Risk: ${r.environmentalRisk}. Cleanup Priority: ${r.cleanupPriority}. ${r.recommendedAction}`;
  }

  // ── Environmental impact / harm ──
  if (
    q.includes('impact') ||
    q.includes('environment') ||
    q.includes('harm') ||
    q.includes('affect') ||
    q.includes('ecosystem')
  ) {
    return analysis.impacts.map((i) => `• ${i.text}`).join('\n');
  }

  // ── Recommendations / cleanup / action ──
  if (
    q.includes('recommend') ||
    q.includes('cleanup') ||
    q.includes('clean up') ||
    q.includes('action') ||
    q.includes('should') ||
    q.includes('suggest')
  ) {
    return `Recommended action: ${analysis.risk.recommendedAction} (Cleanup priority: ${analysis.risk.cleanupPriority}.)`;
  }

  // ── Pollution level / status ──
  if (q.includes('pollution') && (q.includes('level') || q.includes('status'))) {
    return `The overall pollution level for this scan is ${analysis.pollutionStatus}.`;
  }

  // ── Totals ──
  if (q.includes('total') || q.includes('how much') || q.includes('detected')) {
    return `A total of ${analysis.total} waste objects were detected: ${listCategories(analysis)}.`;
  }

  // ── Fallback (still grounded) ──
  return `I can answer from the current scan data. Try: ${SUGGESTED_QUESTIONS.map(
    (s) => `“${s}”`
  ).join(', ')}. (This scan found ${analysis.total} waste objects; the dominant type is ${
    analysis.dominant.label
  }.)`;
}

export default answerQuery;
