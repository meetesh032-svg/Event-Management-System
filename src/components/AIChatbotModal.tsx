"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, MessageCircle, X, Send, Bot, User, ArrowRight, Compass } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  events?: Array<{
    id: number;
    title: string;
    category: string;
    location: string;
    ticketPriceCents: number;
    imageUrl?: string | null;
  }>;
}

export function AIChatbotModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-welcome",
      sender: "bot",
      text: "Hello! I am your Gatherly AI Concierge. Ask me anything about upcoming concerts, comedy shows, seat booking, or ticket policies!",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: "bot",
            text: data.reply,
            events: data.events,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: "bot",
            text: "I am having trouble connecting right now. Please try again in a moment.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: "Network error. Please check your internet connection.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "🎸 Find live music shows",
    "😂 Stand-up comedy nearby",
    "🎟️ How do ticket refunds work?",
    "💺 How to book specific seats?",
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Concierge"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-[#F84464] px-4 py-3.5 text-xs font-extrabold text-white shadow-2xl shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all group"
      >
        <Sparkles className="h-4 w-4 animate-spin text-amber-300" style={{ animationDuration: "6s" }} />
        <span>Ask AI Concierge</span>
      </button>

      {/* Chat Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm transition">
          <div className="flex flex-col h-[85vh] sm:h-[620px] w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-gray-950 via-slate-900 to-indigo-950 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-amber-300 border border-white/10">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-1.5">
                    Gatherly AI Concierge
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                      Live
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400">Instant event discovery, booking & support assistant</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.sender === "bot" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-sm ${
                      msg.sender === "user"
                        ? "bg-indigo-600 text-white rounded-br-none"
                        : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Render matching event cards inside chat */}
                    {msg.events && msg.events.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-gray-100 pt-2">
                        {msg.events.map((evt) => (
                          <Link
                            key={evt.id}
                            href={`/events/${evt.id}`}
                            onClick={() => setIsOpen(false)}
                            className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-2 hover:bg-indigo-50/50 transition"
                          >
                            <img
                              src={evt.imageUrl || "/placeholder-event.jpg"}
                              alt={evt.title}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 truncate">
                                {evt.title}
                              </p>
                              <p className="text-[10px] text-gray-500 truncate">
                                {evt.category} • {evt.location}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-gray-900 shrink-0">
                              {formatPrice(evt.ticketPriceCents)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {msg.sender === "user" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600 text-xs">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <span className="rounded-2xl bg-white border border-gray-200 px-3 py-2 animate-pulse text-[11px]">
                    Gatherly AI is searching events...
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-4 py-2 border-t border-gray-100 bg-white flex gap-1.5 overflow-x-auto scrollbar-none">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 p-3 border-t border-gray-200 bg-white"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about events, dates, tickets, seats..."
                className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-gray-900 outline-none focus:border-indigo-600 transition"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition shadow-sm"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
