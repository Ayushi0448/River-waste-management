import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MessageSquare, X, Send, Bot, Loader2 } from 'lucide-react';
import { generateAnalysis } from '../utils/aiAnalyzer';
import { answerQuery, SUGGESTED_QUESTIONS } from '../utils/chatAssistant';
import { API_BASE } from '../config/api';

/**
 * Feature 4 — AI Chat Assistant (ZIRA), hybrid mode.
 *
 * Primary: the Groq LLM (POST /chat) answers conversationally, grounded in a
 * compact summary of the CURRENT scan so it cannot invent numbers.
 * Fallback: if Groq is unavailable (no key, network/API error), it answers
 * locally with the deterministic grounded assistant — so ZIRA always replies.
 * Each reply is tagged with its source ("via Groq AI" / "offline").
 */
const ChatBot = ({ detectionResults }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text:
        'Greetings. I am ZIRA, the assistant for pLitter River. Ask me about your latest scan — I answer from the detected results, so I never make numbers up.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Recompute the grounded analysis whenever new detection results arrive.
  const analysis = useMemo(() => generateAnalysis(detectionResults), [detectionResults]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // Compact, model-friendly grounding context (only what's needed to answer).
  const buildContext = () => {
    if (!analysis || !analysis.hasData) return { hasData: false, total: 0 };
    return {
      hasData: true,
      total: analysis.total,
      pollutionStatus: analysis.pollutionStatus,
      dominant: analysis.dominant ? { label: analysis.dominant.label, percentage: analysis.dominant.percentage } : null,
      categories: analysis.categories.map((c) => ({
        label: c.label,
        count: c.count,
        percentage: c.percentage,
        avgConfidence: c.avgConfidence,
      })),
      risk: analysis.risk,
      impacts: analysis.impacts.map((i) => ({ label: i.label, text: i.text })),
    };
  };

  const ask = async (rawQuestion) => {
    const question = (rawQuestion || '').trim();
    if (!question || isLoading) return;

    setMessages((prev) => [...prev, { sender: 'user', text: question }]);
    setInput('');
    setIsLoading(true);

    // 1) Try Groq (primary). 2) Fall back to the local grounded assistant.
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, context: buildContext() }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.response) {
        setMessages((prev) => [...prev, { sender: 'bot', text: data.response, source: 'via Groq AI' }]);
        return;
      }
      throw new Error(data.error || 'Groq unavailable');
    } catch {
      const reply = answerQuery(question, analysis);
      setMessages((prev) => [...prev, { sender: 'bot', text: reply, source: 'offline' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          display: isOpen ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          border: 'none',
          boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)',
          cursor: 'pointer',
          background: 'var(--primary-g)',
        }}
        aria-label="Open ZIRA assistant"
      >
        <MessageSquare size={28} color="#fff" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="glass-card"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: '360px',
            maxWidth: 'calc(100vw - 2rem)',
            height: '520px',
            zIndex: 101,
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--primary-g)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color: '#fff' }}>
              <Bot size={20} /> ZIRA
              <span style={{ fontSize: '0.65rem', opacity: 0.85, fontWeight: 500, background: 'rgba(255,255,255,0.2)', padding: '0.1rem 0.45rem', borderRadius: '99px' }}>
                grounded
              </span>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }} aria-label="Close">
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-color)' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
                {msg.sender === 'bot' && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bot size={16} color="#fff" />
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div
                    style={{
                      padding: '0.75rem',
                      borderRadius: '12px',
                      background: msg.sender === 'user' ? 'var(--primary)' : 'var(--surface-h)',
                      color: msg.sender === 'user' ? '#fff' : 'var(--text-color)',
                      fontSize: '0.9rem',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-line',
                      border: msg.sender === 'bot' ? '1px solid var(--border)' : 'none',
                      borderBottomRightRadius: msg.sender === 'user' ? '0' : '12px',
                      borderBottomLeftRadius: msg.sender === 'bot' ? '0' : '12px',
                    }}
                  >
                    {msg.text}
                  </div>
                  {msg.source && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', paddingLeft: '0.25rem' }}>{msg.source}</span>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-start', maxWidth: '88%' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={16} color="#fff" />
                </div>
                <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'var(--surface-h)', border: '1px solid var(--border)', borderBottomLeftRadius: 0 }}>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '0.6rem 0.75rem 0', background: 'var(--surface)' }}>
            {SUGGESTED_QUESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                disabled={isLoading}
                style={{
                  fontSize: '0.72rem',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '99px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-h)',
                  color: 'var(--text-dim)',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} style={{ display: 'flex', padding: '0.75rem', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the results..."
              style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '20px', padding: '0.6rem 1rem', color: 'var(--text-color)', outline: 'none' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              style={{ background: 'var(--primary)', border: 'none', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '0.5rem', cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed', opacity: input.trim() && !isLoading ? 1 : 0.5, flexShrink: 0 }}
            >
              <Send size={18} color="#fff" style={{ marginLeft: '-2px' }} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatBot;
