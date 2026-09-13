import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Info, ShieldAlert, Leaf, Download, Copy, Printer, Check } from 'lucide-react';
import { POLLUTION_STATUS_COLORS } from '../utils/aiAnalyzer';

/**
 * Feature 5 — Automatic Report Generator.
 * Auto-fills an editable report from the analysis (date/time, totals,
 * category breakdown, AI summary, environmental impact, risk assessment,
 * recommendations) and lets the user edit every narrative field, then
 * Copy / Download (Markdown) / Print the result.
 */
const ReportSection = ({ analysis }) => {
  // Editable narrative state — seeded from the analysis, then user-owned.
  const [title, setTitle] = useState('pLitter River — AI Pollution Report');
  const [summaryText, setSummaryText] = useState('');
  const [impacts, setImpacts] = useState([]); // [{ label, text }]
  const [recommendedAction, setRecommendedAction] = useState('');
  const [notes, setNotes] = useState('');
  const [generatedAt, setGeneratedAt] = useState('');
  const [copied, setCopied] = useState(false);

  // Re-seed editable fields whenever a fresh analysis arrives.
  useEffect(() => {
    if (!analysis || !analysis.hasData) return;
    setSummaryText(analysis.summaryText);
    setImpacts(analysis.impacts.map((i) => ({ label: i.label, text: i.text })));
    setRecommendedAction(analysis.risk.recommendedAction);
    setGeneratedAt(new Date().toLocaleString());
  }, [analysis]);

  if (!analysis || !analysis.hasData) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card"
        style={{ textAlign: 'center', padding: '6rem 2rem', color: 'var(--text-dim)' }}
      >
        <Info size={48} style={{ margin: '0 auto 1rem', opacity: 0.5, color: 'var(--primary)' }} />
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No Data Available</h2>
        <p>Please run a detection in the Dashboard first to generate an AI report.</p>
      </motion.div>
    );
  }

  const { total, categories, dominant, pollutionStatus, avgConfidence, risk } = analysis;
  const levelColor = POLLUTION_STATUS_COLORS[pollutionStatus] || 'var(--primary)';

  const buildMarkdown = () => {
    const rows = categories
      .map((c) => `| ${c.label} | ${c.count} | ${c.percentage}% | ${c.avgConfidence != null ? c.avgConfidence + '%' : '—'} |`)
      .join('\n');
    const impactLines = impacts.map((i) => `- **${i.label}:** ${i.text}`).join('\n');
    return [
      `# ${title}`,
      ``,
      `**Generated:** ${generatedAt}`,
      ``,
      `## Overview`,
      `- **Total waste detected:** ${total}`,
      `- **Pollution level:** ${pollutionStatus}`,
      dominant ? `- **Dominant type:** ${dominant.label} (${dominant.percentage}%)` : '',
      avgConfidence != null ? `- **Average confidence:** ${avgConfidence}%` : '',
      ``,
      `## Category Breakdown`,
      `| Category | Count | Share | Avg. Confidence |`,
      `| --- | --- | --- | --- |`,
      rows,
      ``,
      `## AI Summary`,
      summaryText,
      ``,
      `## Environmental Impact Analysis`,
      impactLines,
      ``,
      `## Risk Assessment`,
      `- **Pollution Level:** ${risk.pollutionLevel}`,
      `- **Environmental Risk:** ${risk.environmentalRisk}`,
      `- **Cleanup Priority:** ${risk.cleanupPriority}`,
      `- **Recommended Action:** ${recommendedAction}`,
      notes ? `\n## Notes\n${notes}` : '',
      ``,
    ]
      .filter((l) => l !== '')
      .join('\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const handleDownload = () => {
    const blob = new Blob([buildMarkdown()], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plitter-report-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  const sectionStyle = { padding: '2rem' };
  const updateImpact = (idx, value) =>
    setImpacts((prev) => prev.map((it, i) => (i === idx ? { ...it, text: value } : it)));

  return (
    <motion.section variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }} className="text-gradient">
            AI Pollution Report
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Generated: {generatedAt}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleCopy} className="btn btn-ghost" style={{ border: '1px solid var(--border)' }}>
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={handleDownload} className="btn btn-ghost" style={{ border: '1px solid var(--border)' }}>
            <Download size={16} /> Download
          </button>
          <button onClick={() => window.print()} className="btn btn-ghost" style={{ border: '1px solid var(--border)' }}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {/* Editable title */}
      <motion.div variants={itemVariants} className="glass-card" style={sectionStyle}>
        <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-dim)', fontWeight: 600 }}>Report Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', marginTop: '0.5rem', fontSize: '1.05rem', fontWeight: 600 }} />
      </motion.div>

      {/* Overview + breakdown (factual) */}
      <motion.div variants={itemVariants} className="glass-card" style={sectionStyle}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--primary)', fontSize: '1.2rem' }}>
          <FileText size={20} /> Overview &amp; Category Breakdown
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <MiniStat label="Total Waste" value={total} />
          <MiniStat label="Pollution Level" value={pollutionStatus} color={levelColor} />
          {dominant && <MiniStat label="Dominant Type" value={`${dominant.label} (${dominant.percentage}%)`} />}
          {avgConfidence != null && <MiniStat label="Avg Confidence" value={`${avgConfidence}%`} />}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-dim)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '0.5rem' }}>Category</th>
                <th style={{ padding: '0.5rem' }}>Count</th>
                <th style={{ padding: '0.5rem' }}>Share</th>
                <th style={{ padding: '0.5rem' }}>Avg Conf.</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.key} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.6rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.color }} /> {c.label}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', fontWeight: 700 }}>{c.count}</td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>{c.percentage}%</td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>{c.avgConfidence != null ? `${c.avgConfidence}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Editable AI summary */}
      <motion.div variants={itemVariants} className="glass-card" style={sectionStyle}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--primary)', fontSize: '1.2rem' }}>
          <FileText size={20} /> AI Summary
        </h3>
        <textarea value={summaryText} onChange={(e) => setSummaryText(e.target.value)} style={{ width: '100%', minHeight: '90px', resize: 'vertical', lineHeight: 1.6 }} />
      </motion.div>

      {/* Editable environmental impact (one field per present category) */}
      <motion.div variants={itemVariants} className="glass-card" style={sectionStyle}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--success)', fontSize: '1.2rem' }}>
          <Leaf size={20} /> Environmental Impact Analysis
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {impacts.map((im, idx) => (
            <div key={im.label}>
              <div style={{ fontWeight: 700, marginBottom: '0.4rem', fontSize: '0.95rem' }}>{im.label}</div>
              <textarea value={im.text} onChange={(e) => updateImpact(idx, e.target.value)} style={{ width: '100%', minHeight: '64px', resize: 'vertical', lineHeight: 1.6 }} />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Risk assessment (metrics factual, action editable) */}
      <motion.div variants={itemVariants} className="glass-card" style={sectionStyle}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--danger)', fontSize: '1.2rem' }}>
          <ShieldAlert size={20} /> Risk Assessment
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <MiniStat label="Pollution Level" value={risk.pollutionLevel} color={levelColor} />
          <MiniStat label="Environmental Risk" value={risk.environmentalRisk} />
          <MiniStat label="Cleanup Priority" value={risk.cleanupPriority} />
        </div>
        <label style={{ fontSize: '0.95rem', fontWeight: 600 }}>Recommended Action</label>
        <textarea value={recommendedAction} onChange={(e) => setRecommendedAction(e.target.value)} style={{ width: '100%', minHeight: '64px', resize: 'vertical', marginTop: '0.5rem', lineHeight: 1.6 }} />
      </motion.div>

      {/* Free-form notes */}
      <motion.div variants={itemVariants} className="glass-card" style={sectionStyle}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Additional Notes</h3>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any field observations or follow-up actions here..." style={{ width: '100%', minHeight: '70px', resize: 'vertical', lineHeight: 1.6 }} />
      </motion.div>
    </motion.section>
  );
};

const MiniStat = ({ label, value, color }) => (
  <div style={{ background: 'var(--surface-h)', padding: '1.1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '0.4rem' }}>{label}</div>
    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: color || 'var(--text-color)' }}>{value}</div>
  </div>
);

export default ReportSection;
