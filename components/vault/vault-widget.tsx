"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, X, Send, Loader2, Plus, History } from "lucide-react";
import { useVaultContext } from "./vault-context";
import { listVaultConversations, loadVaultConversation } from "@/app/actions/vault";
import { VaultActionCard, type ProposedAction } from "./vault-action-card";

interface Message {
  role: "user" | "assistant";
  content: string;
  action?: ProposedAction;
}

const RESEARCHER_QUICK_ACTIONS = [
  "What pays more — auth bugs or XSS?",
  "Rate the quality of my last report",
  "How is CVSS severity usually estimated?",
];

const ADMIN_QUICK_ACTIONS = [
  "Summarize my current workload",
  "How many bugs were submitted this week?",
  "What's our SLA compliance looking like?",
];

export function VaultWidget({ role }: { role: "researcher" | "admin" }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<{ id: string; title: string | null; updated_at: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const context = useVaultContext();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/vault/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId, context }),
      });

      const newConvId = res.headers.get("X-Conversation-Id");
      if (newConvId && !conversationId) setConversationId(newConvId);

      if (!res.body) throw new Error("No response stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });

        const markerIdx = fullText.indexOf("__VAULT_ACTION__");
        const visibleText = markerIdx >= 0 ? fullText.slice(0, markerIdx) : fullText;

        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], content: visibleText };
          return next;
        });
      }

      const markerIdx = fullText.indexOf("__VAULT_ACTION__");
      if (markerIdx >= 0) {
        try {
          const action = JSON.parse(fullText.slice(markerIdx + "__VAULT_ACTION__".length)) as ProposedAction;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], action };
            return next;
          });
        } catch {
          // Malformed marker payload — ignore, the text response already rendered fine.
        }
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: "VAULT is temporarily unavailable. Try again in a moment." };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  async function openHistory() {
    setShowHistory(true);
    const list = await listVaultConversations();
    setHistory(list);
  }

  async function loadConversation(id: string) {
    const msgs = await loadVaultConversation(id);
    setMessages(msgs.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
    setConversationId(id);
    setShowHistory(false);
  }

  function newConversation() {
    setMessages([]);
    setConversationId(undefined);
    setShowHistory(false);
  }

  const quickActions = role === "researcher" ? RESEARCHER_QUICK_ACTIONS : ADMIN_QUICK_ACTIONS;

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #2dd4bf 0%, #84cc16 100%)" }}
      >
        <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
          {open ? <X className="w-6 h-6 text-black" /> : <Sparkles className="w-6 h-6 text-black" />}
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-5 z-40 w-[380px] max-w-[calc(100vw-2.5rem)] h-[560px] max-h-[calc(100vh-8rem)] bg-vault-surface border border-vault-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-vault-border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg" style={{ background: "linear-gradient(135deg, #2dd4bf 0%, #84cc16 100%)" }} />
                <span className="text-sm font-semibold">VAULT</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={newConversation} className="p-1.5 text-vault-muted hover:text-vault-text rounded-lg hover:bg-vault-elevated" title="New conversation">
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button onClick={openHistory} className="p-1.5 text-vault-muted hover:text-vault-text rounded-lg hover:bg-vault-elevated" title="History">
                  <History className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {showHistory ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {history.length === 0 && <p className="text-xs text-vault-muted p-2">No past conversations yet.</p>}
                {history.map((h) => (
                  <button key={h.id} onClick={() => loadConversation(h.id)} className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-vault-elevated truncate">
                    {h.title ?? "Untitled"}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-vault-muted mb-3">
                        {context.submissionId || context.programId
                          ? "I can see what you're looking at — ask away."
                          : "Ask me anything about scope, severity, or your reports."}
                      </p>
                      {quickActions.map((q) => (
                        <button key={q} onClick={() => send(q)} className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-vault-elevated hover:bg-vault-border transition-colors">
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={`text-sm ${m.role === "user" ? "text-right" : ""} space-y-2`}>
                      <div className={`inline-block max-w-[85%] rounded-xl px-3 py-2 text-left ${
                        m.role === "user" ? "bg-vault-teal text-black" : "bg-vault-elevated text-vault-text"
                      }`}>
                        {m.role === "assistant" ? (
                          <div className="vault-chat-md text-sm leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || "…"}</ReactMarkdown>
                          </div>
                        ) : m.content}
                      </div>
                      {m.action && (
                        <div>
                          <VaultActionCard action={m.action} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-3 border-t border-vault-border flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send(input)}
                    placeholder="Ask VAULT..."
                    className="vault-input flex-1 text-sm"
                    disabled={streaming}
                  />
                  <button onClick={() => send(input)} disabled={streaming || !input.trim()} className="p-2 rounded-lg bg-vault-teal text-black disabled:opacity-40">
                    {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
