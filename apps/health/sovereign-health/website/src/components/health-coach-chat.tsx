"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { SITE_CONFIG } from "@/lib/config";
import { useI18n } from "@/lib/i18n";

const API_BASE = SITE_CONFIG.apiUrl;

const URL_LABELS: Record<string, string> = {
  '': 'Sovereign Health',
  '/': 'Sovereign Health',
  '/pricing': 'Pricing & Plans',
  '/features': 'Features',
  '/markers': 'Biomarker Directory',
  '/security': 'Security & Privacy',
  '/open-source': 'Open Source',
  '/contact': 'Contact Us',
  '/terms': 'Terms of Service',
  '/privacy': 'Privacy Policy',
  '/referral-program': 'Referral Program',
  '/partners': 'Partners',
  '/impressum': 'Impressum',
  '/health-zones': 'Health Zones',
  '/about': 'About Us',
}

function linkifyUrls(text: string): string {
  return text.replace(
    /(?<!\[[^\]]*?)(?<!\()(https?:\/\/[^\s,)>\]]+)/g,
    (url) => {
      try {
        const parsed = new URL(url)
        const path = parsed.pathname.replace(/\/+$/, '')
        if (URL_LABELS[path] !== undefined) {
          return `[${URL_LABELS[path]}](${url})`
        }
        const markerMatch = path.match(/^\/markers\/(.+)$/)
        if (markerMatch) {
          const name = markerMatch[1].replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          return `[${name} Biomarker](${url})`
        }
        if (parsed.hostname.includes('app.')) {
          return `[Open App](${url})`
        }
        const lastSegment = path.split('/').filter(Boolean).pop()
        if (lastSegment) {
          const label = lastSegment.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          return `[${label}](${url})`
        }
        return `[Sovereign Health](${url})`
      } catch {
        return url
      }
    }
  )
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_QUESTION_KEYS = [
  "healthCoach.quickQuestions.0",
  "healthCoach.quickQuestions.1",
  "healthCoach.quickQuestions.2",
  "healthCoach.quickQuestions.3",
  "healthCoach.quickQuestions.4",
  "healthCoach.quickQuestions.5",
];

const SESSION_KEY = "health_coach_session_id";
const SESSION_TS_KEY = "health_coach_session_ts";
const SESSION_TTL = 30 * 60 * 1000; // 30 min

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  const ts = localStorage.getItem(SESSION_TS_KEY);
  if (ts && Date.now() - parseInt(ts) > SESSION_TTL) {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_TS_KEY);
    return null;
  }
  return localStorage.getItem(SESSION_KEY);
}

function setSessionId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, id);
  localStorage.setItem(SESSION_TS_KEY, Date.now().toString());
}

function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_TS_KEY);
}

export function HealthCoachChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const [messageCount, setMessageCount] = useState(0);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || isLimitReached) return;

    setError(null);
    setShowQuickQuestions(false);
    const userMessage: Message = { role: "user", content: content.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const newCount = messageCount + 1;
    setMessageCount(newCount);

    try {
      const sessionId = getSessionId();
      const res = await fetch(`${API_BASE}/v1/chat/public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: content.trim() }],
          session_id: sessionId || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setIsLimitReached(true);
          setRateLimitMessage(
            json?.error?.message ||
              t("healthCoach.errors.default")
          );
          setIsLoading(false);
          return;
        }
        const errMsg =
          json?.error?.message || t("healthCoach.errors.default");
        setError(errMsg);
        setIsLoading(false);
        return;
      }

      const data = json.data;
      if (data.session_id) {
        setSessionId(data.session_id);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.content,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setError(t("healthCoach.errors.connectionError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    clearSession();
    setMessages([]);
    setMessageCount(0);
    setIsLimitReached(false);
    setRateLimitMessage(null);
    setShowQuickQuestions(true);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-lg transition-all duration-300 hover:bg-[var(--card-hover)] hover:shadow-xl"
          aria-label={t("healthCoach.openChat")}
        >
          <span className="text-xl">💬</span>
          <span className="text-sm font-medium text-foreground">
            {t("healthCoach.bubbleLabel")}
          </span>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-0 right-0 z-50 flex flex-col border-l border-t border-[var(--border)] bg-[var(--background)] shadow-2xl transition-all duration-300 sm:bottom-6 sm:right-6 sm:max-h-[600px] sm:w-[400px] sm:rounded-xl sm:border"
          style={{
            height: "100dvh",
            width: "100vw",
          }}
          role="dialog"
          aria-label="Health Coach Chat"
        >
          <style>{`
            @media (min-width: 640px) {
              [role="dialog"][aria-label="Health Coach Chat"] {
                height: 600px !important;
                width: 400px !important;
              }
            }
          `}</style>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <span className="font-semibold text-foreground">
                {t("healthCoach.headerTitle")}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-foreground"
              aria-label={t("healthCoach.closeChat")}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {/* Quick question chips */}
            {showQuickQuestions && messages.length === 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs text-[var(--muted)]">
                  {t("healthCoach.quickQuestionsPrompt")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_QUESTION_KEYS.map((key, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(t(key))}
                      className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-[var(--card-hover)]"
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat messages */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`mb-3 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "border border-[var(--border)] bg-[var(--card)] text-foreground"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div
                      className="prose prose-sm prose-invert max-w-none"
                      style={{ lineHeight: "1.5" }}
                    >
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline font-medium transition-colors"
                              style={{ color: '#60a5fa' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#93c5fd')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#60a5fa')}
                            >
                              {children}
                            </a>
                          ),
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="mb-2 ml-4 list-disc last:mb-0">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="mb-2 ml-4 list-decimal last:mb-0">{children}</ol>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-foreground">{children}</strong>
                          ),
                        }}
                      >
                        {linkifyUrls(msg.content)}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="mb-3 flex justify-start">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
                  <div className="flex gap-1">
                    <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:0ms]" />
                    <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:150ms]" />
                    <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-3 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
                {error}
              </div>
            )}

            {/* Upsell banner after 5 messages */}
            {messageCount >= 5 && !isLimitReached && (
              <div className="mb-3 rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-3 py-2 text-xs text-[var(--accent)]">
                {t("healthCoach.upsellMessage")}{" "}
                <a href="/pricing/" className="underline hover:text-foreground">
                  {t("healthCoach.upsellLink")}
                </a>
              </div>
            )}

            {/* Limit reached */}
            {isLimitReached && (
              <div className="mb-3 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3 text-center">
                <p className="mb-2 text-sm text-foreground">
                  {rateLimitMessage}
                </p>
                <a
                  href={`${SITE_CONFIG.appUrl}/register`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  {t("healthCoach.upsellLink")}
                </a>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-[var(--border)] px-4 py-3">
            {/* New conversation button */}
            {messages.length > 0 && (
              <button
                onClick={handleNewConversation}
                className="mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--card-hover)] hover:text-foreground"
              >
                {t("healthCoach.startNewConversation")}
              </button>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isLimitReached
                    ? t("healthCoach.inputPlaceholderLimitReached")
                    : t("healthCoach.inputPlaceholder")
                }
                disabled={isLoading || isLimitReached}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-foreground placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
                aria-label={t("healthCoach.sendMessage")}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim() || isLimitReached}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                aria-label={t("healthCoach.sendMessage")}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M1.5 1.5l13 6.5-13 6.5V9l8-1-8-1V1.5z" />
                </svg>
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-[var(--muted)]">
              {t("healthCoach.disclaimer")}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
