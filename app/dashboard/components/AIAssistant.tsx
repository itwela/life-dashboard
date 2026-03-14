"use client";

import { useState, useRef, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";

const WINDOW_WIDTH = 380;
const WINDOW_HEIGHT = 420;

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
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const result = await chat({ message: text });
      setMessages((m) => [...m, { role: "assistant", text: result.text }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: e instanceof Error ? e.message : "Something went wrong." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed z-[100] flex flex-col overflow-hidden rounded-t-xl shadow-2xl"
      style={{
        right: 16,
        bottom: expanded ? 16 : 0,
        width: expanded ? WINDOW_WIDTH : 200,
        height: expanded ? WINDOW_HEIGHT : 44,
        background: "linear-gradient(180deg, rgba(6,26,46,0.98) 0%, rgba(2,11,24,0.99) 100%)",
        border: "1px solid rgba(96,200,255,0.25)",
        boxShadow: "0 0 40px rgba(0,0,0,0.5), 0 0 60px rgba(96,200,255,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {/* Browser-style title bar */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="shrink-0 flex items-center gap-2 px-3 py-2.5 w-full text-left hover:bg-white/5 transition-colors"
        style={{
          borderBottom: expanded ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}
      >
        <span className="w-4 h-4 rounded flex items-center justify-center text-[10px]" style={{ background: "rgba(96,200,255,0.3)", border: "1px solid rgba(96,200,255,0.5)" }}>
          ◈
        </span>
        <span className="text-xs font-semibold text-white/90 truncate flex-1">AI Assistant</span>
        <span className="text-white/40 text-xs">{expanded ? "−" : "□"}</span>
      </button>

      {expanded && (
        <>
          {/* Fake address bar */}
          <div
            className="shrink-0 flex items-center gap-2 px-3 py-1.5"
            style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
          >
            <span className="text-[10px] text-white/30 truncate flex-1 font-mono">
              theprocess.local/ai
            </span>
          </div>

          {/* Chat area */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3" style={{ background: "rgba(2,11,24,0.4)" }}>
            {messages.length === 0 && (
              <p className="text-xs text-white/40 leading-relaxed">
                Add to any category by typing: &ldquo;Log 30 min run&rdquo;, &ldquo;Add Chase checking $500&rdquo;, &ldquo;Add book Clean Code by Robert Martin&rdquo;, &ldquo;I finished reading X&rdquo;, &ldquo;Add project Foo, active&rdquo;, etc.
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[85%] rounded-lg px-3 py-2 text-xs"
                  style={
                    msg.role === "user"
                      ? { background: "rgba(96,200,255,0.2)", border: "1px solid rgba(96,200,255,0.3)", color: "#e2f0ff" }
                      : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(226,240,255,0.9)" }
                  }
                >
                  {msg.text.split("\n").map((line, j) => (
                    <p key={j}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-lg px-3 py-2 text-xs text-white/50" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  Thinking…
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 p-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(2,11,24,0.6)" }}>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Add workout, account, book…"
                className="flex-1 rounded-lg px-3 py-2 text-xs bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-[#60c8ff]/50 focus:outline-none"
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, rgba(96,200,255,0.4), rgba(34,211,238,0.25))", border: "1px solid rgba(96,200,255,0.4)" }}
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
