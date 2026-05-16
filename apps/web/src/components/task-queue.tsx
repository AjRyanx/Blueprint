'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Copy, CheckCircle, Clock, RefreshCw, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import type { ImplementationTask } from '@blueprint/shared';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type TaskQueueProps = {
  projectId: string;
};

export function TaskQueue({ projectId }: TaskQueueProps) {
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;
  const qc = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const res = await fetch(`${API}/api/v1/projects/${projectId}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!token,
  });

  const generateAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/api/v1/projects/${projectId}/tasks/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      toast.success('Implementation tasks generated!');
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    onError: (err) => toast.error(err.message),
  });

  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Prompt copied to clipboard');
  };

  const exportAll = () => {
    const allPrompts = tasks
      .filter((t) => t.promptText)
      .map((t) => `# ${t.title}\n\n${t.promptText}`)
      .join('\n\n---\n\n');

    const blob = new Blob([allPrompts], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blueprint-prompts.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('All prompts exported');
  };

  const statusConfig = {
    pending: { label: 'Pending', variant: 'outline' as const },
    ready: { label: 'Ready', variant: 'secondary' as const },
    accepted: { label: 'Accepted', variant: 'success' as const },
    rejected: { label: 'Rejected', variant: 'destructive' as const },
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            Implementation Tasks
          </h2>
          <p className="text-sm text-muted-foreground">
            {tasks.filter((t) => t.status === 'accepted').length}/{tasks.length} completed
          </p>
        </div>
        <div className="flex gap-2">
          {tasks.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportAll}>
              <FileDown className="h-4 w-4 mr-1" /> Export All
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => generateAllMutation.mutate()}
            disabled={generateAllMutation.isPending}
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', generateAllMutation.isPending && 'animate-spin')} />
            {tasks.length > 0 ? 'Regenerate' : 'Generate Tasks'}
          </Button>
        </div>
      </div>

      {tasks.length === 0 && (
        <Alert variant="info">
          <Clock className="h-4 w-4" />
          <AlertTitle>No tasks yet</AlertTitle>
          <AlertDescription>
            Generate implementation tasks from your approved requirements. Each task is a self-contained
            prompt you can paste into your preferred AI coding tool.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {tasks
          .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
          .map((task) => {
            const config = statusConfig[task.status] ?? statusConfig.pending;
            return (
              <Card key={task.id}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground font-mono">
                        #{task.sequenceOrder}
                      </span>
                      <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
                      <Badge variant={config.variant} className="text-[10px]">
                        {config.label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          task.reviewStatus === 'passed' && 'text-emerald-600 border-emerald-300',
                          task.reviewStatus === 'failed' && 'text-destructive',
                        )}
                      >
                        {task.reviewStatus}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      {task.promptText && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => copyPrompt(task.promptText!)}
                        >
                          <Copy className="h-3 w-3 mr-1" /> Copy
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {task.promptText && (
                  <CardContent className="py-2">
                    <ScrollArea className="h-48 rounded-md border bg-muted/50 p-3">
                      <pre className="text-xs whitespace-pre-wrap font-mono">{task.promptText}</pre>
                    </ScrollArea>
                  </CardContent>
                )}
              </Card>
            );
          })}
      </div>

      {tasks.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>How to use these prompts</AlertTitle>
          <AlertDescription>
            Each prompt is self-contained and optimized for a single AI coding session. Copy a prompt,
            paste it into your preferred tool (Claude, ChatGPT, Cursor, etc.), and follow the acceptance
            criteria. Tasks are sequenced in build order — start from #1.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
