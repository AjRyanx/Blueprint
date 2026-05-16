'use client';

import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { ChatPanel } from '@/components/layout/chat-panel';
import { ChecklistViewer } from '@/components/checklist-viewer';
import { useChat } from '@/hooks/use-chat';

import { useProject } from '@/hooks/use-project';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function SecurityPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;
  const { data: project } = useProject(projectId);
  const queryClient = useQueryClient();
  const { messages, isStreaming, sendMessage } = useChat(projectId);

  // Auto-advance phase to 5 if user reached this page
  useEffect(() => {
    if (project && project.currentPhase < 5 && token) {
      fetch(`${API}/api/v1/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPhase: 5 }),
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      });
    }
  }, [project, projectId, token, queryClient]);

  return (
    <AppShell
      projectId={projectId}
      chatPanel={
        <ChatPanel projectId={projectId} sendMessage={sendMessage} isStreaming={isStreaming} />
      }
    >
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Security & Standards Planning</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Phase 5 — Complete the security checklist. This must be signed off before implementation.
          </p>
        </div>
        <ChecklistViewer projectId={projectId} />
      </div>
    </AppShell>
  );
}
