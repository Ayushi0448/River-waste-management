import React from 'react';

const Footer = () => {
  return (
    <footer style={{
      position: 'relative',
      zIndex: 2,
      textAlign: 'center',
      padding: '1.5rem',
      fontSize: '0.75rem',
      color: 'var(--text-dim)',
      borderTop: '1px solid var(--border)',
    }}>
      <p>pLitter River &copy; 2026 — Keeping rivers clean with AI</p>
    </footer>
  );
};

export default Footer;
