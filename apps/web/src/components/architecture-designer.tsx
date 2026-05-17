// @ts-nocheck
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/stores/project-store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, GripVertical, Sparkles, Check } from 'lucide-react';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type TechCategory = { category: string; items: { name: string; version: string; notes: string }[] };
type Pattern = { name: string; description: string; rationale: string };
type Decision = { title: string; context: string; decision: string; consequences: string };
type QualityAttr = { attribute: string; target: string; notes: string };

type ArchitectureData = {
  overview: string;
  techStack: TechCategory[];
  patterns: Pattern[];
  decisions: Decision[];
  constraints: string[];
  qualityAttributes: QualityAttr[];
  diagrams: string;
  needsDatabase?: boolean;
  needsServer?: boolean;
  serverNotes?: string;
  needsAuth?: boolean;
  targetPlatform?: 'web' | 'cli';
  deploymentModel?: 'cloud' | 'self-hosted' | 'local';
};

const emptyData: ArchitectureData = {
  overview: '',
  techStack: [],
  patterns: [],
  decisions: [],
  constraints: [],
  qualityAttributes: [],
  diagrams: '',
  needsDatabase: true,
  needsServer: true,
  serverNotes: '',
  needsAuth: true,
  targetPlatform: 'web',
  deploymentModel: 'cloud',
};

