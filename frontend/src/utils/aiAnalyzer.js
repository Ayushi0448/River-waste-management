/**
 * aiAnalyzer.js — the AI insight engine.
 *
 * Pure, deterministic functions that turn the detection model's output
 * (counts + confidence scores) into:
 *   1. an AI Pollution Summary,
 *   2. an Environmental Impact Analysis,
 *   3. a Risk Assessment.
 *
 * It NEVER calls the detector or invents detections — it only describes what
 * the detection pipeline already returned, normalised through the central
 * waste-category config. Everything here is data-grounded (no hallucination).
 */

import { normalizeCategory, getCategoryMeta } from '../config/wasteCategories';

// Pollution status is driven by the total number of detected objects.
// Tune these thresholds in one place.
const STATUS_THRESHOLDS = [
  { min: 50, status: 'Critical' },
  { min: 30, status: 'High' },
  { min: 10, status: 'Moderate' },
  { min: 0, status: 'Low' },
];

/** Shared colour mapping for a pollution status badge (CSS vars / hex). */
export const POLLUTION_STATUS_COLORS = {
  Low: 'var(--success)',
  Moderate: 'var(--warning)',
  High: '#f97316',
  Critical: 'var(--danger)',
};

const RISK_PROFILE = {
  Critical: { environmentalRisk: 'Severe', cleanupPriority: 'Immediate' },
  High: { environmentalRisk: 'High', cleanupPriority: 'High' },
  Moderate: { environmentalRisk: 'Moderate', cleanupPriority: 'Medium' },
  Low: { environmentalRisk: 'Low', cleanupPriority: 'Routine' },
};

function pollutionStatusFor(total) {
  return STATUS_THRESHOLDS.find((t) => total >= t.min).status;
}

/**
 * Aggregate raw detections into canonical categories.
 * Prefers the per-detection array (gives us confidence); falls back to the
 * backend's summary.classes map when only counts are available.
 */
function bucketDetections(detectionResults) {
  const buckets = {}; // canonicalKey -> { count, confSum }
  const add = (key, count, confSum = 0) => {
    const b = buckets[key] || (buckets[key] = { count: 0, confSum: 0 });
    b.count += count;
    b.confSum += confSum;
  };

  const detections = detectionResults.detections || [];
  if (detections.length) {
    for (const d of detections) {
      add(normalizeCategory(d.class), 1, Number(d.confidence) || 0);
    }
  } else if (detectionResults.summary && detectionResults.summary.classes) {
    for (const [raw, count] of Object.entries(detectionResults.summary.classes)) {
      add(normalizeCategory(raw), Number(count) || 0);
    }
  }
  return buckets;
}

function recommendedActionFor(status, dominantLabel) {
  const item = dominantLabel ? dominantLabel.toLowerCase() : 'plastic waste';
  switch (status) {
    case 'Critical':
      return `Urgent cleanup required. Mobilise cleanup crews immediately to remove the high volume of waste, prioritising ${item} removal.`;
    case 'High':
      return `Schedule a cleanup operation soon. Prioritise removal of ${item} to prevent it spreading further downstream.`;
    case 'Moderate':
      return `Organise a community cleanup event and continue monitoring the area for increasing accumulation of ${item}.`;
    default:
      return 'Maintain regular monitoring of the area; pollution levels are currently low.';
  }
}

/**
 * @param {object|null} detectionResults  the JSON returned by POST /detect
 * @returns {object}  structured analysis (see fields below). `hasData` is
 *                    false when there is nothing to analyse.
 */
export function generateAnalysis(detectionResults) {
  if (!detectionResults) {
    return { hasData: false, total: 0, categories: [], impacts: [] };
  }

  const buckets = bucketDetections(detectionResults);
  const total = Object.values(buckets).reduce((s, b) => s + b.count, 0);

  const categories = Object.entries(buckets)
    .map(([key, b]) => {
      const meta = getCategoryMeta(key);
      return {
        key,
        label: meta.label,
        color: meta.color,
        impact: meta.impact,
        count: b.count,
        percentage: total ? Math.round((b.count / total) * 100) : 0,
        avgConfidence: b.count ? Math.round((b.confSum / b.count) * 100) : null,
      };
    })
    .sort((a, b) => b.count - a.count);

  const dominant = categories[0] || null;
  const pollutionStatus = pollutionStatusFor(total);

  const summaryText =
    total > 0
      ? `A total of ${total} waste object${total !== 1 ? 's were' : ' was'} detected. ` +
        `${dominant.label}${dominant.count !== 1 ? 's are' : ' is'} the dominant category, ` +
        `representing ${dominant.percentage}% of all detected waste. ` +
        `Overall pollution level is ${pollutionStatus}.`
      : 'No waste objects were detected in this image — the water appears clean. Overall pollution level is Low.';

  // Environmental impact: ONLY for categories actually present.
  const impacts = categories.map((c) => ({ key: c.key, label: c.label, text: c.impact }));

  const profile = RISK_PROFILE[pollutionStatus];
  const recommendedAction =
    total === 0
      ? 'No action required. Continue routine monitoring of this location.'
      : recommendedActionFor(pollutionStatus, dominant.label);

  const detections = detectionResults.detections || [];
  const avgConfidence = detections.length
    ? Math.round(
        (detections.reduce((s, d) => s + (Number(d.confidence) || 0), 0) / detections.length) * 100
      )
    : null;

  return {
    hasData: true,
    total,
    categories, // [{ key, label, color, impact, count, percentage, avgConfidence }]
    dominant, // strongest category or null
    pollutionStatus, // 'Low' | 'Moderate' | 'High' | 'Critical'
    summaryText,
    impacts, // [{ key, label, text }] — present categories only
    avgConfidence,
    risk: {
      pollutionLevel: pollutionStatus,
      environmentalRisk: profile.environmentalRisk,
      cleanupPriority: profile.cleanupPriority,
      recommendedAction,
    },
    resultImage: detectionResults.result_image || null,
    modelUsed:
      (detectionResults.summary && detectionResults.summary.model) ||
      detectionResults.model_used ||
      null,
  };
}

export default generateAnalysis;
