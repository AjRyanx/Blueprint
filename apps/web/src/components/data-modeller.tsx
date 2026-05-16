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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Trash2, Sparkles, Check } from 'lucide-react';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Attribute = { name: string; type: string; required: boolean; unique: boolean; notes: string };
type Entity = { name: string; description: string; attributes: Attribute[] };
type Relationship = { name: string; type: 'one-to-one' | 'one-to-many' | 'many-to-many'; source: string; target: string; description: string };
type Index = { name: string; entity: string; columns: string[]; unique: boolean };

type DataModelData = {
  entities: Entity[];
  relationships: Relationship[];
  indexes: Index[];
  notes: string;
};

const emptyData: DataModelData = {
  entities: [],
  relationships: [],
  indexes: [],
  notes: '',
};

async function fetchDataModel(projectId: string, token: string) {
  const res = await fetch(`${API}/api/v1/projects/${projectId}/data`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return json.data ?? null;
}

async function saveDataModel(projectId: string, token: string, data: DataModelData) {
  const res = await fetch(`${API}/api/v1/projects/${projectId}/data`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

type Props = { projectId: string };

export function DataModeller({ projectId }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const { setCurrentPhase } = useProjectStore();
  const token = (session?.user as any)?.accessToken;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['data-model', projectId],
    queryFn: () => fetchDataModel(projectId, token),
    enabled: !!token,
  });

  const [local, setLocal] = useState<DataModelData | null>(null);
  const form = local ?? data ?? emptyData;

  const saveMutation = useMutation({
    mutationFn: (d: DataModelData) => saveDataModel(projectId, token, d),
    onSuccess: () => {
      toast.success('Data model saved');
      queryClient.invalidateQueries({ queryKey: ['data-model', projectId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/api/v1/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPhase: 5 }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      toast.success('Data model phase completed!');
      setCurrentPhase(5);
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      router.push(`/projects/${projectId}/security`);
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

  const update = (patch: Partial<DataModelData>) => setLocal({ ...form, ...patch });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Define entities, attributes, and relationships for your data model.</p>
        <div className="flex gap-2">
          <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Data Model
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
            Complete Phase 4
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Entities</CardTitle>
          <Button variant="outline" size="sm" onClick={() => update({ entities: [...form.entities, { name: '', description: '', attributes: [] }] })}>
            <Plus className="h-4 w-4 mr-1" /> Add Entity
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.entities.map((entity, ei) => (
            <div key={ei} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Entity name (e.g. User, Project, Task)"
                  value={entity.name}
                  onChange={(e) => {
                    const u = [...form.entities];
                    u[ei] = { ...u[ei], name: e.target.value };
                    update({ entities: u });
                  }}
                />
                <Button variant="ghost" size="icon" onClick={() => update({ entities: form.entities.filter((_, i) => i !== ei) })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                placeholder="Description"
                value={entity.description}
                onChange={(e) => {
                  const u = [...form.entities];
                  u[ei] = { ...u[ei], description: e.target.value };
                  update({ entities: u });
                }}
              />
              <div className="pl-4 border-l-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Attributes</span>
                  <Button variant="ghost" size="sm" onClick={() => {
                    const u = [...form.entities];
                    u[ei].attributes.push({ name: '', type: 'text', required: true, unique: false, notes: '' });
                    update({ entities: u });
                  }}>
                    <Plus className="h-3 w-3 mr-1" /> Add Attribute
                  </Button>
                </div>
                {entity.attributes.map((attr, ai) => (
                  <div key={ai} className="flex items-center gap-2">
                    <Input
                      placeholder="Name"
                      value={attr.name}
                      onChange={(e) => {
                        const u = [...form.entities];
                        u[ei].attributes[ai] = { ...u[ei].attributes[ai], name: e.target.value };
                        update({ entities: u });
                      }}
                      className="w-36"
                    />
                    <Select
                      value={attr.type}
                      onValueChange={(v) => {
                        const u = [...form.entities];
                        u[ei].attributes[ai] = { ...u[ei].attributes[ai], type: v };
                        update({ entities: u });
                      }}
                    >
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['uuid', 'text', 'varchar', 'integer', 'boolean', 'timestamp', 'jsonb', 'float', 'date'].map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Checkbox
                        checked={attr.required}
                        onCheckedChange={(v) => {
                          const u = [...form.entities];
                          u[ei].attributes[ai] = { ...u[ei].attributes[ai], required: !!v };
                          update({ entities: u });
                        }}
                      />
                      <span>Req</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Checkbox
                        checked={attr.unique}
                        onCheckedChange={(v) => {
                          const u = [...form.entities];
                          u[ei].attributes[ai] = { ...u[ei].attributes[ai], unique: !!v };
                          update({ entities: u });
                        }}
                      />
                      <span>UQ</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => {
                      const u = [...form.entities];
                      u[ei].attributes = u[ei].attributes.filter((_, i) => i !== ai);
                      update({ entities: u });
                    }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Relationships</CardTitle>
          <Button variant="outline" size="sm" onClick={() => update({ relationships: [...form.relationships, { name: '', type: 'one-to-many', source: '', target: '', description: '' }] })}>
            <Plus className="h-4 w-4 mr-1" /> Add Relationship
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.relationships.map((rel, ri) => (
            <div key={ri} className="border rounded-lg p-3 flex items-start gap-3">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Relationship name"
                  value={rel.name}
                  onChange={(e) => {
                    const u = [...form.relationships];
                    u[ri] = { ...u[ri], name: e.target.value };
                    update({ relationships: u });
                  }}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Source entity"
                    value={rel.source}
                    onChange={(e) => {
                      const u = [...form.relationships];
                      u[ri] = { ...u[ri], source: e.target.value };
                      update({ relationships: u });
                    }}
                  />
                  <Select
                    value={rel.type}
                    onValueChange={(v: 'one-to-one' | 'one-to-many' | 'many-to-many') => {
                      const u = [...form.relationships];
                      u[ri] = { ...u[ri], type: v };
                      update({ relationships: u });
                    }}
                  >
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one-to-one">1:1</SelectItem>
                      <SelectItem value="one-to-many">1:N</SelectItem>
                      <SelectItem value="many-to-many">M:N</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Target entity"
                    value={rel.target}
                    onChange={(e) => {
                      const u = [...form.relationships];
                      u[ri] = { ...u[ri], target: e.target.value };
                      update({ relationships: u });
                    }}
                  />
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => update({ relationships: form.relationships.filter((_, i) => i !== ri) })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Indexes</CardTitle>
          <Button variant="outline" size="sm" onClick={() => update({ indexes: [...form.indexes, { name: '', entity: '', columns: [], unique: false }] })}>
            <Plus className="h-4 w-4 mr-1" /> Add Index
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.indexes.map((idx, ii) => (
            <div key={ii} className="border rounded-lg p-3 flex items-center gap-3">
              <Input
                placeholder="Index name"
                value={idx.name}
                onChange={(e) => {
                  const u = [...form.indexes];
                  u[ii] = { ...u[ii], name: e.target.value };
                  update({ indexes: u });
                }}
                className="w-48"
              />
              <Input
                placeholder="Entity"
                value={idx.entity}
                onChange={(e) => {
                  const u = [...form.indexes];
                  u[ii] = { ...u[ii], entity: e.target.value };
                  update({ indexes: u });
                }}
                className="w-36"
              />
              <Input
                placeholder="Columns (comma-separated)"
                value={idx.columns.join(', ')}
                onChange={(e) => {
                  const u = [...form.indexes];
                  u[ii] = { ...u[ii], columns: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) };
                  update({ indexes: u });
                }}
                className="flex-1"
              />
              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Checkbox
                  checked={idx.unique}
                  onCheckedChange={(v) => {
                    const u = [...form.indexes];
                    u[ii] = { ...u[ii], unique: !!v };
                    update({ indexes: u });
                  }}
                />
                <span>Unique</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => update({ indexes: form.indexes.filter((_, i) => i !== ii) })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            placeholder="Additional notes about the data model..."
            value={form.notes}
            onChange={(e) => update({ notes: e.target.value })}
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
}
