import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Activity, Database, FileText, Droplets } from 'lucide-react';
import { motion } from 'framer-motion';

const Navbar = ({ activeTab, setActiveTab }) => {
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'report', label: 'AI Report', icon: FileText },
    { id: 'history', label: 'History', icon: Database }
  ];

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--surface)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
        <div style={{ background: 'var(--primary-g)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
          <Droplets size={24} color="#fff" />
        </div>
        <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-color)' }}>
          pLitter River
        </span>
      </div>

      {/* Center Links */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`btn ${activeTab === item.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{ 
              padding: '0.5rem 1rem', 
              fontSize: '0.9rem',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={toggleTheme} 
          className="btn-ghost"
          style={{ 
            padding: '0.5rem', 
            borderRadius: '50%', 
            border: '1px solid var(--border)',
            background: 'var(--surface-h)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-color)'
          }}
          aria-label="Toggle Theme"
        >
          <motion.div
            initial={false}
            animate={{ rotate: theme === 'dark' ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          </motion.div>
        </button>
      </div>
    </motion.nav>
  );
};

export default Navbar;
