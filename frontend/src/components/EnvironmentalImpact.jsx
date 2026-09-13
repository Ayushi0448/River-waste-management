import React from 'react';
import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';

/**
 * Feature 2 — Environmental Impact Analysis.
 * Renders a short educational explanation for EACH category that is actually
 * present in the scan (nothing is shown for categories that were not detected).
 */
const EnvironmentalImpact = ({ analysis }) => {
  if (!analysis || !analysis.hasData || analysis.impacts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="glass-card"
      style={{ padding: '2rem', marginTop: '2rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <Leaf size={20} color="var(--success)" />
        <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Environmental Impact Analysis</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {analysis.categories.map((c) => (
          <motion.div
            key={c.key}
            whileHover={{ y: -3 }}
            style={{
              background: 'var(--surface-h)',
              border: '1px solid var(--border)',
              borderLeft: `4px solid ${c.color}`,
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: c.color }} />
                {c.label}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                {c.count}× · {c.percentage}%
              </span>
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-dim)' }}>{c.impact}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default EnvironmentalImpact;
