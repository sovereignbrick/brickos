'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'
import { ChatMessage } from '@/lib/types'
import { RatingButtons } from './rating-buttons'

interface ChatBubbleProps {
  message: ChatMessage
  conversationId: string
  onRate: (messageId: string, rating: 'helpful' | 'not_helpful') => Promise<void>
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isInternalLink(href: string): boolean {
  return href.startsWith('/') || href.startsWith('#')
}

export function ChatBubble({ message, conversationId, onRate }: ChatBubbleProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end px-4 py-1">
        <div
          className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm text-white/90"
          style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
          }}
        >
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start px-4 py-1">
      <div className="flex gap-2 max-w-[85%]">
        {/* Doctor icon */}
        <div className="shrink-0 w-7 h-7 rounded-full bg-teal-500/15 flex items-center justify-center text-sm mt-1">
          🩺
        </div>
        <div
          className="rounded-2xl rounded-tl-sm text-sm text-white/85 border-l-2 border-teal-500/40 pl-4 pr-4 py-3"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h3: ({ children }) => (
                <h3 className="text-sm font-bold text-white mt-3 mb-1.5 first:mt-0">{children}</h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-sm font-semibold text-white/90 mt-2 mb-1">{children}</h4>
              ),
              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              code: ({ children }) => <code className="bg-white/10 px-1 rounded text-sm font-mono">{children}</code>,
              strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-white/20 pl-3 text-white/70 italic">
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => {
                if (!href) return <span>{children}</span>
                if (isInternalLink(href)) {
                  return (
                    <Link href={href} className="text-teal-400 hover:text-teal-300 underline underline-offset-2">
                      {children}
                    </Link>
                  )
                }
                return (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 underline underline-offset-2">
                    {children}
                  </a>
                )
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
          <div className="mt-2">
            <RatingButtons
              messageId={message.id}
              conversationId={conversationId}
              onRate={onRate}
            />
            <span className="text-xs text-white/20 mt-1 block">
              {formatTime(message.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
