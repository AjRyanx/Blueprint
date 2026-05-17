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
import { FileText, Sparkles, Pencil, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/stores/project-store';

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
  const isAiReady = messages.some((m: any) => m.role === 'assistant' && m.content.includes('[READY_TO_SYNTHESIZE]'));
  const [isMounted, setIsMounted] = useState(false);
  const [showManualBrief, setShowManualBrief] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { setCurrentPhase } = useProjectStore();

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
        <div className="p-8 max-w-3xl mx-auto space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48 rounded-lg" />
            <Skeleton className="h-4 w-72 rounded-lg" />
          </div>
          <Skeleton className="h-[400px] w-full rounded-2xl" />
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
      <div className="relative min-h-[calc(100vh-3rem)] w-full p-6 md:p-8 overflow-hidden bg-background">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-rose-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-3xl mx-auto space-y-8 relative z-10">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
                Idea Capture & Scoping
              </h1>
              <p className="text-muted-foreground text-sm font-light">
                Phase 1 — Formulate the core vision and product parameters using conversational AI context.
              </p>
            </div>
          </div>

          {!brief && isAiReady && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex gap-3">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <h5 className="font-semibold text-sm">Ready to Synthesize Brief</h5>
                  <p className="text-xs text-muted-foreground leading-normal">
                    You've provided some excellent details. Let's let Blueprint compile your professional-grade Product Brief.
                  </p>
                </div>
              </div>
            </div>
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
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg hover:shadow-emerald-900/20 hover:scale-[1.02] active:scale-95 transition-all"
                    onClick={() => {
                      setCurrentPhase(2);
                      router.push(`/projects/${projectId}/requirements`);
                    }}
                  >
                    <span>Proceed to Requirements</span>
                    <ChevronLeft className="h-4 w-4 rotate-180" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {brief && isAiReady && (
            <div className="flex justify-center pt-8 border-t border-border/40">
              <Button
                variant="outline"
                className="hover:border-primary/40 hover:bg-background/80 transition-all gap-2"
                onClick={() => {
                  if (token) synthesizeMutation.mutate(token);
                }}
                disabled={synthesizeMutation.isPending || !token}
              >
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <span>{synthesizeMutation.isPending ? 'Forging New Version...' : 'Regenerate Brief with AI'}</span>
              </Button>
            </div>
          )}

          {(!brief || showManualBrief) && (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-2xl border border-dashed border-border/60 bg-card/20 backdrop-blur-sm animate-in fade-in duration-500">
              <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-6 shadow-inner">
                <FileText className="h-8 w-8 text-primary/70" />
              </div>
              <h3 className="font-bold text-xl">Capture Your Innovation</h3>
              <p className="text-muted-foreground text-sm max-w-sm mt-2 mb-8 font-light leading-relaxed">
                Chat with the AI Copilot on the right panel to outline the scope, or quickstart a blank template manually.
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-3">
                {isAiReady && (
                  <Button
                    onClick={() => {
                      if (token) synthesizeMutation.mutate(token);
                    }}
                    disabled={synthesizeMutation.isPending || !token}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold gap-2 shadow-lg hover:shadow-primary/10 transition-all"
                  >
                    <Sparkles className="h-4 w-4 text-primary-foreground animate-pulse" />
                    <span>{synthesizeMutation.isPending ? 'Analyzing Context...' : 'AI Synthesize Brief'}</span>
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
                  className="hover:border-primary/40 hover:bg-background/80 transition-all gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  <span>Manual Draft</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
