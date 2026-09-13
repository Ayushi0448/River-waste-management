import React, { useEffect, useState } from 'react';
import { Clock, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE, apiUrl } from '../config/api';
import { normalizeCategory, getCategoryMeta } from '../config/wasteCategories';

// Re-aggregate the backend's raw class_summary into canonical categories so
// history chips match the rest of the UI (e.g. "Foam / Styrofoam" → "Foam Waste").
const normalizeSummary = (raw = {}) => {
  const out = {};
  for (const [cls, count] of Object.entries(raw)) {
    const key = normalizeCategory(cls);
    out[key] = (out[key] || 0) + count;
  }
  return out;
};

const HistorySection = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/history`);
      const data = await res.json();
      if (res.ok && data.success) {
        setHistory(data.history);
      } else {
        setError(data.error || 'Failed to load history.');
      }
    } catch (err) {
      setError('Network error. Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all history? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/history`, { method: 'DELETE' });
      if (res.ok) setHistory([]);
    } catch (err) {
      alert('Failed to clear history.');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Delete this scan record?')) return;
    try {
      const res = await fetch(`${API_BASE}/history/${id}`, { method: 'DELETE' });
      if (res.ok) setHistory((prev) => prev.filter((session) => session.id !== id));
    } catch (err) {
      alert('Failed to delete record.');
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } };

  return (
    <section id="history-section" style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }} className="text-gradient">
          Analysis History
        </h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {history.length > 0 && (
            <button onClick={handleClearAll} className="btn btn-ghost" style={{ color: 'var(--danger)' }}>
              <Trash2 size={16} /> Clear All
            </button>
          )}
          <button onClick={fetchHistory} className="btn btn-ghost">
            <Clock size={16} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
            <Loader2 size={32} color="var(--primary)" />
          </motion.div>
        </div>
      ) : error ? (
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--danger)', padding: '2rem' }}>
          <AlertCircle size={18} /> {error}
        </div>
      ) : history.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
          No past scans found in the database.
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {history.map((session) => {
            const summary = normalizeSummary(session.class_summary);
            return (
              <motion.div variants={itemVariants} whileHover={{ scale: 1.01 }} key={session.id} className="glass-card" style={{ display: 'flex', gap: '1.5rem', padding: '1.5rem' }}>
                <div style={{ width: '150px', height: '150px', flexShrink: 0, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={apiUrl(session.result_image)} alt="Scan result" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>{new Date(session.timestamp).toLocaleString()}</span>
                    <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: 'var(--primary-light)', borderRadius: '99px', color: 'var(--primary)', fontWeight: 600 }}>
                      {session.model_used.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-color)' }}>
                    {session.total_detections} Total Detections
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {Object.entries(summary).map(([cls, count]) => {
                        const t = session.total_detections || 0;
                        const pct = t ? Math.round((count / t) * 100) : 0;
                        const meta = getCategoryMeta(cls);
                        return (
                          <span key={cls} title={`${count} item${count !== 1 ? 's' : ''}`} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--surface-h)', border: '1px solid var(--border)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: meta.color }}></span>
                            {meta.label}: <strong style={{ color: 'var(--text-color)' }}>{pct}%</strong>
                          </span>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handleDeleteItem(session.id)}
                      className="btn-ghost"
                      style={{ padding: '0.5rem', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      title="Delete record"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </section>
  );
};

export default HistorySection;