async function fetchArchitecture(projectId: string, token: string) {
  const res = await fetch(`${API}/api/v1/projects/${projectId}/architecture`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return json.data ?? null;
}

async function saveArchitecture(projectId: string, token: string, data: ArchitectureData) {
  const res = await fetch(`${API}/api/v1/projects/${projectId}/architecture`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

type Props = { projectId: string };

export function ArchitectureDesigner({ projectId }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const { setCurrentPhase } = useProjectStore();
  const token = (session?.user as any)?.accessToken;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['architecture', projectId],
    queryFn: () => fetchArchitecture(projectId, token),
    enabled: !!token,
  });

  const [local, setLocal] = useState<ArchitectureData | null>(null);
  const form = local ?? data ?? emptyData;

  const saveMutation = useMutation({
    mutationFn: (d: ArchitectureData) => saveArchitecture(projectId, token, d),
    onSuccess: () => {
      toast.success('Architecture saved');
      queryClient.invalidateQueries({ queryKey: ['architecture', projectId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/api/v1/projects/${projectId}/architecture/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: (generatedData) => {
      setLocal(generatedData);
      toast.success('Architecture generated!');
      queryClient.invalidateQueries({ queryKey: ['architecture', projectId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/api/v1/projects/${projectId}/phase`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ toPhase: 4 }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
    onSuccess: (resJson) => {
      const nextPhase = resJson.nextPhase ?? 4;
      toast.success('Architecture phase completed!');
      setCurrentPhase(nextPhase);
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      
      if (resJson.phase4 === 'skipped' || nextPhase === 5) {
        toast.info('Data modelling skipped (stateless project). Redirecting to Security Planning.');
        router.push(`/projects/${projectId}/security`);
      } else {
        router.push(`/projects/${projectId}/data`);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const update = (patch: Partial<ArchitectureData>) => {
    setLocal({ ...form, ...patch });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Define your system architecture, tech stack, and key design decisions.</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 border-indigo-500/20"
          >
            {generateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4 text-indigo-500" />
            )}
            Generate with AI
          </Button>
          <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Architecture
          </Button>
          <Button
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
          >
            {completeMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Complete Phase 3
          </Button>
        </div>
      </div>

      {form.needsServer === false && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-xl p-4 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <span className="text-base font-bold font-mono">i</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-500">Frontend-Only Architecture Active</h4>
              <p className="text-xs text-muted-foreground">This project does not require a custom backend server. Backend and Database layers are hidden.</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/20 text-amber-500 hover:bg-amber-500/10 bg-amber-500/5 font-medium transition-all duration-200 shrink-0"
            onClick={async () => {
              try {
                const res = await fetch(`${API}/api/v1/projects/${projectId}/architecture/enable-server`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                });
                const json = await res.json();
                if (!json.success) throw new Error(json.error);
                toast.success('Backend server successfully re-enabled!');
                queryClient.invalidateQueries({ queryKey: ['architecture', projectId] });
                queryClient.invalidateQueries({ queryKey: ['project', projectId] });
                setLocal(null);
              } catch (err: any) {
                toast.error(err.message || 'Failed to re-enable backend server');
              }
            }}
          >
            Re-enable Backend Server
          </Button>
        </div>
      )}

      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-indigo-500/10 shadow-xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span>Project Scope Controls</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-md">
              <div className="space-y-1">
                <Label className="text-sm font-semibold text-slate-200">Requires User Accounts?</Label>
                <p className="text-xs text-muted-foreground leading-normal">Infer features like NextAuth, JWT sessions, security gates, and sign-in tasks.</p>
              </div>
              <input
                type="checkbox"
                id="needsAuthToggle"
                checked={form.needsAuth === true}
                onChange={(e) => update({ needsAuth: e.target.checked })}
                className="w-5 h-5 accent-indigo-500 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer shrink-0 ml-4"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-md">
              <div className="space-y-1">
                <Label className="text-sm font-semibold text-slate-200">Requires Database?</Label>
                <p className="text-xs text-muted-foreground leading-normal">Check this to require persistent storage. Turning off will skip Phase 4 (Data Modelling).</p>
              </div>
              <input
                type="checkbox"
                id="needsDatabaseToggle"
                checked={form.needsDatabase !== false}
                onChange={(e) => update({ needsDatabase: e.target.checked })}
                className="w-5 h-5 accent-indigo-500 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer shrink-0 ml-4"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-md">
              <div className="space-y-1">
                <Label className="text-sm font-semibold text-slate-200">Requires Backend Server?</Label>
                <p className="text-xs text-muted-foreground leading-normal">Uncheck if you only need static hosting and browser-only tech recommendations.</p>
              </div>
              <input
                type="checkbox"
                id="needsServerToggle"
                checked={form.needsServer !== false}
                onChange={(e) => update({ needsServer: e.target.checked })}
                className="w-5 h-5 accent-indigo-500 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer shrink-0 ml-4"
              />
            </div>
          </div>

          <div className="border-t border-slate-700/50 pt-6 space-y-3">
            <div className="flex flex-col space-y-1">
              <Label className="text-sm font-semibold text-slate-200">Deployment Model</Label>
              <p className="text-xs text-muted-foreground">Select how the project will be provisioned, packaged, and hosted.</p>
            </div>
            <div className="inline-flex p-1 bg-slate-950/60 rounded-xl border border-slate-700/40 backdrop-blur-md">
              {[
                { value: 'cloud', label: 'Cloud ☁️' },
                { value: 'self-hosted', label: 'Self-Hosted 🏢' },
                { value: 'local', label: 'Local 💻' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ deploymentModel: opt.value as any })}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                    (form.deploymentModel ?? 'cloud') === opt.value
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">System Overview</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            placeholder="Describe the overall system architecture, how components interact, deployment model, etc."
            value={form.overview}
            onChange={(e) => update({ overview: e.target.value })}
            rows={5}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span>Technology Stack</span>
            {form.targetPlatform === 'cli' ? (
              <Badge variant="outline" className="text-[10px] text-primary border-primary/20 bg-primary/5 font-sans flex items-center gap-1.5 px-2.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                CLI Stack
              </Badge>
            ) : form.needsServer === false ? (
              <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/20 bg-amber-500/5 font-sans flex items-center gap-1.5 px-2.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Frontend-Only
              </Badge>
            ) : form.needsDatabase === false ? (
              <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/20 bg-amber-500/5 font-sans flex items-center gap-1.5 px-2.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Stateless Stack
              </Badge>
            ) : null}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => update({ techStack: [...form.techStack, { category: '', items: [{ name: '', version: '', notes: '' }] }] })}>
            <Plus className="h-4 w-4 mr-1" /> Add Category
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.techStack.map((cat, ci) => {
            if (form.targetPlatform === 'cli') {
              const lower = cat.category.toLowerCase();
              if (
                lower.includes('frontend') ||
                lower.includes('database') ||
                lower.includes('infrastructure') ||
                lower.includes('devops') ||
                lower.includes('api') ||
                lower.includes('server')
              ) {
                return null;
              }
            } else if (form.needsServer === false) {
              const lower = cat.category.toLowerCase();
              if (
                lower.includes('backend') ||
                lower.includes('database') ||
                lower.includes('infrastructure') ||
                lower.includes('devops') ||
                lower.includes('api') ||
                lower.includes('server')
              ) {
                return null;
              }
            }
            if (form.needsAuth === false) {
              const lower = cat.category.toLowerCase();
              if (lower.includes('auth') || (lower.includes('security') && lower.includes('user'))) {
                return null;
              }
            }
            return (
            <div key={ci} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Category (e.g. Frontend, Backend, Database)"
                  value={cat.category}
                  onChange={(e) => {
                    const updated = [...form.techStack];
                    updated[ci] = { ...updated[ci], category: e.target.value };
                    update({ techStack: updated });
                  }}
                />
                <Button variant="ghost" size="icon" onClick={() => {
                  const updated = form.techStack.filter((_, i) => i !== ci);
                  update({ techStack: updated });
                }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {cat.items.map((item, ii) => (
                <div key={ii} className="flex items-center gap-2 ml-4">
                  <Input
                    placeholder="Name"
                    value={item.name}
                    onChange={(e) => {
                      const updated = [...form.techStack];
                      updated[ci].items[ii] = { ...updated[ci].items[ii], name: e.target.value };
                      update({ techStack: updated });
                    }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Version"
                    value={item.version}
                    onChange={(e) => {
                      const updated = [...form.techStack];
                      updated[ci].items[ii] = { ...updated[ci].items[ii], version: e.target.value };
                      update({ techStack: updated });
                    }}
                    className="w-24"
                  />
                  <Button variant="ghost" size="icon" onClick={() => {
                    const updated = [...form.techStack];
                    updated[ci].items = updated[ci].items.filter((_, i) => i !== ii);
                    update({ techStack: updated });
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => {
                const updated = [...form.techStack];
                updated[ci].items.push({ name: '', version: '', notes: '' });
                update({ techStack: updated });
              }}>
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            </div>
          );
        })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Architecture Patterns</CardTitle>
            <Button variant="outline" size="sm" onClick={() => update({ patterns: [...form.patterns, { name: '', description: '', rationale: '' }] })}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.patterns.map((p, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input placeholder="Pattern name" value={p.name} onChange={(e) => {
                    const u = [...form.patterns]; u[i] = { ...u[i], name: e.target.value }; update({ patterns: u });
                  }} />
                  <Button variant="ghost" size="icon" onClick={() => update({ patterns: form.patterns.filter((_, j) => j !== i) })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea placeholder="Description" value={p.description} onChange={(e) => {
                  const u = [...form.patterns]; u[i] = { ...u[i], description: e.target.value }; update({ patterns: u });
                }} rows={2} />
                <Textarea placeholder="Rationale for choosing this pattern" value={p.rationale} onChange={(e) => {
                  const u = [...form.patterns]; u[i] = { ...u[i], rationale: e.target.value }; update({ patterns: u });
                }} rows={2} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Quality Attributes</CardTitle>
            <Button variant="outline" size="sm" onClick={() => update({ qualityAttributes: [...form.qualityAttributes, { attribute: '', target: '', notes: '' }] })}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.qualityAttributes.map((q, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input placeholder="Attribute (e.g. Performance)" value={q.attribute} onChange={(e) => {
                    const u = [...form.qualityAttributes]; u[i] = { ...u[i], attribute: e.target.value }; update({ qualityAttributes: u });
                  }} />
                  <Button variant="ghost" size="icon" onClick={() => update({ qualityAttributes: form.qualityAttributes.filter((_, j) => j !== i) })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Target (e.g. <200ms p95)" value={q.target} onChange={(e) => {
                    const u = [...form.qualityAttributes]; u[i] = { ...u[i], target: e.target.value }; update({ qualityAttributes: u });
                  }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Design Decisions</CardTitle>
          <Button variant="outline" size="sm" onClick={() => update({ decisions: [...form.decisions, { title: '', context: '', decision: '', consequences: '' }] })}>
            <Plus className="h-4 w-4 mr-1" /> Add Decision
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.decisions.map((d, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Input placeholder="Decision title" value={d.title} onChange={(e) => {
                  const u = [...form.decisions]; u[i] = { ...u[i], title: e.target.value }; update({ decisions: u });
                }} />
                <Button variant="ghost" size="icon" onClick={() => update({ decisions: form.decisions.filter((_, j) => j !== i) })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea placeholder="Context — what prompted this decision?" value={d.context} onChange={(e) => {
                const u = [...form.decisions]; u[i] = { ...u[i], context: e.target.value }; update({ decisions: u });
              }} rows={2} />
              <Textarea placeholder="Decision made" value={d.decision} onChange={(e) => {
                const u = [...form.decisions]; u[i] = { ...u[i], decision: e.target.value }; update({ decisions: u });
              }} rows={2} />
              <Textarea placeholder="Consequences — trade-offs, impact" value={d.consequences} onChange={(e) => {
                const u = [...form.decisions]; u[i] = { ...u[i], consequences: e.target.value }; update({ decisions: u });
              }} rows={2} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Constraints</CardTitle>
          <Button variant="outline" size="sm" onClick={() => update({ constraints: [...form.constraints, ''] })}>
            <Plus className="h-4 w-4 mr-1" /> Add Constraint
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {form.constraints.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <Badge variant="outline" className="shrink-0">C{i + 1}</Badge>
              <Input value={c} onChange={(e) => {
                const u = [...form.constraints]; u[i] = e.target.value; update({ constraints: u });
              }} />
              <Button variant="ghost" size="icon" onClick={() => update({ constraints: form.constraints.filter((_, j) => j !== i) })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Architecture Diagrams (Mermaid)</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            placeholder="Paste Mermaid diagram definitions here..."
            value={form.diagrams}
            onChange={(e) => update({ diagrams: e.target.value })}
            rows={6}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>
    </div>
  );
}
