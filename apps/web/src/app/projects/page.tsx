'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useProjects } from '@/hooks/use-project';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, FolderOpen, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';

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
        <div className="p-6 max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Your Projects</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => router.push('/')}>
            <Plus className="h-4 w-4 mr-2" /> New Project
          </Button>
        </div>

        {projects.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg">No projects yet</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-4">
                Create your first project to get started with Blueprint.
              </p>
              <Button onClick={() => router.push('/')}>
                <Plus className="h-4 w-4 mr-2" /> Create Project
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {projects.map((project) => {
            const phaseNames = [
              'Intake',
              'Requirements',
              'Architecture',
              'Data',
              'Security',
              'Implement',
            ];
            return (
              <Card
                key={project.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => router.push(`/projects/${project.id}/intake`)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-medium">{project.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Phase {project.currentPhase}:{' '}
                      {phaseNames[project.currentPhase - 1] ?? 'Complete'}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
