import React from 'react';
import { motion } from 'framer-motion';

const HeroSection = () => {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ textAlign: 'center', marginBottom: '3rem', paddingTop: '2rem' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        style={{ 
          display: 'inline-block', 
          padding: '0.4rem 1rem', 
          background: 'var(--primary-light)', 
          color: 'var(--primary)', 
          borderRadius: '99px', 
          fontSize: '0.8rem', 
          fontWeight: 700,
          marginBottom: '1rem',
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}
      >
        AI-Powered Environmental Analysis
      </motion.div>
      <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '1rem' }}>
        Protect Our Rivers with <br/>
        <span className="text-gradient">Intelligent Detection</span>
      </h1>
      <p style={{ fontSize: '1.1rem', color: 'var(--text-dim)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
        Upload an image of river pollution and our advanced object detection model will instantly identify and categorize waste to help prioritize cleanup efforts.
      </p>
    </motion.section>
  );
};

export default HeroSection;
