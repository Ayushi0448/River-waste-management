import React from 'react';
import { Home, FileText, Clock } from 'lucide-react';

const MenuBar = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'report', label: 'AI Report', icon: FileText },
    { id: 'history', label: 'History', icon: Clock }
  ];

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '1rem',
      padding: '1rem',
      background: 'rgba(6, 11, 26, 0.8)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      {navItems.map(item => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`btn ${activeTab === item.id ? 'btn-primary' : 'btn-ghost'}`}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '999px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: activeTab === item.id ? '0 4px 15px rgba(0, 212, 255, 0.2)' : 'none'
          }}
        >
          <item.icon size={18} />
          {item.label}
        </button>
      ))}
    </nav>
  );
};

export default MenuBar;
