'use client';

import { PhaseSidebar } from './phase-sidebar';
import { useProjectStore } from '@/stores/project-store';
import { useProject } from '@/hooks/use-project';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeft, ChevronLeft } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type AppShellProps = {
  children: React.ReactNode;
  chatPanel?: React.ReactNode;
  projectId?: string;
};

export function AppShell({ children, chatPanel, projectId }: AppShellProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isForcedReady, setIsForcedReady] = useState(false);
  const { sidebarOpen, toggleSidebar, setCurrentPhase, setCurrentProject } = useProjectStore();
  const { data: session, status } = useSession();
  const router = useRouter();

  const { data: project } = useProject(projectId ?? '');

  useEffect(() => {
    setIsMounted(true);
    // Force ready after 3 seconds if session is still loading
    const timer = setTimeout(() => {
      setIsForcedReady(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isMounted && projectId) {
      setCurrentProject(projectId);
    }
  }, [isMounted, projectId, setCurrentProject]);

  useEffect(() => {
    if (isMounted && projectId && project?.currentPhase) {
      setCurrentPhase(project.currentPhase);
    }
  }, [isMounted, projectId, project?.currentPhase, setCurrentPhase]);

  const handleSignOut = useCallback(async () => {
    import('next-auth/react').then(({ signOut }) => signOut({ callbackUrl: '/auth/login' }));
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    if (status === 'unauthenticated' && !isForcedReady) {
      router.push('/auth/login');
    }
  }, [isMounted, status, router, isForcedReady]);

  const isLoading = status === 'loading' && !isForcedReady;

  if (!isMounted || isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">
            {isMounted ? 'Syncing session...' : 'Loading shell...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {projectId && <PhaseSidebar />}

      <div className="flex flex-1 flex-col min-w-0">
        <header className="h-12 border-b flex items-center justify-between px-4 bg-card shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleSidebar}>
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
            <span className="font-bold cursor-pointer" onClick={() => router.push('/')}>Blueprint</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{session?.user?.email}</span>
            <Button variant="ghost" size="sm" onClick={() => router.push('/projects')}>Projects</Button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-auto bg-background">{children}</div>
          {chatPanel && (
            <div className="w-96 shrink-0 hidden xl:block border-l bg-card">{chatPanel}</div>
          )}
        </main>
      </div>
    </div>
  );
}
