'use client';

import { useCallback, useState } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  status?: 'normal' | 'error';
}

const FALLBACK_CHAT_ERROR = 'Sorry, I could not complete that request. Please try again in a moment.';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]);
    setInput('');
    setIsLoading(false);
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

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((message) => ({
              role: message.role,
              content: message.content,
            })),
          }),
        });

        if (!response.ok || !response.body) {
          const detail = await response.text();
          let message = FALLBACK_CHAT_ERROR;

          try {
            const parsed = JSON.parse(detail);
            message = parsed?.error || message;
          } catch {
            if (detail.trim()) {
              message = detail.trim();
            }
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
            const eventType = lines.find((line) => line.startsWith('event:'))?.replace('event:', '').trim();
            if (eventType === 'done') continue;

            const dataLine = lines.find((line) => line.startsWith('data:'));
            if (!dataLine) continue;

            try {
              const parsed = JSON.parse(dataLine.replace('data:', '').trim());
              const token = parsed?.token;
              if (typeof token === 'string' && token.length > 0) {
                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === assistantId
                      ? { ...message, content: message.content + token, status: 'normal' }
                      : message
                  )
                );
              }
            } catch {
              // Ignore malformed SSE payloads.
            }
          }
        }
      } catch (error: any) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: error?.message || FALLBACK_CHAT_ERROR,
                  status: 'error',
                }
              : message
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages]
  );

  return {
    messages,
    input,
    isLoading,
    handleInputChange,
    resetChat,
    sendMessage,
  };
}
