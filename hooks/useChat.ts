'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  status?: 'normal' | 'error';
}

const FALLBACK_CHAT_ERROR = 'Sorry, I could not complete that request. Please try again in a moment.';
const STORAGE_KEY = 'bus-sathi-chat-v2';
const MAX_PERSISTED = 60;

type UseChatOptions = {
  pathname?: string | null;
};

function loadPersisted(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_PERSISTED) : [];
  } catch {
    return [];
  }
}

export function useChat(options?: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const hydrated = useRef(false);

  // Hydrate from localStorage once (client only — avoids SSR mismatch).
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const saved = loadPersisted();
    if (saved.length) setMessages(saved);
  }, []);

  // Persist (skip while a stream is mid-flight to avoid thrashing).
  useEffect(() => {
    if (typeof window === 'undefined' || !hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_PERSISTED)));
    } catch {
      /* storage full / unavailable — ignore */
    }
  }, [messages]);

  const handleInputChange = useCallback((value: string) => setInput(value), []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  const resetChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setInput('');
    setIsLoading(false);
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    }
  }, []);

  const sendMessage = useCallback(
    async (contentOverride?: string) => {
      const content = (contentOverride ?? input).trim();
      if (!content || isLoading) return;

      const createdAt = Date.now();
      const userMessage: ChatMessage = {
        id: `user-${createdAt}`,
        role: 'user',
        content,
        createdAt,
        status: 'normal',
      };

      const assistantId = `assistant-${createdAt}`;
      setMessages((prev) => [
        ...prev,
        userMessage,
        { id: assistantId, role: 'assistant', content: '', createdAt: Date.now(), status: 'normal' },
      ]);
      setInput('');
      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            pathname: options?.pathname || '',
            messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!response.ok || !response.body) {
          const detail = await response.text();
          let message = FALLBACK_CHAT_ERROR;
          try {
            message = JSON.parse(detail)?.error || message;
          } catch {
            if (detail.trim()) message = detail.trim();
          }
          throw new Error(message);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let raw = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          raw += decoder.decode(value, { stream: true });
          const events = raw.split('\n\n');
          raw = events.pop() || '';

          for (const event of events) {
            const lines = event.split('\n');
            const eventType = lines.find((l) => l.startsWith('event:'))?.replace('event:', '').trim();
            if (eventType === 'done') continue;

            const dataLine = lines.find((l) => l.startsWith('data:'));
            if (!dataLine) continue;

            try {
              const parsed = JSON.parse(dataLine.replace('data:', '').trim());
              const token = parsed?.token;
              if (typeof token === 'string' && token.length > 0) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: m.content + token, status: 'normal' } : m
                  )
                );
              }
            } catch {
              /* ignore malformed SSE */
            }
          }
        }
      } catch (error: any) {
        // User-initiated stop: keep whatever streamed, no error styling.
        if (controller.signal.aborted) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId && !m.content
                ? { ...m, content: '_(stopped)_', status: 'normal' }
                : m
            )
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: error?.message || FALLBACK_CHAT_ERROR, status: 'error' } : m
            )
          );
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, options?.pathname]
  );

  return {
    messages,
    input,
    isLoading,
    handleInputChange,
    resetChat,
    sendMessage,
    stop,
  };
}
