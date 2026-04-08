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
      className="fixed z-[100] flex flex-col overflow-hidden shadow-2xl"
      style={{
        right: 16,
        bottom: expanded ? 16 : 0,
        width: expanded ? WINDOW_WIDTH : 180,
        height: expanded ? WINDOW_HEIGHT : 40,
        borderRadius: expanded ? 14 : "10px 10px 0 0",
        background: "linear-gradient(180deg, rgba(8,18,7,0.98) 0%, rgba(5,12,4,0.99) 100%)",
        border: "1px solid rgba(122,176,90,0.18)",
        boxShadow: "0 0 40px rgba(0,0,0,0.6), 0 0 60px rgba(122,176,90,0.06), inset 0 1px 0 rgba(196,145,42,0.08)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Title bar */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="shrink-0 flex items-center gap-2 px-3 w-full text-left transition-colors"
        style={{
          height: 40,
          borderBottom: expanded ? "1px solid rgba(122,176,90,0.08)" : "none",
          background: expanded ? "rgba(5,12,4,0.6)" : "transparent",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(122,176,90,0.04)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = expanded ? "rgba(5,12,4,0.6)" : "transparent")}
      >
        <span
          className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(145deg, rgba(196,145,42,0.28), rgba(122,176,90,0.16))", border: "1px solid rgba(196,145,42,0.3)", fontFamily: "var(--font-cormorant)", fontSize: "12px", color: "rgba(196,145,42,0.9)" }}
        >
          ✦
        </span>
        <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "14px", fontStyle: "italic", fontWeight: 500, color: "rgba(232,224,204,0.78)", flex: 1 }}>
          Garden Log
        </span>
        <span style={{ color: "rgba(232,224,204,0.3)", fontSize: "14px", lineHeight: 1 }}>
          {expanded ? "−" : "+"}
        </span>
      </button>

      {expanded && (
        <>
          {/* Chat area */}
          <div
            className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3"
            style={{ background: "rgba(4,10,3,0.5)" }}
          >
            {messages.length === 0 && (
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", color: "rgba(232,224,204,0.42)", lineHeight: 1.65 }}>
                Log anything — &ldquo;30 min run&rdquo;, &ldquo;Add Chase checking $500&rdquo;, &ldquo;Add book Clean Code&rdquo;, &ldquo;Add project Foo&rdquo;…
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed"
                  style={
                    msg.role === "user"
                      ? { background: "rgba(196,145,42,0.14)", border: "1px solid rgba(196,145,42,0.28)", color: "rgba(232,224,204,0.88)", fontFamily: "var(--font-dm-sans)" }
                      : { background: "rgba(122,176,90,0.08)", border: "1px solid rgba(122,176,90,0.16)", color: "rgba(232,224,204,0.82)", fontFamily: "var(--font-dm-sans)" }
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
                <div
                  className="rounded-xl px-3 py-2 text-xs"
                  style={{ background: "rgba(122,176,90,0.07)", border: "1px solid rgba(122,176,90,0.14)", color: "rgba(232,224,204,0.45)", fontFamily: "var(--font-cormorant)", fontStyle: "italic" }}
                >
                  thinking…
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div
            className="shrink-0 p-2.5"
            style={{ borderTop: "1px solid rgba(122,176,90,0.08)", background: "rgba(4,10,3,0.7)" }}
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Log something…"
                disabled={loading}
                className="flex-1 rounded-lg px-3 py-2 text-xs outline-none transition-colors"
                style={{
                  fontFamily: "var(--font-dm-sans)",
                  background: "rgba(232,224,204,0.04)",
                  border: "1px solid rgba(122,176,90,0.12)",
                  color: "rgba(232,224,204,0.82)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(196,145,42,0.35)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(122,176,90,0.12)")}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="shrink-0 px-3 py-2 rounded-lg text-xs transition-all disabled:opacity-40"
                style={{
                  fontFamily: "var(--font-cormorant)",
                  fontStyle: "italic",
                  fontSize: "13px",
                  background: "linear-gradient(135deg, rgba(196,145,42,0.22), rgba(122,176,90,0.14))",
                  border: "1px solid rgba(196,145,42,0.32)",
                  color: "rgba(196,145,42,0.9)",
                }}
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
