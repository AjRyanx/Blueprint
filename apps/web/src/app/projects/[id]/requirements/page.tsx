'use client';

import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { ChatPanel } from '@/components/layout/chat-panel';
import { RequirementsBoard } from '@/components/requirements-board';
import { useChat } from '@/hooks/use-chat';

export default function RequirementsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { messages, isStreaming, sendMessage } = useChat(projectId);

  return (
    <AppShell
      projectId={projectId}
      chatPanel={
        <ChatPanel projectId={projectId} sendMessage={sendMessage} isStreaming={isStreaming} />
      }
    >
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Requirements Engineering</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Phase 2 — Define what your system must do.
          </p>
        </div>
        <RequirementsBoard projectId={projectId} />
      </div>
    </AppShell>
  );
}
