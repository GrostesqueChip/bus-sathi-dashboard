'use client';

import { FormEvent, KeyboardEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  ArrowDown, Bot, Check, Copy, Maximize2, MessageSquare, Minimize2,
  RotateCcw, Send, Sparkles, Square, X,
} from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import Markdown from '@/components/Markdown';

const QUICK_PROMPTS = [
  'Which routes need the most buses?',
  'Why was a route merged into a trunk?',
  'Which corridors look overloaded?',
  "Summarise today's fleet activity",
];

function formatTime(ts: number) {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(ts);
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((d) => (
        <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400"
          style={{ animationDelay: `${d * 0.12}s` }} />
      ))}
    </span>
  );
}

export default function ChatWidget() {
  const pathname = usePathname();
  const { messages, input, isLoading, handleInputChange, resetChat, sendMessage, stop } = useChat({ pathname });

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);   // in DOM (for exit anim)
  const [visible, setVisible] = useState(false);    // transitioned-in
  const [expanded, setExpanded] = useState(false);  // desktop wide mode
  const [atBottom, setAtBottom] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasMessages = messages.length > 0;
  const last = messages[messages.length - 1];

  // open / close with enter+exit transition
  const open = useCallback(() => { setMounted(true); setIsOpen(true); }, []);
  const close = useCallback(() => { setVisible(false); setIsOpen(false); }, []);
  useLayoutEffect(() => {
    if (isOpen && mounted) { const r = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(r); }
  }, [isOpen, mounted]);
  useEffect(() => {
    if (!isOpen && mounted) { const t = setTimeout(() => setMounted(false), 220); return () => clearTimeout(t); }
  }, [isOpen, mounted]);

  // keyboard: Ctrl/Cmd+K toggles, Esc closes
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); isOpen ? close() : open(); }
      if (e.key === 'Escape' && isOpen) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, open, close]);

  // focus + mobile body-scroll lock when open
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => textareaRef.current?.focus(), 120);
    const small = typeof window !== 'undefined' && window.innerWidth < 640;
    const prev = document.body.style.overflow;
    if (small) document.body.style.overflow = 'hidden';
    return () => { clearTimeout(t); document.body.style.overflow = prev; };
  }, [isOpen]);

  // auto-scroll to latest while near bottom
  useEffect(() => {
    if (!isOpen) return;
    const el = scrollRef.current;
    if (el && atBottom) el.scrollTo({ top: el.scrollHeight, behavior: isLoading ? 'auto' : 'smooth' });
  }, [isOpen, isLoading, last?.content, messages.length, atBottom]);

  // auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 90);
  };
  const jumpToLatest = () => {
    setAtBottom(true);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); if (!isLoading) sendMessage(); };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isLoading) sendMessage(); }
  };
  const copy = async (id: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 1500); } catch { /* */ }
  };

  return (
    <>
      {/* Launcher */}
      {!isOpen && (
        <button
          type="button"
          onClick={open}
          aria-label="Open Bus Sathi assistant"
          className="group fixed bottom-5 right-4 z-40 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-3.5 py-3 text-white shadow-[0_14px_40px_rgba(67,56,202,0.45)] ring-1 ring-white/20 transition-all hover:translate-y-[-2px] hover:shadow-[0_18px_50px_rgba(67,56,202,0.55)] sm:right-6"
        >
          <span className="relative flex h-7 w-7 items-center justify-center">
            <MessageSquare size={20} />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-indigo-600" />
          </span>
          <span className="hidden pr-1 text-sm font-bold sm:inline">Ask Bus Sathi</span>
        </button>
      )}

      {/* Backdrop (mobile) */}
      {mounted && (
        <div
          onClick={close}
          className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-200 sm:hidden ${visible ? 'opacity-100' : 'opacity-0'}`}
        />
      )}

      {/* Panel */}
      {mounted && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Bus Sathi assistant"
          className={[
            'fixed z-50 flex flex-col overflow-hidden bg-white shadow-[0_30px_90px_rgba(15,23,42,0.30)] transition-all duration-200 ease-out',
            // mobile: bottom sheet
            'inset-x-0 bottom-0 max-h-[90vh] h-[88vh] rounded-t-[1.75rem]',
            // desktop: floating card
            'sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[min(40rem,85vh)] sm:rounded-[1.75rem] sm:border sm:border-slate-200',
            expanded ? 'sm:w-[42rem]' : 'sm:w-[26rem]',
            visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 sm:translate-y-3',
          ].join(' ')}
        >
          {/* drag handle (mobile) */}
          <div className="flex justify-center pt-2 sm:hidden"><span className="h-1.5 w-10 rounded-full bg-slate-300" /></div>

          {/* Header */}
          <header className="relative flex items-center gap-3 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 px-4 py-3.5 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(96,165,250,0.30),_transparent_40%)]" />
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
              <Bot size={20} className="text-blue-100" />
            </div>
            <div className="relative min-w-0 flex-1">
              <h3 className="text-sm font-black tracking-tight">Bus Sathi Bot</h3>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-100/80">
                <span className={`h-1.5 w-1.5 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                {isLoading ? 'Thinking…' : 'Fleet & route intelligence'}
              </p>
            </div>
            <div className="relative flex items-center gap-1">
              {hasMessages && (
                <button type="button" onClick={resetChat} title="New chat" aria-label="New chat"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-blue-50/90 transition-colors hover:bg-white/15">
                  <RotateCcw size={16} />
                </button>
              )}
              <button type="button" onClick={() => setExpanded((v) => !v)} title={expanded ? 'Shrink' : 'Expand'}
                aria-label={expanded ? 'Shrink' : 'Expand'}
                className="hidden h-9 w-9 items-center justify-center rounded-xl text-blue-50/90 transition-colors hover:bg-white/15 sm:flex">
                {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button type="button" onClick={close} title="Close" aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-blue-50/90 transition-colors hover:bg-white/15">
                <X size={18} />
              </button>
            </div>
          </header>

          {/* Messages */}
          <div ref={scrollRef} onScroll={onScroll}
            className="relative min-h-0 flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-indigo-50/40 px-4 py-4">
            {!hasMessages && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="flex items-center gap-2 text-sm font-black text-slate-800">
                  <Sparkles size={16} className="text-indigo-500" /> Ask about routes, fleet & rationalisation
                </p>
                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                  I answer from the live fleet snapshot and the route plan — try a route code (e.g. <span className="font-mono font-semibold text-slate-700">SRGB02020503</span>), a driver, or fleet health.
                </p>
                <div className="mt-4 grid gap-2">
                  {QUICK_PROMPTS.map((p) => (
                    <button key={p} type="button" onClick={() => sendMessage(p)} disabled={isLoading}
                      className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left text-sm font-semibold text-slate-700 transition-all hover:border-indigo-300 hover:bg-white hover:shadow-sm disabled:opacity-50">
                      <span>{p}</span>
                      <Send size={13} className="shrink-0 text-slate-300 transition-colors group-hover:text-indigo-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => {
              const isUser = m.role === 'user';
              const isError = m.status === 'error';
              const streaming = !isUser && isLoading && m.id === last?.id;
              return (
                <div key={m.id} className={`group flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className={`mb-1 flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] ${isUser ? 'text-blue-500/70' : 'text-slate-400'}`}>
                    <span>{isUser ? 'You' : 'Bus Sathi'}</span><span>{formatTime(m.createdAt)}</span>
                  </div>
                  <div className={[
                    'max-w-[90%] rounded-2xl px-4 py-3 text-[14.5px] leading-7 shadow-sm',
                    isUser ? 'rounded-br-md bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                      : isError ? 'rounded-bl-md border border-amber-200 bg-amber-50 text-amber-900'
                        : 'rounded-bl-md border border-slate-200 bg-white text-slate-700',
                  ].join(' ')}>
                    {isUser ? (
                      <span className="whitespace-pre-wrap break-words">{m.content}</span>
                    ) : m.content ? (
                      <Markdown content={m.content} className="space-y-0.5 break-words [&_a]:break-words" />
                    ) : streaming ? <TypingDots /> : null}
                  </div>
                  {!isUser && !isError && m.content && !streaming && (
                    <button type="button" onClick={() => copy(m.id, m.content)}
                      className="mt-1 flex items-center gap-1 px-1 text-[11px] font-semibold text-slate-400 opacity-0 transition-opacity hover:text-indigo-600 group-hover:opacity-100">
                      {copiedId === m.id ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* jump to latest */}
          {!atBottom && hasMessages && (
            <button type="button" onClick={jumpToLatest} aria-label="Scroll to latest"
              className="absolute bottom-[5.5rem] left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-transform hover:scale-105">
              <ArrowDown size={16} />
            </button>
          )}

          {/* Composer */}
          <form onSubmit={onSubmit} className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-indigo-300 focus-within:bg-white">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Ask about a route, driver, or fleet health…"
                className="max-h-[140px] min-h-[24px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
              {isLoading ? (
                <button type="button" onClick={stop} title="Stop" aria-label="Stop generating"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white transition-colors hover:bg-slate-700">
                  <Square size={15} className="fill-current" />
                </button>
              ) : (
                <button type="submit" disabled={!input.trim()} title="Send" aria-label="Send"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white transition-all hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300">
                  <Send size={16} />
                </button>
              )}
            </div>
            <p className="mt-1.5 px-1 text-[10.5px] font-medium text-slate-400">
              {isLoading ? 'Generating… press Stop to cancel.' : 'Enter to send · Shift+Enter for a new line · ⌘/Ctrl+K to toggle'}
            </p>
          </form>
        </div>
      )}
    </>
  );
}
