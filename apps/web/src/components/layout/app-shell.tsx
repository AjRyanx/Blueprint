'use client';

import { PhaseSidebar } from './phase-sidebar';
import { useProjectStore } from '@/stores/project-store';
import { useProject } from '@/hooks/use-project';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeft, LogOut, Folder, Sparkles } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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

  const handleSignOut = useCallback(() => {
    signOut({ callbackUrl: '/auth/login' });
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
      <div className="h-screen w-screen flex items-center justify-center bg-background relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin shadow-md" />
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono animate-pulse">
            {isMounted ? 'Decrypting Session...' : 'Calibrating Workspace...'}
          </p>
        </div>
      </div>
    );
  }

  // Get user initials for avatar fallback
  const userEmail = session?.user?.email || 'Builder';
  const userInitials = userEmail.substring(0, 2).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      {projectId && <PhaseSidebar />}

      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-border/40 flex items-center justify-between px-6 bg-card/65 backdrop-blur-md shrink-0 relative z-20">
          <div className="flex items-center gap-4">
            {projectId && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 rounded-lg hover:bg-accent/50 border border-border/20 transition-all" 
                onClick={toggleSidebar}
              >
                {sidebarOpen ? <PanelLeftClose className="h-4.5 w-4.5" /> : <PanelLeft className="h-4.5 w-4.5" />}
              </Button>
            )}
            <div 
              className="flex items-center gap-2 cursor-pointer group" 
              onClick={() => router.push('/')}
            >
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md shadow-primary/20 group-hover:scale-105 transition-all">
                B
              </div>
              <span className="font-extrabold tracking-tight text-base group-hover:text-primary transition-colors">
                Blueprint
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shadow-sm shadow-primary/50" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/projects')}
              className="font-medium text-xs tracking-wide hover:bg-accent/40 rounded-lg gap-1.5 h-9"
            >
              <Folder className="h-4 w-4" />
              <span>Blueprints</span>
            </Button>
            
            <ThemeToggle />

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 border border-border/40 hover:bg-accent/50 shadow-sm transition-all duration-300">
                  <Avatar className="h-8.5 w-8.5 rounded-full">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 border-border/80 bg-background/95 backdrop-blur-md" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none text-foreground">Builder Workspace</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">{userEmail}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/40" />
                <DropdownMenuItem 
                  onClick={() => router.push('/')}
                  className="flex items-center gap-2 cursor-pointer focus:bg-accent/80"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Start New Blueprint</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => router.push('/projects')}
                  className="flex items-center gap-2 cursor-pointer focus:bg-accent/80"
                >
                  <Folder className="h-4 w-4" />
                  <span>Your Blueprints</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/40" />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="flex items-center gap-2 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="flex-1 overflow-hidden flex relative z-10">
          <div className="flex-1 overflow-auto bg-background/95">{children}</div>
          {chatPanel && (
            <div className="w-[380px] shrink-0 hidden xl:block border-l border-border/40 bg-card/65">{chatPanel}</div>
          )}
        </main>
      </div>
    </div>
  );
}
