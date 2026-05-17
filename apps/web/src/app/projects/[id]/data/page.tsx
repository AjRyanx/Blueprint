'use client';

import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { ChatPanel } from '@/components/layout/chat-panel';
import { DataModeller } from '@/components/data-modeller';
import { useChat } from '@/hooks/use-chat';
import { useProjectStore } from '@/stores/project-store';
import { Database, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';

export default function DataPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { messages, isStreaming, sendMessage } = useChat(projectId);
  const { phases } = useProjectStore();
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;

  const phase4 = phases.find((p) => p.phase === 4);
  const isSkipped = phase4?.status === 'skipped';

  if (isSkipped) {
    return (
      <AppShell
        projectId={projectId}
        chatPanel={
          <ChatPanel projectId={projectId} sendMessage={sendMessage} isStreaming={isStreaming} />
        }
      >
        <div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-2xl animate-pulse" />
            <div className="relative bg-secondary/40 border border-amber-500/20 w-20 h-20 rounded-full flex items-center justify-center">
              <Database className="h-10 w-10 text-amber-500" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-background border border-amber-500/30 w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
              <EyeOff className="h-4 w-4 text-amber-500" />
            </div>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/80 bg-clip-text text-transparent">
            Database Skipped
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mb-8 leading-relaxed">
            Your system architecture has been resolved as <span className="font-semibold text-foreground">stateless / server-side persistence not required</span>. Phase 4 (Data Schema Modelling) is automatically bypassed.
          </p>

          <div className="w-full bg-card/45 backdrop-blur-md rounded-2xl border border-border/40 p-6 mb-8 text-left space-y-4">
            <h3 className="font-semibold text-xs text-primary uppercase tracking-wider">
              Why was this skipped?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Based on the project's intake requirements and architectural design patterns, the system performs all calculations, logic, or state routing without persisting user models or database rows.
            </p>
            <div className="flex items-start gap-2.5 text-xs text-amber-500/90 bg-amber-500/5 rounded-xl p-3.5 border border-amber-500/10">
              <span className="font-semibold select-none">💡</span>
              <p className="leading-relaxed">
                If your project scope changes and you now require database persistence (e.g., user profiles, save progress, or relational tables), you can re-enable this gateway anytime.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2.5 rounded-xl shadow-md transition-all duration-300 transform hover:scale-[1.02] flex items-center gap-2 group"
              onClick={async () => {
                try {
                  const API = process.env.NEXT_PUBLIC_API_URL || '';
                  const res = await fetch(`${API}/api/v1/projects/${projectId}/phases/enable`, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ phase: 4 })
                  });
                  if (res.ok) {
                    window.location.reload();
                  }
                } catch (err) {
                  console.error(err);
                }
              }}
            >
              <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
              Re-enable Database Modelling
            </Button>
            <Button
              variant="outline"
              className="rounded-xl px-6"
              onClick={() => {
                router.push(`/projects/${projectId}/security`);
              }}
            >
              Proceed to Security Scan
            </Button>
          </div>
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
