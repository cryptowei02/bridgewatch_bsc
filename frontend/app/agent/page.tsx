"use client";

import { useState, useRef, useEffect } from "react";
import { sendAgentMessage, type ChatMessage, type ToolAction } from "@/lib/api";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  toolActions?: ToolAction[];
}

function toolLabel(name: string): string {
  const labels: Record<string, string> = {
    query_transactions: "Querying transactions",
    get_stats: "Fetching statistics",
    analyze_anomalies: "Analyzing anomalies",
    predict_delay: "Predicting delay",
    suggest_optimal_time: "Finding optimal time",
    get_alerts: "Checking alerts",
    create_attestation_receipt: "Creating attestation receipt",
  };
  return labels[name] || name;
}

export default function AgentPage() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);

    const userMsg: DisplayMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history: ChatMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await sendAgentMessage(text, history);

      const assistantMsg: DisplayMessage = {
        role: "assistant",
        content: response.reply,
        toolActions: response.toolActions,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">AI Agent</h1>
        <p className="text-sm text-gray-500 mt-1">
          Chat with BridgeWatch AI — ask about transactions, anomalies, delays, and more
        </p>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pb-4"
      >
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-[#f0b90b]/10 border border-[#f0b90b]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-[#f0b90b] font-bold">AI</span>
              </div>
              <p className="text-gray-400 mb-4">Ask me anything about bridge activity</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  "Show me recent transactions",
                  "Are there any anomalies?",
                  "What is the current bridge delay?",
                  "When is the best time to bridge?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      inputRef.current?.focus();
                    }}
                    className="text-left text-xs text-gray-500 bg-[#111118] border border-[#1e1e2e] rounded-lg p-3 hover:border-[#f0b90b]/30 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-[#f0b90b]/10 border border-[#f0b90b]/20 text-white"
                  : "bg-[#111118] border border-[#1e1e2e] text-gray-200"
              }`}
            >
              {msg.toolActions && msg.toolActions.length > 0 && (
                <div className="mb-2 pb-2 border-b border-[#1e1e2e]">
                  {msg.toolActions.map((action, j) => (
                    <div key={j} className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      {toolLabel(action.tool)}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#f0b90b] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-[#f0b90b] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-[#f0b90b] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-[#1e1e2e]">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the AI agent..."
          disabled={loading}
          className="flex-1 bg-[#111118] border border-[#1e1e2e] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#f0b90b]/50 disabled:opacity-50 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="px-6 py-3 bg-[#f0b90b] text-black font-medium rounded-xl text-sm hover:bg-[#f0b90b]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
