import React, { useState, useMemo } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import UploadSection from './components/UploadSection';
import ResultsSection from './components/ResultsSection';
import AISummary from './components/AISummary';
import EnvironmentalImpact from './components/EnvironmentalImpact';
import RiskAssessment from './components/RiskAssessment';
import HistorySection from './components/HistorySection';
import ReportSection from './components/ReportSection';
import ChatBot from './components/ChatBot';
import Footer from './components/Footer';
import { ThemeProvider } from './context/ThemeContext';
import { generateAnalysis } from './utils/aiAnalyzer';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [detectionResults, setDetectionResults] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Single source of insight, shared by the dashboard cards, the report and ZIRA.
  const analysis = useMemo(() => generateAnalysis(detectionResults), [detectionResults]);

  const handleDetectionComplete = (results) => {
    setDetectionResults(results);
    setTimeout(() => {
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleClear = () => setDetectionResults(null);

  return (
    <ThemeProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main style={{ position: 'relative', zIndex: 1, flex: 1, width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <HeroSection />
                <UploadSection onDetectionComplete={handleDetectionComplete} onClear={handleClear} />
                {detectionResults && (
                  <div id="results-section">
                    <ResultsSection data={detectionResults} analysis={analysis} />
                    {/* Feature 1–3: auto-generated AI insights, right after the scan */}
                    <AISummary analysis={analysis} />
                    <EnvironmentalImpact analysis={analysis} />
                    <RiskAssessment analysis={analysis} />
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'report' && (
              <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <ReportSection analysis={analysis} />
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <HistorySection />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <ChatBot detectionResults={detectionResults} />
        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;
