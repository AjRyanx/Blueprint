// @ts-nocheck
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, ShieldCheck, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/stores/project-store';
import type { SecurityChecklist, ChecklistItem } from '@blueprint/shared';

const API = process.env.NEXT_PUBLIC_API_URL;

type ChecklistViewerProps = {
  projectId: string;
};

export function ChecklistViewer({ projectId }: ChecklistViewerProps) {
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;
  const qc = useQueryClient();

  const { data: checklist, isLoading } = useQuery({
    queryKey: ['security', projectId],
    queryFn: async () => {
      const res = await fetch(`${API}/api/v1/projects/${projectId}/security`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json.data ?? null;
    },
    enabled: !!token,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/api/v1/projects/${projectId}/security/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      toast.success('Security checklist generated');
      qc.invalidateQueries({ queryKey: ['security', projectId] });
    },
    onError: (err) => toast.error(err.message),
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, passed, notes }: { itemId: string; passed: boolean; notes?: string }) => {
      const res = await fetch(`${API}/api/v1/projects/${projectId}/security/item`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemId, passed, notes }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['security', projectId] });
    },
  });

  const { setCurrentPhase } = useProjectStore();

  const signOffMutation = useMutation({
    mutationFn: async () => {
      // 1. Sign off the checklist
      await fetch(`${API}/api/v1/projects/${projectId}/security/sign-off`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      // 2. Advance project to Phase 6
      const res = await fetch(`${API}/api/v1/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPhase: 6 }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      toast.success('Security checklist signed off and implementation unlocked!');
      setCurrentPhase(6);
      qc.invalidateQueries({ queryKey: ['security', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const items = (checklist?.checklist ?? []) as ChecklistItem[];
  const requiredItems = items.filter((i) => i.required);
  const passedItems = requiredItems.filter((i) => i.passed === true);
  const progress = requiredItems.length > 0 ? (passedItems.length / requiredItems.length) * 100 : 0;
  const isSignedOff = !!checklist?.signedOffAt;

  const groupedByCategory = items.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, ChecklistItem[]>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security & Standards Checklist
          </h2>
          <p className="text-sm text-muted-foreground">
            {isSignedOff
              ? 'Signed off and complete'
              : `${passedItems.length}/${requiredItems.length} required items passed`}
          </p>
        </div>
        <div className="flex gap-2">
          {!checklist && (
            <Button size="sm" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              Generate Checklist
            </Button>
          )}
        </div>
      </div>

      {!checklist && (
        <Alert variant="info">
          <Shield className="h-4 w-4" />
          <AlertTitle>No checklist yet</AlertTitle>
          <AlertDescription>
            Generate a security checklist based on your project type. This must be signed off before implementation can begin.
          </AlertDescription>
        </Alert>
      )}

      {checklist && (
        <>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Sign-off progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {isSignedOff && (
            <Alert variant="success">
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Checklist Signed Off</AlertTitle>
              <AlertDescription>
                All required security items have been passed. You can now proceed to Phase 6.
              </AlertDescription>
            </Alert>
          )}

          {Object.entries(groupedByCategory).map(([category, categoryItems]) => (
            <Card key={category}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">{category}</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="space-y-1">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-start gap-3 py-2 px-2 rounded-md hover:bg-muted/50',
                        item.required && !item.passed && 'border-l-2 border-l-destructive',
                        item.passed === true && 'border-l-2 border-l-emerald-500',
                      )}
                    >
                      <Checkbox
                        checked={item.passed === true}
                        disabled={isSignedOff || updateItemMutation.isPending}
                        onCheckedChange={(checked) => {
                          updateItemMutation.mutate({
                            itemId: item.id,
                            passed: checked === true,
                          });
                        }}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{item.title}</span>
                          {item.required && (
                            <Badge variant="destructive" className="text-[10px] px-1">
                              Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {!isSignedOff && passedItems.length === requiredItems.length && requiredItems.length > 0 && (
            <Button
              className="w-full"
              size="lg"
              onClick={() => signOffMutation.mutate()}
              disabled={signOffMutation.isPending}
            >
              {signOffMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-2" />
              )}
              Sign Off & Proceed to Implementation
            </Button>
          )}
        </>
      )}
    </div>
  );
}
