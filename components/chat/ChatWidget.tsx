"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, X, MessageSquare, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTED = [
  "What deals did we review this month?",
  "What sectors are most represented in the pipeline?",
  "What is Riceberg's investment thesis?",
  "How do I submit a deal to Riceberg?",
  "Who are the partners at Riceberg?",
  "What geographies are we seeing most?",
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 h-4 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
        />
      ))}
    </div>
  );
}

function renderContent(text: string) {
  return text.split(/\n+/).map((line, i) => {
    if (!line.trim()) return null;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="leading-relaxed">
        {parts.map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? (
            <strong key={j}>{p.slice(2, -2)}</strong>
          ) : (
            p
          )
        )}
      </p>
    );
  });
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, messages, loading]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };
      const next = [...messages, userMsg];
      setMessages(next);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/dealflow-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: next.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const json = (await res.json()) as { answer?: string; error?: string };
        if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: json.answer ?? "No response.", timestamp: new Date() },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Unknown"}`, timestamp: new Date() },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading]
  );

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-[380px] h-[540px] bg-background border border-border shadow-2xl flex flex-col overflow-hidden rounded-[4px]"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-full bg-[#5CD3D3]/10 border border-[#5CD3D3]/30 flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-[#5CD3D3]" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold leading-none">Dealflow AI</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">Ask about pipeline &amp; deals</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    title="Clear chat"
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4">
              {isEmpty && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <p className="text-[12px] text-muted-foreground">
                    Ask me anything about your deal pipeline.
                  </p>
                  <div className="flex flex-col gap-1.5 w-full">
                    {SUGGESTED.map((q) => (
                      <button
                        key={q}
                        onClick={() => void send(q)}
                        className="text-left px-3 py-2 text-[11px] border border-border text-muted-foreground rounded-[3px] hover:border-[#5CD3D3]/40 hover:text-foreground transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5 ${
                    m.role === "user"
                      ? "bg-[#5CD3D3]/10 border border-[#5CD3D3]/30 text-[#5CD3D3]"
                      : "bg-muted border border-border text-muted-foreground"
                  }`}>
                    {m.role === "user" ? "You" : "AI"}
                  </div>
                  <div className={`flex flex-col gap-1 max-w-[85%] ${m.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`px-3 py-2 text-[12px] rounded-[3px] ${
                      m.role === "user"
                        ? "bg-[#5CD3D3]/10 border border-[#5CD3D3]/20 text-foreground"
                        : "bg-card border border-border text-foreground"
                    }`}>
                      {m.role === "user" ? (
                        <p className="leading-relaxed">{m.content}</p>
                      ) : (
                        <div className="space-y-1.5">{renderContent(m.content)}</div>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/40">{format(m.timestamp, "HH:mm")}</span>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-2">
                  <div className="h-6 w-6 shrink-0 rounded-full bg-muted border border-border flex items-center justify-center text-[9px] font-bold text-muted-foreground mt-0.5">AI</div>
                  <div className="px-3 py-2 bg-card border border-border rounded-[3px]">
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border px-3 py-2.5 shrink-0">
              <div className="flex gap-2 items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask about your pipeline…"
                  disabled={loading}
                  className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={() => void send(input)}
                  disabled={!input.trim() || loading}
                  className="h-7 w-7 shrink-0 flex items-center justify-center bg-[#5CD3D3] text-black rounded-[2px] hover:bg-[#5CD3D3]/90 disabled:opacity-40 transition-colors"
                >
                  <Send className="h-3 w-3" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="h-12 w-12 rounded-full bg-[#5CD3D3] text-black shadow-lg flex items-center justify-center"
        style={{ boxShadow: "0 4px 20px rgba(92,211,211,0.35)" }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="h-5 w-5" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageSquare className="h-5 w-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
