'use client';

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, MessageSquare, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { useChat } from '@/hooks/useChat';

const quickPrompts = [
  'Show active fleet status right now.',
  'Which trips are currently flagged and why?',
  'Which drivers have highest completed distance?',
];

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-500">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce"
            style={{ animationDelay: `${dot * 0.12}s` }}
          />
        ))}
      </div>
      <span className="font-medium">Analyzing the latest fleet snapshot...</span>
    </div>
  );
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, input, isLoading, handleInputChange, resetChat, sendMessage } = useChat();

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasMessages = useMemo(() => messages.length > 0, [messages.length]);
  const latestMessageContent = messages[messages.length - 1]?.content || '';

  useEffect(() => {
    if (!isOpen) return;

    const scroller = scrollAreaRef.current;
    if (!scroller) return;

    scroller.scrollTo({
      top: scroller.scrollHeight,
      behavior: isLoading ? 'auto' : 'smooth',
    });
  }, [isOpen, isLoading, latestMessageContent, messages.length]);

  useEffect(() => {
    if (!isOpen) return;
    textareaRef.current?.focus();
  }, [isOpen]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await sendMessage();
  };

  const onTextareaKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await sendMessage();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-5 right-4 z-40 flex items-center gap-3 rounded-[1.75rem] border border-indigo-400/40 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-4 py-3 text-white shadow-[0_18px_45px_rgba(37,99,235,0.35)] transition-all hover:translate-y-[-2px] hover:shadow-[0_22px_55px_rgba(67,56,202,0.38)] sm:bottom-6 sm:right-6"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur">
          {isOpen ? <X size={18} /> : <MessageSquare size={18} />}
        </span>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-black uppercase tracking-[0.22em]">AI Copilot</p>
          <p className="text-[11px] font-semibold text-blue-100/90">Fleet-aware and snapshot-ready</p>
        </div>
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-3 z-40 w-[calc(100vw-1.5rem)] max-w-[29rem] overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-[0_30px_90px_rgba(15,23,42,0.24)] backdrop-blur-xl sm:bottom-24 sm:right-6">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 px-5 pb-5 pt-5 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(96,165,250,0.32),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(129,140,248,0.28),_transparent_40%)]" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.4rem] border border-white/10 bg-white/10 shadow-inner shadow-white/10">
                <Bot size={22} className="text-blue-100" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.25em]">Transit AI Copilot</h3>
                    <p className="mt-1 text-sm font-semibold text-blue-100/90">Snapshot-aware fleet assistant</p>
                  </div>

                  {hasMessages && (
                    <button
                      type="button"
                      onClick={resetChat}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-blue-50 transition-colors hover:bg-white/15"
                      title="Start a fresh chat"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100">
                    Live fallback ready
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-100">
                    Auto-scroll on
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            ref={scrollAreaRef}
            className="h-[min(62vh,34rem)] space-y-4 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-4"
          >
            {!hasMessages && (
              <div className="rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur">
                <p className="flex items-center gap-2 text-sm font-black text-slate-800">
                  <Sparkles size={16} className="text-indigo-500" /> Ask about fleet movement, flagged trips, and top drivers
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  I can answer from the latest fleet snapshot and fall back gracefully if the model service is busy.
                </p>

                <div className="mt-4 grid gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="group rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-all hover:border-indigo-300 hover:bg-white hover:shadow-sm"
                    >
                      <span className="block transition-transform group-hover:translate-x-1">{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => {
              const isUser = message.role === 'user';
              const isError = message.status === 'error';

              return (
                <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[88%]">
                    <div
                      className={`mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] ${
                        isUser ? 'justify-end text-blue-600/80' : 'text-slate-400'
                      }`}
                    >
                      <span>{isUser ? 'You' : 'Copilot'}</span>
                      <span>{formatTime(message.createdAt)}</span>
                    </div>

                    <div
                      className={`whitespace-pre-wrap break-words rounded-[1.5rem] px-4 py-3.5 text-[15px] leading-7 shadow-sm ${
                        isUser
                          ? 'rounded-br-md bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-[0_18px_35px_rgba(79,70,229,0.25)]'
                          : isError
                            ? 'rounded-bl-md border border-amber-200 bg-amber-50 text-amber-950'
                            : 'rounded-bl-md border border-white/80 bg-white/92 text-slate-700 shadow-[0_16px_32px_rgba(15,23,42,0.06)]'
                      }`}
                    >
                      {message.content || (!isUser && isLoading ? <TypingIndicator /> : null)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={onSubmit} className="border-t border-slate-200/80 bg-white/90 p-3 backdrop-blur">
            <div className="rounded-[1.6rem] border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={onTextareaKeyDown}
                rows={2}
                placeholder="Ask about flagged trips, fleet health, top drivers..."
                className="max-h-36 min-h-[56px] w-full resize-none rounded-[1.2rem] border-0 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-0"
              />

              <div className="mt-1 flex items-center justify-between gap-3 px-2 pb-1">
                <p className="text-[11px] font-semibold text-slate-400">
                  {isLoading ? 'Reading the latest fleet data...' : 'Press Enter to send. Shift+Enter for a new line.'}
                </p>

                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_14px_28px_rgba(79,70,229,0.25)] transition-all hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
