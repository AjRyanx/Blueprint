'use client';

import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { ChatPanel } from '@/components/layout/chat-panel';
import { DataModeller } from '@/components/data-modeller';
import { useChat } from '@/hooks/use-chat';

export default function DataPage() {
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
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Data Modelling</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Phase 4 — Define entities, attributes, and relationships for your data model.
          </p>
        </div>
        <DataModeller projectId={projectId} />
      </div>
    </AppShell>
  );
}
