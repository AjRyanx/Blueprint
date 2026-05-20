'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useChatStore } from '@/stores/chat-store';
import { toast } from 'sonner';

const API = process.env.NEXT_PUBLIC_API_URL?.replace('localhost', '127.0.0.1') || 'http://127.0.0.1:4000';

async function loadMessages(projectId: string, token: string) {
  const res = await fetch(`${API}/api/v1/projects/${projectId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return json.data ?? [];
}

async function saveMessage(projectId: string, token: string, role: string, content: string) {
  const res = await fetch(`${API}/api/v1/projects/${projectId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role, content }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export function useChat(projectId: string) {
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;
  const { messages, isStreaming, setMessages, addMessage, appendToLastMessage, setStreaming } = useChatStore();
  const abortRef = useRef<AbortController | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    setMessages([]);
    loadedRef.current = false;
  }, [projectId, setMessages]);

  useEffect(() => {
    if (!token || loadedRef.current) return;
    loadedRef.current = true;
    loadMessages(projectId, token).then((msgs) => {
      setMessages(msgs.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at ?? m.createdAt),
      })));
    }).catch(() => {});
  }, [projectId, token, setMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      const history = useChatStore.getState().messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const userMsg = { id: crypto.randomUUID(), role: 'user' as const, content, timestamp: new Date() };
      addMessage(userMsg);
      saveMessage(projectId, token, 'user', content).catch(() => {});

      const assistantId = crypto.randomUUID();
      addMessage({ id: assistantId, role: 'assistant', content: '', timestamp: new Date() });
      setStreaming(true);

      abortRef.current = new AbortController();

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };

        if (!token || token === 'undefined' || token === 'null') {
          toast.error('Authentication Error: Missing API Token.');
          throw new Error('Missing API Token');
        }

        headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(
          `${API}/api/v1/projects/${projectId}/chat`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ 
              message: content,
              history
            }),
            signal: abortRef.current.signal,
          },
        );

        if (!response.ok) throw new Error('Chat request failed');

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]' || !data) continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.token) {
                  fullContent += parsed.token;
                  appendToLastMessage(parsed.token);
                } else if (parsed.error) {
                  console.error('Chat error:', parsed.error);
                }
              } catch {}
            }
          }
        }

        if (fullContent) {
          saveMessage(projectId, token, 'assistant', fullContent).catch(() => {});
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error('Chat stream error:', err);
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [projectId, token, addMessage, appendToLastMessage, setStreaming],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, [setStreaming]);

  return { messages, isStreaming, sendMessage, cancel };
}
