import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Gauge, Clock, Target } from 'lucide-react';
import { POLLUTION_STATUS_COLORS } from '../utils/aiAnalyzer';

/**
 * Feature 3 — Risk Assessment System.
 * Derives Pollution Level, Environmental Risk, Cleanup Priority and a
 * Recommended Action from the amount of detected waste.
 */
const RiskAssessment = ({ analysis }) => {
  if (!analysis || !analysis.hasData) return null;

  const { risk } = analysis;
  const levelColor = POLLUTION_STATUS_COLORS[risk.pollutionLevel] || 'var(--primary)';

  const metrics = [
    { icon: <Gauge size={18} />, label: 'Pollution Level', value: risk.pollutionLevel, color: levelColor },
    { icon: <ShieldAlert size={18} />, label: 'Environmental Risk', value: risk.environmentalRisk },
    { icon: <Clock size={18} />, label: 'Cleanup Priority', value: risk.cleanupPriority },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="glass-card"
      style={{ padding: '2rem', marginTop: '2rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <ShieldAlert size={20} color="var(--danger)" />
        <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Risk Assessment</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {metrics.map((m) => (
          <div key={m.label} style={{ background: 'var(--surface-h)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '0.5rem' }}>
              {m.icon} {m.label}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: m.color || 'var(--text-color)' }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', background: 'var(--primary-light)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.1rem 1.25rem' }}>
        <Target size={18} color="var(--primary)" style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.3rem' }}>
            Recommended Action
          </div>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-color)' }}>{risk.recommendedAction}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default RiskAssessment;
