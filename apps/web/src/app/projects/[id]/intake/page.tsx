'use client';

import { useParams } from 'next/navigation';
import { useChat } from '@/hooks/use-chat';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/app-shell';
import { ChatPanel } from '@/components/layout/chat-panel';
import { BriefViewer } from '@/components/brief-viewer';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FileText, Sparkles, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const API = process.env.NEXT_PUBLIC_API_URL?.replace('localhost', '127.0.0.1') || 'http://127.0.0.1:4000';

async function fetchProject(projectId: string, token: string) {
  const res = await fetch(`${API}/api/v1/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export default function IntakePage() {
  const params = useParams();
  const projectId = params.id as string;
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;
  const { messages, isStreaming, sendMessage } = useChat(projectId);
  const [isMounted, setIsMounted] = useState(false);
  const [showManualBrief, setShowManualBrief] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: project, isLoading, refetch } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId, token),
    enabled: !!token,
  });

  const brief = project?.brief;

  const synthesizeMutation = useMutation({
    mutationFn: async (currentToken: string) => {
      if (!currentToken) throw new Error('Not authenticated');
      const res = await fetch(`${API}/api/v1/projects/${projectId}/intake/synthesize`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          conversation: messages.map((m: any) => ({ role: m.role, content: m.content })),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      toast.success('Project brief generated!');
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to synthesize brief');
    },
  });

  const saveBriefMutation = useMutation({
    mutationFn: async ({ briefData, currentToken }: { briefData: any; currentToken: string }) => {
      if (!currentToken) throw new Error('Not authenticated');
      const res = await fetch(`${API}/api/v1/projects/${projectId}/intake/brief`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify(briefData),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      toast.success('Brief saved');
      refetch();
    },
  });

  if (!isMounted || isLoading) {
    return (
      <AppShell>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      projectId={projectId}
      chatPanel={
        <ChatPanel projectId={projectId} sendMessage={sendMessage} isStreaming={isStreaming} />
      }
    >
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <section>
          <h1 className="text-2xl font-bold">Idea Capture & Scoping</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Phase 1 — Describe your project idea. Blueprint will help you build a structured brief.
          </p>
        </section>

        {!brief && messages.length > 5 && (
          <Alert variant="info">
            <Sparkles className="h-4 w-4" />
            <AlertTitle>Ready to synthesize?</AlertTitle>
            <AlertDescription>
              You've had a good conversation. Generate your project brief when you're ready.
            </AlertDescription>
          </Alert>
        )}

        {brief && (
          <div className="space-y-6">
            <BriefViewer
              brief={brief}
              onSave={async (data) => {
                if (token) await saveBriefMutation.mutateAsync({ briefData: data, currentToken: token });
              }}
              onRegenerate={() => {
                if (token) synthesizeMutation.mutate(token);
              }}
              isRegenerating={synthesizeMutation.isPending}
            />
            
            {project?.currentPhase >= 2 && (
              <div className="flex justify-end pt-4">
                <Button 
                  size="lg" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg hover:shadow-xl transition-all"
                  onClick={() => {
                    setCurrentPhase(2);
                    router.push(`/projects/${projectId}/requirements`);
                  }}
                >
                  Proceed to Requirements <ChevronLeft className="h-4 w-4 rotate-180" />
                </Button>
              </div>
            )}
          </div>
        )}

        {brief && messages.length > 5 && (
          <div className="flex justify-center pt-8 border-t">
            <Button
              variant="outline"
              onClick={() => {
                if (token) synthesizeMutation.mutate(token);
              }}
              disabled={synthesizeMutation.isPending || !token}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {synthesizeMutation.isPending ? 'AI Regenerating...' : 'Regenerate with AI'}
            </Button>
          </div>
        )}

        {(!brief || showManualBrief) && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-lg">No brief yet</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              Chat with Blueprint Assistant on the right to describe your project.
            </p>
            <div className="flex items-center justify-center gap-3">
              {messages.length > 5 && (
                <Button
                  onClick={() => {
                    if (token) synthesizeMutation.mutate(token);
                  }}
                  disabled={synthesizeMutation.isPending || !token}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {synthesizeMutation.isPending ? 'Generating...' : 'AI Generate Brief'}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setShowManualBrief(true);
                  queryClient.setQueryData(['project', projectId], (old: any) => ({
                    ...old,
                    brief: {
                      projectName: '',
                      oneLineDescription: '',
                      problemStatement: '',
                      targetUsers: '',
                      coreValueProposition: '',
                      outOfScope: [],
                      successMetrics: [],
                    }
                  }));
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Create Manually
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
