'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StoryCard } from './story-card';
import { useProjectStore } from '@/stores/project-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import type { Requirement, Priority } from '@blueprint/shared';

const API = process.env.NEXT_PUBLIC_API_URL?.replace('localhost', '127.0.0.1');

const priorityOrder: Priority[] = ['must', 'should', 'could', 'wont'];
const priorityLabels = {
  must: 'Must Have',
  should: 'Should Have',
  could: 'Could Have',
  wont: 'Will Not Have',
};

type RequirementsBoardProps = {
  projectId: string;
};

export function RequirementsBoard({ projectId }: RequirementsBoardProps) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newStory, setNewStory] = useState({ userStory: '', priority: 'must' as Priority });
  const { data: session, status } = useSession();
  const { setCurrentPhase } = useProjectStore();
  const token = (session?.user as any)?.accessToken;

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('RequirementsBoard Auth Debug:', { status, hasToken: !!token });
    }
    if (status === 'authenticated' && !token) {
      console.warn('Session is authenticated but no accessToken found in session.user');
    }
  }, [status, token]);

  const { data: requirements = [], isLoading } = useQuery({
    queryKey: ['requirements', projectId],
    queryFn: async () => {
      const res = await fetch(`${API}/api/v1/projects/${projectId}/requirements`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });
      const json = await res.json();
      return json.data as Requirement[];
    },
    enabled: !!token,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Authentication token missing. Please sign in again.');
      }
      const res = await fetch(`${API}/api/v1/projects/${projectId}/requirements/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });
      const json = await res.json();
      if (!json.success) {
        const error = new Error(json.error) as any;
        error.detail = json.detail;
        throw error;
      }
      return json.data;
    },
    onSuccess: () => {
      toast.success('Requirements generated!');
      qc.invalidateQueries({ queryKey: ['requirements', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      // Force UI sync for phase 3
      setCurrentPhase(3);
    },
    onError: (err: any) => {
      toast.error(err.message, {
        description: err.detail ? `Preview: ${err.detail.slice(0, 100)}...` : undefined,
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Authentication token missing. Please sign in again.');
      }
      const res = await fetch(`${API}/api/v1/projects/${projectId}/requirements`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(newStory),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      toast.success('Requirement added');
      setCreateOpen(false);
      setNewStory({ userStory: '', priority: 'must' });
      qc.invalidateQueries({ queryKey: ['requirements', projectId] });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (reqId: string) => {
      if (!token) {
        throw new Error('Authentication token missing. Please sign in again.');
      }
      const res = await fetch(`${API}/api/v1/projects/${projectId}/requirements/${reqId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to delete requirement');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requirements', projectId] });
    },
  });

  const grouped = priorityOrder.map((priority) => ({
    priority,
    label: priorityLabels[priority],
    items: requirements.filter((r) => r.priority === priority),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Requirements</h2>
          <p className="text-sm text-muted-foreground">{requirements.length} stories</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Requirement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>User Story</Label>
                  <Input
                    placeholder="As a [user], I want to [action], so that [benefit]"
                    value={newStory.userStory}
                    onChange={(e) => setNewStory((p) => ({ ...p, userStory: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={newStory.priority}
                    onValueChange={(v: Priority) => setNewStory((p) => ({ ...p, priority: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="must">Must Have</SelectItem>
                      <SelectItem value="should">Should Have</SelectItem>
                      <SelectItem value="could">Could Have</SelectItem>
                      <SelectItem value="wont">Will Not Have</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate()}
                  disabled={!newStory.userStory || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Adding...' : 'Add Requirement'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            Generate from Brief
          </Button>
        </div>
      </div>

      {requirements.length === 0 && !isLoading && (
        <Alert variant="info">
          <AlertDescription>
            No requirements yet. Add them manually or generate them from your project brief.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-4 gap-4">
        {grouped.map(({ priority, label, items }) => (
          <div key={priority} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-medium">{label}</h3>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {items.map((req) => (
                <StoryCard
                  key={req.id}
                  requirement={req}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  draggable
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
