import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Trophy, Layers } from 'lucide-react';
import { POLLUTION_STATUS_COLORS } from '../utils/aiAnalyzer';

/**
 * Feature 1 — AI Pollution Summary.
 * Auto-generated after each analysis: total waste, per-category counts,
 * dominant type, percentage distribution and overall pollution status.
 */
const AISummary = ({ analysis }) => {
  if (!analysis || !analysis.hasData) return null;

  const { total, dominant, pollutionStatus, summaryText, categories } = analysis;
  const statusColor = POLLUTION_STATUS_COLORS[pollutionStatus] || 'var(--primary)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card"
      style={{ padding: '2rem', marginTop: '2rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <Sparkles size={20} color="var(--primary)" />
        <h3 style={{ fontSize: '1.2rem', margin: 0 }}>AI Pollution Summary</h3>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#fff',
            background: statusColor,
            padding: '0.3rem 0.85rem',
            borderRadius: '99px',
          }}
        >
          {pollutionStatus} Pollution
        </span>
      </div>

      {/* Narrative summary */}
      <p style={{ fontSize: '1.02rem', lineHeight: 1.7, color: 'var(--text-color)', marginBottom: '1.5rem' }}>
        {summaryText}
      </p>

      {/* Headline stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
          marginBottom: total > 0 ? '1.75rem' : 0,
        }}
      >
        <Stat icon={<Layers size={18} />} label="Total Waste" value={total} />
        {dominant && (
          <Stat icon={<Trophy size={18} />} label="Dominant Type" value={dominant.label} sub={`${dominant.percentage}%`} />
        )}
        <Stat
          icon={<Sparkles size={18} />}
          label="Pollution Status"
          value={pollutionStatus}
          valueColor={statusColor}
        />
      </div>

      {/* Percentage distribution */}
      {total > 0 && (
        <div>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '0.75rem', fontWeight: 600 }}>
            Percentage Distribution
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {categories.map((c, i) => (
              <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ minWidth: 150, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                  {c.label}
                </span>
                <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${c.percentage}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08 }}
                    style={{ height: '100%', background: c.color, borderRadius: 99 }}
                  />
                </div>
                <span style={{ minWidth: 96, textAlign: 'right', fontSize: '0.9rem', fontWeight: 700 }}>
                  {c.percentage}% · {c.count}×
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

const Stat = ({ icon, label, value, sub, valueColor }) => (
  <div style={{ background: 'var(--surface-h)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.1rem 1.25rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-dim)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '0.4rem' }}>
      {icon} {label}
    </div>
    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: valueColor || 'var(--text-color)', lineHeight: 1.1 }}>
      {value}
      {sub && <span style={{ fontSize: '0.95rem', color: 'var(--text-dim)', fontWeight: 600, marginLeft: '0.4rem' }}>{sub}</span>}
    </div>
  </div>
);

export default AISummary;
