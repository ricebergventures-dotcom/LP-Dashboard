"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTED = [
  "What deals did we review this month?",
  "How many startups entered the pipeline?",
  "What sectors are most represented?",
  "Which companies are in the deal memo stage?",
  "What geographies are we seeing most?",
  "What are the most recent deals added?",
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

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  // Render assistant text preserving line breaks and bolding **text**
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

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${
          isUser
            ? "bg-[#5CD3D3]/10 border border-[#5CD3D3]/30 text-[#5CD3D3]"
            : "bg-muted border border-border text-muted-foreground"
        }`}
      >
        {isUser ? "You" : "AI"}
      </div>

      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-4 py-3 text-[13px] rounded-[3px] ${
            isUser
              ? "bg-[#5CD3D3]/10 border border-[#5CD3D3]/20 text-foreground"
              : "bg-card border border-border text-foreground"
          }`}
        >
          {isUser ? (
            <p className="leading-relaxed">{message.content}</p>
          ) : (
            <div className="space-y-1.5">{renderContent(message.content)}</div>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground/40">
          {format(message.timestamp, "HH:mm")}
        </span>
      </div>
    </div>
  );
}

export function DealflowChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: json.answer ?? "No response.",
            timestamp: new Date(),
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Sorry, I ran into an error: ${err instanceof Error ? err.message : "Unknown error"}`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [messages, loading]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Message area */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-5 space-y-5">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-6">
            {/* Empty state */}
            <div className="text-center space-y-1.5">
              <div className="h-10 w-10 rounded-full bg-[#5CD3D3]/10 border border-[#5CD3D3]/25 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="h-4 w-4 text-[#5CD3D3]" />
              </div>
              <p className="text-sm font-medium">Ask me about your dealflow</p>
              <p className="text-[12px] text-muted-foreground">
                I can answer questions about pipeline, sectors, geographies, and more.
              </p>
            </div>

            {/* Suggested questions */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => void send(q)}
                  className="px-3 py-1.5 text-[12px] border border-border text-muted-foreground rounded-[3px] hover:border-[#5CD3D3]/40 hover:text-foreground transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="h-7 w-7 shrink-0 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground mt-0.5">
              AI
            </div>
            <div className="px-4 py-3 bg-card border border-border rounded-[3px]">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested questions (after first message) */}
      {!isEmpty && !loading && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {SUGGESTED.map((q) => (
            <button
              key={q}
              onClick={() => void send(q)}
              className="shrink-0 px-2.5 py-1 text-[11px] border border-border text-muted-foreground rounded-[3px] hover:border-[#5CD3D3]/40 hover:text-foreground transition-colors whitespace-nowrap"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex gap-2.5 items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your pipeline…"
            disabled={loading}
            className="flex-1 bg-card border border-border text-sm px-3 py-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[#5CD3D3]/60 transition-colors rounded-[2px] disabled:opacity-50"
          />
          <button
            onClick={() => void send(input)}
            disabled={!input.trim() || loading}
            className="h-9 w-9 shrink-0 flex items-center justify-center bg-[#5CD3D3] text-black rounded-[2px] hover:bg-[#5CD3D3]/90 disabled:opacity-40 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground/40">
          Answers are based on your Supabase deal data · Press Enter to send
        </p>
      </div>
    </div>
  );
}
