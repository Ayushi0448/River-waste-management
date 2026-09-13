import React, { useMemo, useState } from 'react';
import { CheckCircle, Eye, EyeOff, SlidersHorizontal, ExternalLink } from 'lucide-react';
import { apiUrl } from '../config/api';
import { CATEGORY_ORDER, getCategoryMeta, normalizeCategory } from '../config/wasteCategories';

// Display bounds: small uploads are upscaled only this far, tall ones are
// narrowed so the whole frame stays on screen.
const MIN_DISPLAY_W = 640;
const MAX_DISPLAY_H = 720;

/**
 * Interactive detection view. Boxes are drawn as a vector overlay on the
 * original upload instead of relying on the server's baked-in labels, which
 * bury small or crowded images. Labels appear on hover/tap; the legend and
 * confidence slider let the user declutter dense scenes.
 */
const DetectionViewer = ({ data }) => {
  const [size, setSize] = useState(null);
  const [minConf, setMinConf] = useState(0);
  const [hidden, setHidden] = useState(() => new Set());
  const [showBoxes, setShowBoxes] = useState(true);
  const [active, setActive] = useState(null);

  const imageSrc = data?.original_image || data?.result_image;
  const canOverlay = Boolean(data?.original_image);

  const items = useMemo(
    () =>
      (data?.detections || [])
        .map((d, i) => {
          const meta = getCategoryMeta(normalizeCategory(d.class));
          const [x, y, w, h] = d.bbox;
          return { i, key: normalizeCategory(d.class), label: meta.label, color: meta.color, conf: Math.round(d.confidence * 100), x, y, w, h };
        })
        // Largest first so smaller boxes sit on top and stay hoverable.
        .sort((a, b) => b.w * b.h - a.w * a.h),
    [data]
  );

  const passing = items.filter((it) => it.conf >= minConf);
  const visible = showBoxes ? passing.filter((it) => !hidden.has(it.key)) : [];

  const legend = CATEGORY_ORDER.map((key) => ({
    key,
    ...getCategoryMeta(key),
    count: passing.filter((it) => it.key === key).length,
    total: items.filter((it) => it.key === key).length,
  })).filter((c) => c.total > 0);

  const toggleCategory = (key) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const displayMaxW = size
    ? Math.min(Math.max(size.w, MIN_DISPLAY_W), (MAX_DISPLAY_H * size.w) / size.h)
    : undefined;

  const activeItem = visible.find((it) => it.i === active);

  const tooltipStyle = (it) => {
    const style = {};
    const nearTop = it.y / size.h < 0.12;
    const nearRight = (it.x + it.w / 2) / size.w > 0.65;
    if (nearTop) style.top = `calc(${((it.y + it.h) / size.h) * 100}% + 6px)`;
    else {
      style.top = `calc(${(it.y / size.h) * 100}% - 6px)`;
      style.transform = 'translateY(-100%)';
    }
    if (nearRight) style.right = `${(1 - (it.x + it.w) / size.w) * 100}%`;
    else style.left = `${(it.x / size.w) * 100}%`;
    return style;
  };

  return (
    <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={20} color="var(--success)" /> Analysis Complete
        </h3>
        {canOverlay && items.length > 0 && (
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            Showing <strong style={{ color: 'var(--text-color)' }}>{visible.length}</strong> of {items.length} detections
          </span>
        )}
      </div>

      {canOverlay && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {legend.map((c) => {
              const off = hidden.has(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggleCategory(c.key)}
                  aria-pressed={!off}
                  title={off ? `Show ${c.label}` : `Hide ${c.label}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                    padding: '0.35rem 0.75rem', borderRadius: 99, cursor: 'pointer',
                    fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit',
                    color: off ? 'var(--text-dim)' : 'var(--text-color)',
                    background: off ? 'transparent' : 'var(--surface-h)',
                    border: `1px solid ${off ? 'var(--border)' : c.color}`,
                    opacity: off ? 0.6 : 1, transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: off ? 'var(--border-h)' : c.color }} />
                  {c.label}
                  <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>{c.count}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-dim)', flex: '1 1 260px' }}>
              <SlidersHorizontal size={16} />
              <span style={{ whiteSpace: 'nowrap' }}>Min confidence</span>
              <input
                type="range" min={0} max={90} step={5} value={minConf}
                onChange={(e) => setMinConf(Number(e.target.value))}
                style={{ flex: 1, padding: 0, accentColor: 'var(--primary)', background: 'transparent', border: 'none', boxShadow: 'none' }}
              />
              <strong style={{ color: 'var(--text-color)', minWidth: 36, textAlign: 'right' }}>{minConf}%</strong>
            </label>
            <button type="button" className="btn btn-ghost" onClick={() => setShowBoxes((s) => !s)} style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', border: '1px solid var(--border)' }}>
              {showBoxes ? <EyeOff size={16} /> : <Eye size={16} />} {showBoxes ? 'Hide boxes' : 'Show boxes'}
            </button>
          </div>
        </div>
      )}

      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '0.75rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: displayMaxW, margin: '0 auto' }} onMouseLeave={() => setActive(null)}>
          <img
            src={apiUrl(imageSrc)}
            alt="Scanned river image with detected litter"
            onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            style={{ width: '100%', display: 'block', borderRadius: 'var(--radius-sm)' }}
          />

          {canOverlay && size && (
            <svg
              viewBox={`0 0 ${size.w} ${size.h}`}
              preserveAspectRatio="none"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
            >
              {visible.map((it) => {
                const isActive = it.i === active;
                const dimmed = active != null && !isActive;
                return (
                  <rect
                    key={it.i}
                    x={it.x} y={it.y} width={it.w} height={it.h}
                    fill={it.color}
                    fillOpacity={isActive ? 0.22 : 0}
                    stroke={it.color}
                    strokeOpacity={dimmed ? 0.3 : 1}
                    strokeWidth={isActive ? 3 : 2}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="all"
                    style={{ cursor: 'pointer', transition: 'stroke-opacity 0.15s, fill-opacity 0.15s' }}
                    onMouseEnter={() => setActive(it.i)}
                    onClick={() => setActive((a) => (a === it.i ? null : it.i))}
                  />
                );
              })}
            </svg>
          )}

          {activeItem && size && (
            <div
              style={{
                position: 'absolute', ...tooltipStyle(activeItem), pointerEvents: 'none',
                display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap',
                background: 'rgba(15, 23, 42, 0.92)', color: '#fff', fontSize: '0.78rem', fontWeight: 600,
                padding: '0.3rem 0.6rem', borderRadius: 6, boxShadow: 'var(--shadow-md)', zIndex: 2,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: activeItem.color }} />
              {activeItem.label}
              <span style={{ opacity: 0.7, fontWeight: 500 }}>{activeItem.conf}%</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
        <span>
          {items.length === 0
            ? 'No litter detected — the water appears clean.'
            : canOverlay
              ? 'Hover or tap a box to see its category and confidence.'
              : 'Annotated result from the detection server.'}
        </span>
        {data?.result_image && (
          <a href={apiUrl(data.result_image)} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
            Open annotated image <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  );
};

export default DetectionViewer;
