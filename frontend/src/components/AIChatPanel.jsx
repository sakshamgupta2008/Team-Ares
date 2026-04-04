/**
 * AIChatPanel.jsx — AI Chatbot Panel (Flow B)
 *
 * Receives `chatPayload` (full district health JSON) and `districtName`.
 * Calls getInitialReasoning() on mount, then supports multi-turn chat.
 * Wired to aiService.js — swap API key / endpoint there.
 */
import React, { useState, useEffect, useRef } from "react";
import { getInitialReasoning, getFollowUpReasoning } from "../services/aiService.js";
import { pctToSolidColor, pctToRiskLabel, C } from "../utils/constants.js";

const QUICK_PROMPTS = [
  "What's the biggest priority?",
  "How will more testing help?",
  "Which intervention is most cost-effective?",
  "How does this compare to the state average?",
];

const AIChatPanel = ({ chatPayload, districtName }) => {
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [initDone,  setInitDone]  = useState(false);
  const bottomRef = useRef(null);

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch initial AI reasoning on mount
  useEffect(() => {
    if (!chatPayload || initDone) return;
    setLoading(true);
    setMessages([{ role: "system", text: "◆ PreventiQ Analyst initialising…" }]);

    getInitialReasoning(chatPayload)
      .then(({ text, isFallback }) => {
        setMessages([{
          role:       "assistant",
          text,
          isFallback: !!isFallback,
          ts:         Date.now(),
        }]);
        setInitDone(true);
        setLoading(false);
      })
      .catch(() => {
        setMessages([{ role: "assistant", text: "AI Analyst unavailable. Check API configuration.", ts: Date.now() }]);
        setLoading(false);
      });
  }, [chatPayload, districtName]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: text.trim(), ts: Date.now() }]);
    setLoading(true);

    const { text: reply } = await getFollowUpReasoning(districtName, text.trim());
    setMessages(prev => [...prev, { role: "assistant", text: reply, ts: Date.now() }]);
    setLoading(false);
  };

  const pct   = chatPayload?.ml_outputs?.risk_score ?? 55;
  const color = pctToSolidColor(pct);

  return (
    <div style={S.root}>

      {/* Header strip */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.cyan,
            boxShadow: `0 0 8px ${C.cyan}`, animation: "dotPulse 2s infinite" }} />
          <span style={{ fontSize: 10, color: C.cyan, letterSpacing: "0.1em", fontWeight: 700 }}>
            AI MEDICAL ANALYST
          </span>
        </div>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
          color: color, fontWeight: 700 }}>
          {pct}% {pctToRiskLabel(pct).toUpperCase()} RISK
        </span>
      </div>

      {/* Messages */}
      <div style={S.messages}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            animation: "chatSlide 0.3s ease both",
            animationDelay: `${i * 0.04}s`,
            marginBottom: 10,
          }}>
            {m.role === "assistant" && (
              <div style={S.aiAvatar}>◆</div>
            )}
            <div style={{
              maxWidth: "82%",
              padding: "10px 14px",
              borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
              background: m.role === "user"
                ? "rgba(0,245,255,0.10)"
                : m.role === "system"
                  ? "rgba(191,95,255,0.08)"
                  : "rgba(7,17,31,0.9)",
              border: m.role === "user"
                ? "1px solid rgba(0,245,255,0.3)"
                : m.role === "system"
                  ? "1px solid rgba(191,95,255,0.2)"
                  : "1px solid #0d2035",
              boxShadow: m.role === "assistant" ? "0 2px 12px rgba(0,0,0,0.4)" : "none",
            }}>
              <p style={{
                fontSize: 12, lineHeight: 1.6,
                color: m.role === "user" ? C.cyan
                  : m.role === "system" ? C.purple
                  : "#c8dff0",
                fontFamily: m.role === "user" ? "'JetBrains Mono',monospace" : "'Syne',sans-serif",
                margin: 0,
              }}>
                {m.text}
              </p>
              {m.isFallback && (
                <div style={{ fontSize: 9, color: C.dim, marginTop: 4 }}>
                  ⚠ Simulation mode — connect API key for live AI
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
            animation: "fadeIn 0.2s ease" }}>
            <div style={S.aiAvatar}>◆</div>
            <div style={S.typingDots}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: C.cyan, opacity: 0.7,
                  animation: `dotPulse 1s ease ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {initDone && !loading && messages.length <= 2 && (
        <div style={S.quickPrompts}>
          <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.1em", marginBottom: 6 }}>
            QUICK QUESTIONS
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {QUICK_PROMPTS.map(q => (
              <button key={q} onClick={() => sendMessage(q)} style={S.quickBtn}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={S.inputRow}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage(input)}
          placeholder="Ask anything about this district…"
          style={S.input}
          disabled={loading}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{
            ...S.sendBtn,
            opacity: loading || !input.trim() ? 0.4 : 1,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
          }}
        >▶</button>
      </div>
    </div>
  );
};

const S = {
  root: {
    height: "100%", display: "flex", flexDirection: "column",
    background: "transparent",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 16px 8px",
    borderBottom: "1px solid #0d2035",
    flexShrink: 0,
  },
  messages: {
    flex: 1, overflowY: "auto", padding: "14px 16px",
    display: "flex", flexDirection: "column",
  },
  aiAvatar: {
    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
    background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.25)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#00f5ff", fontSize: 10, marginRight: 8, alignSelf: "flex-start",
    marginTop: 2,
  },
  typingDots: {
    display: "flex", gap: 4, alignItems: "center",
    background: "#07111f", border: "1px solid #0d2035",
    borderRadius: "4px 16px 16px 16px", padding: "10px 14px",
  },
  quickPrompts: {
    padding: "8px 16px",
    borderTop: "1px solid #0d2035",
    flexShrink: 0,
  },
  quickBtn: {
    padding: "5px 10px", borderRadius: 20,
    background: "rgba(0,245,255,0.06)", border: "1px solid rgba(0,245,255,0.18)",
    color: "#4a7090", fontSize: 10, cursor: "pointer",
    fontFamily: "'JetBrains Mono',monospace",
    transition: "all 0.2s",
  },
  inputRow: {
    display: "flex", gap: 8, padding: "10px 14px",
    borderTop: "1px solid #0d2035", flexShrink: 0,
    background: "rgba(0,0,0,0.3)",
  },
  input: {
    flex: 1, background: "#07111f", border: "1px solid #122944",
    borderRadius: 10, padding: "9px 14px",
    color: "#e8f4ff", fontSize: 12,
    fontFamily: "'Syne',sans-serif",
    outline: "none",
    transition: "border-color 0.2s",
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 10,
    background: "rgba(0,245,255,0.12)", border: "1px solid rgba(0,245,255,0.3)",
    color: "#00f5ff", fontSize: 14, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
};

export default AIChatPanel;
