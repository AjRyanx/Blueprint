'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Check, X, Plus, Trash2, Sparkles } from 'lucide-react';
import type { ProjectBrief } from '@blueprint/shared';

type BriefViewerProps = {
  brief: ProjectBrief;
  onSave: (brief: Partial<ProjectBrief>) => Promise<void>;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
};

export function BriefViewer({ brief, onSave, onRegenerate, isRegenerating }: BriefViewerProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    projectName: brief.projectName,
    oneLineDescription: brief.oneLineDescription,
    problemStatement: brief.problemStatement,
    targetUsers: brief.targetUsers,
    coreValueProposition: brief.coreValueProposition,
    outOfScope: brief.outOfScope,
    successMetrics: brief.successMetrics,
  });

  const handleSave = async () => {
    await onSave(form);
    setEditing(false);
  };

  const addItem = (field: 'outOfScope' | 'successMetrics') => {
    setForm((prev) => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const updateItem = (field: 'outOfScope' | 'successMetrics', index: number, value: string) => {
    setForm((prev) => {
      const items = [...prev[field]];
      items[index] = value;
      return { ...prev, [field]: items };
    });
  };

  const removeItem = (field: 'outOfScope' | 'successMetrics', index: number) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const Field = ({
    label,
    value,
    field,
  }: {
    label: string;
    value: string;
    field: string;
  }) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</Label>
      {editing ? (
        <Textarea
          value={value}
          onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
          className="min-h-[60px]"
        />
      ) : (
        <p className="text-sm">{value}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Project Brief</h2>
          <p className="text-sm text-muted-foreground">Version {brief.version}</p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
            </>
          ) : (
            <div className="flex gap-2">
              {onRegenerate && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onRegenerate}
                  disabled={isRegenerating}
                >
                  <Sparkles className="h-4 w-4 mr-1 text-primary" />
                  {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {editing ? (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">PROJECT NAME</Label>
              <Input
                value={form.projectName}
                onChange={(e) => setForm((prev) => ({ ...prev, projectName: e.target.value }))}
              />
            </div>
          ) : (
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">PROJECT NAME</Label>
              <p className="text-xl font-bold mt-1">{brief.projectName}</p>
            </div>
          )}

          <Field label="ONE-LINE DESCRIPTION" value={form.oneLineDescription} field="oneLineDescription" />
          <Field label="PROBLEM STATEMENT" value={form.problemStatement} field="problemStatement" />
          <Field label="TARGET USERS" value={form.targetUsers} field="targetUsers" />
          <Field label="CORE VALUE PROPOSITION" value={form.coreValueProposition} field="coreValueProposition" />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">OUT OF SCOPE</Label>
              {editing && (
                <Button variant="ghost" size="sm" onClick={() => addItem('outOfScope')}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              )}
            </div>
            {editing ? (
              <div className="space-y-2">
                {form.outOfScope.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateItem('outOfScope', i, e.target.value)}
                      placeholder="Out of scope item"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeItem('outOfScope', i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {brief.outOfScope.map((item, i) => (
                  <Badge key={i} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">SUCCESS METRICS</Label>
              {editing && (
                <Button variant="ghost" size="sm" onClick={() => addItem('successMetrics')}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              )}
            </div>
            {editing ? (
              <div className="space-y-2">
                {form.successMetrics.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateItem('successMetrics', i, e.target.value)}
                      placeholder="Success metric"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeItem('successMetrics', i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="list-disc list-inside space-y-1">
                {brief.successMetrics.map((item, i) => (
                  <li key={i} className="text-sm">{item}</li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
