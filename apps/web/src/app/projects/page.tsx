'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useProjects } from '@/hooks/use-project';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, FolderOpen, ArrowRight, FolderKanban, Activity, Calendar } from 'lucide-react';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function ProjectsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { data: projects = [], isLoading } = useProjects();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      const token = (session?.user as any)?.accessToken;
      if (!token || token === 'undefined' || token === 'null') {
        import('next-auth/react').then(({ signOut }) => signOut({ callbackUrl: '/auth/login' }));
      }
    }
  }, [status, router, session]);

  if (status === 'loading' || status === 'unauthenticated') return null;

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-8 max-w-5xl mx-auto space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="relative min-h-[calc(100vh-3rem)] w-full p-6 md:p-8 overflow-hidden bg-background">
        {/* Glow Effects */}
        <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto space-y-8 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-6 w-6 text-primary" />
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
                  Your Workspace
                </h1>
              </div>
              <p className="text-muted-foreground text-sm font-light">
                Manage, design, and implementation queue of your <span className="font-medium text-foreground">{projects.length} active project{projects.length !== 1 ? 's' : ''}</span>.
              </p>
            </div>
            <Button 
              onClick={() => router.push('/')}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-medium gap-2 shadow-md hover:shadow-primary/20 transition-all h-11 px-5 rounded-lg shrink-0"
            >
              <Plus className="h-4 w-4" /> New Blueprint
            </Button>
          </div>

          {projects.length === 0 && (
            <Card className="border-dashed border-2 border-border bg-card/25 backdrop-blur-sm">
              <CardContent className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <FolderOpen className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-xl">No active blueprints</h3>
                <p className="text-muted-foreground text-sm max-w-sm mt-2 mb-6 font-light">
                  Blueprint takes your product ideas from raw vision to structured, production-grade files. Create your first to begin.
                </p>
                <Button 
                  onClick={() => router.push('/')}
                  className="bg-primary hover:bg-primary/95 gap-2"
                >
                  <Plus className="h-4 w-4" /> Launch First Project
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
            {projects.map((project) => {
              const phaseNames = [
                'Intake & Brief',
                'Requirements Specification',
                'Architecture Design',
                'Data Modelling',
                'Security Gates',
                'Implementation Tasks',
              ];
              const progressPercentage = Math.round(((project.currentPhase - 1) / 5) * 100);

              return (
                <Card
                  key={project.id}
                  className="group relative cursor-pointer border-border/50 bg-card/40 backdrop-blur-md hover:border-primary/40 hover:bg-card/70 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
                  onClick={() => router.push(`/projects/${project.id}/intake`)}
                >
                  {/* Decorative glowing gradient border top */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 to-emerald-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-xl font-bold tracking-tight text-card-foreground group-hover:text-primary transition-colors duration-200">
                          {project.name}
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground line-clamp-2 font-light min-h-[2rem]">
                          {project.description || 'No description provided.'}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-background/80 text-[10px] uppercase font-bold shrink-0 shadow-sm">
                        {project.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">Phases Completed</span>
                        <span className="text-primary">{progressPercentage}%</span>
                      </div>
                      <Progress value={progressPercentage} className="h-1.5 bg-secondary/80" />
                    </div>

                    <div className="border-t border-border/40 pt-4 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground font-light">
                        <Activity className="h-3.5 w-3.5 text-primary" />
                        <span>Active Phase:</span>
                        <span className="font-semibold text-foreground">
                          {project.currentPhase}/6 - {phaseNames[project.currentPhase - 1] ?? 'Deployment Ready'}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
