"use client";

import { useState, useRef, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Sparkles, Send, ChevronDown } from "lucide-react";

export default function AIAssistant() {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chat = useAction(api.aiAssistant.chat);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const result = await chat({ message: text });
      setMessages(m => [...m, { role: "assistant", text: result.text }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", text: e instanceof Error ? e.message : "Something went wrong." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed", zIndex: 100,
      right: 32,
      bottom: expanded ? 100 : 88,
      width: expanded ? 380 : "auto",
      fontFamily: "var(--font-inter)",
      transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
    }}>
      {/* Collapsed pill / expanded panel */}
      <div style={{
        borderRadius: expanded ? 24 : 100,
        overflow: "hidden",
        background: "var(--glass-bg)",
        backdropFilter: "blur(12px) saturate(1.8)",
        WebkitBackdropFilter: "blur(12px) saturate(1.8)",
        border: "1px solid var(--glass-border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        transition: "border-radius 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
      }}>
        {/* Title bar */}
        <button type="button" onClick={() => setExpanded(e => !e)} style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: expanded ? "14px 16px" : "10px 16px",
          background: "transparent", border: "none", cursor: "pointer",
          borderBottom: expanded ? "1px solid var(--glass-border)" : "none",
          transition: "all 0.3s ease",
          fontFamily: "var(--font-inter)",
        }}>
          {/* Icon */}
          <div style={{
            width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.08))",
            border: "1px solid rgba(59,130,246,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles size={13} color="#3b82f6" />
          </div>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-main)", flex: 1, textAlign: "left", letterSpacing: "-0.01em" }}>
            Garden Log
          </span>
          <ChevronDown size={14} color="var(--text-muted)" style={{
            transform: expanded ? "rotate(0deg)" : "rotate(180deg)",
            transition: "transform 0.3s ease",
          }} />
        </button>

        {/* Expanded body */}
        {expanded && (
          <>
            {/* Chat area */}
            <div style={{
              height: 300, overflowY: "auto", padding: "12px 14px",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              {messages.length === 0 && (
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.65, margin: 0 }}>
                  Log anything — &ldquo;30 min run&rdquo;, &ldquo;Add Chase checking $500&rdquo;, &ldquo;Add book Clean Code&rdquo;…
                </p>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role==="user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "88%", padding: "8px 12px", borderRadius: msg.role==="user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    fontSize: "0.8rem", lineHeight: 1.55,
                    background: msg.role==="user" ? "#3b82f6" : "rgba(0,0,0,0.05)",
                    border: msg.role==="user" ? "none" : "1px solid var(--glass-border)",
                    color: msg.role==="user" ? "#fff" : "var(--text-main)",
                  }}>
                    {msg.text.split("\n").map((line, j) => <p key={j} style={{ margin: 0 }}>{line}</p>)}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{
                    padding: "8px 12px", borderRadius: "16px 16px 16px 4px",
                    background: "rgba(0,0,0,0.04)", border: "1px solid var(--glass-border)",
                    fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", gap: 4, alignItems: "center",
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--text-muted)", animation: "voice-wave 0.9s ease-in-out infinite" }} />
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--text-muted)", animation: "voice-wave 0.9s ease-in-out 0.2s infinite" }} />
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--text-muted)", animation: "voice-wave 0.9s ease-in-out 0.4s infinite" }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: "10px 12px",
              borderTop: "1px solid var(--glass-border)",
              display: "flex", gap: 8, alignItems: "center",
            }}>
              <input type="text" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key==="Enter" && !e.shiftKey && handleSend()}
                placeholder="Log something…"
                disabled={loading}
                style={{
                  flex: 1, borderRadius: 100, padding: "8px 14px",
                  fontSize: "0.8rem", outline: "none",
                  background: "rgba(0,0,0,0.04)", border: "1px solid var(--glass-border)",
                  color: "var(--text-main)", fontFamily: "var(--font-inter)",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.4)"}
                onBlur={e => e.target.style.borderColor = "var(--glass-border)"}
              />
              <button type="button" onClick={handleSend} disabled={loading || !input.trim()} style={{
                width: 36, height: 36, borderRadius: "50%", border: "none",
                background: input.trim() && !loading ? "#3b82f6" : "rgba(0,0,0,0.06)",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s ease", flexShrink: 0,
              }}>
                <Send size={14} color={input.trim() && !loading ? "#fff" : "var(--text-muted)"} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
