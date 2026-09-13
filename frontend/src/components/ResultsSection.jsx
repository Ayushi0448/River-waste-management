import React from 'react';
import { motion } from 'framer-motion';
import { Activity, LayoutGrid, Gauge } from 'lucide-react';
import DetectionViewer from './DetectionViewer';

/**
 * Detection results view. Uses the normalised `analysis` (canonical categories)
 * so the dashboard, AI insights and report all speak the same vocabulary.
 */
const ResultsSection = ({ data, analysis }) => {
  const result_image = data?.result_image;
  const total = analysis?.total || 0;
  const categories = analysis?.categories || [];
  const avgConfidence = analysis?.avgConfidence ?? 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {/* Total Objects */}
        <motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <Activity size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Objects</h3>
          <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-color)' }}>{total}</div>
        </motion.div>

        {/* Avg Confidence */}
        {total > 0 && avgConfidence != null && (
          <motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Gauge size={32} color="var(--success)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Avg Confidence</h3>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-color)' }}>{avgConfidence}%</div>
          </motion.div>
        )}

        {/* Waste Distribution */}
        <motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '2rem', gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <LayoutGrid size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Waste Distribution</h3>
          </div>

          {categories.length === 0 ? (
            <p style={{ color: 'var(--text-dim)' }}>No litter detected — the water appears clean.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
              {categories.map((c) => (
                <div key={c.key} style={{ background: 'var(--surface-h)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{c.percentage}%</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.4rem' }}>{c.count} item{c.count !== 1 ? 's' : ''}</div>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${c.percentage}%`, background: c.color, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Confidence by category */}
      {categories.length > 0 && (
        <motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Gauge size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Confidence by Category</h3>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '0.3rem 0.75rem', borderRadius: '99px' }}>
              {total} item{total !== 1 ? 's' : ''} total
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {categories.map((c, i) => (
              <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 200 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.9rem' }}>{c.label}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>×{c.count}</span>
                </div>
                <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${c.avgConfidence ?? 0}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08 }}
                    style={{ height: '100%', background: c.color, borderRadius: 99 }}
                  />
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, minWidth: 78, textAlign: 'right' }}>{c.avgConfidence ?? 0}% avg</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Annotated Image */}
      {result_image && <DetectionViewer key={result_image} data={data} />}
    </motion.section>
  );
};

export default ResultsSection;
