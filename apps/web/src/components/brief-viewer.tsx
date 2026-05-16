'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Check, X, Plus, Trash2, Sparkles, FileText, ChevronRight, CheckCircle2 } from 'lucide-react';
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

  const RenderField = ({
    label,
    value,
    field,
    placeholder,
  }: {
    label: string;
    value: string;
    field: string;
    placeholder?: string;
  }) => (
    <div className="space-y-2 group">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest transition-colors group-hover:text-primary">
          {label}
        </Label>
      </div>
      {editing ? (
        <Textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
          className="min-h-[80px] bg-background/50 border-border/60 focus-visible:ring-primary focus-visible:ring-offset-0 transition-all resize-y text-sm leading-relaxed"
        />
      ) : (
        <div className="rounded-lg bg-background/30 border border-border/20 p-4 transition-all duration-200 hover:bg-background/50 hover:border-border/40">
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-light">{value || 'Not defined yet.'}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Project Specification Brief
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] py-0 px-2 font-semibold">
                Version {brief.version}
              </Badge>
              <span className="text-xs text-muted-foreground">Persisted to Architecture Layer</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {editing ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setEditing(false)}
                className="h-9 px-4 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
              >
                <X className="h-4 w-4 mr-1.5" /> Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md hover:shadow-primary/10"
              >
                <Check className="h-4 w-4 mr-1.5" /> Save Changes
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
                  className="h-9 text-muted-foreground hover:text-primary transition-colors hover:bg-primary/5"
                >
                  <Sparkles className="h-4 w-4 mr-1.5 text-primary animate-pulse" />
                  {isRegenerating ? 'Re-analyzing...' : 'AI Refine'}
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setEditing(true)}
                className="h-9 px-4 hover:border-primary/40 hover:bg-background/80 transition-all"
              >
                <Pencil className="h-4 w-4 mr-1.5" /> Edit Brief
              </Button>
            </div>
          )}
        </div>
      </div>

      <Card className="border-border/50 bg-card/45 backdrop-blur-md shadow-xl overflow-hidden relative">
        {/* Glow indicator */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        
        <CardContent className="p-6 md:p-8 space-y-6">
          {editing ? (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">PROJECT NAME</Label>
              <Input
                value={form.projectName}
                onChange={(e) => setForm((prev) => ({ ...prev, projectName: e.target.value }))}
                className="h-11 bg-background/50 border-border/60 focus-visible:ring-primary focus-visible:ring-offset-0 text-lg font-bold"
              />
            </div>
          ) : (
            <div className="pb-4 border-b border-border/40">
              <Label className="text-[10px] font-bold text-primary uppercase tracking-widest">Core Brand</Label>
              <p className="text-3xl font-extrabold tracking-tight text-foreground mt-0.5">{brief.projectName}</p>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <RenderField 
                label="Elevator Pitch (One-Line Description)" 
                value={form.oneLineDescription} 
                field="oneLineDescription" 
                placeholder="A brief, high-impact description of the system."
              />
            </div>
            
            <RenderField 
              label="Problem Statement" 
              value={form.problemStatement} 
              field="problemStatement" 
              placeholder="What specific pain point is this system alleviating?"
            />
            
            <RenderField 
              label="Core Value Proposition" 
              value={form.coreValueProposition} 
              field="coreValueProposition" 
              placeholder="What unique solution does this product bring to users?"
            />
            
            <div className="md:col-span-2">
              <RenderField 
                label="Target User Base" 
                value={form.targetUsers} 
                field="targetUsers" 
                placeholder="Describe your ideal users or demographic groups."
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 pt-4 border-t border-border/40">
            {/* Out of Scope */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">OUT OF SCOPE (MVP BOUNDARIES)</Label>
                {editing && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => addItem('outOfScope')}
                    className="h-8 text-xs text-primary hover:bg-primary/10"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Constraint
                  </Button>
                )}
              </div>
              {editing ? (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {form.outOfScope.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={item}
                        onChange={(e) => updateItem('outOfScope', i, e.target.value)}
                        placeholder="e.g. Multi-currency, Native mobile app"
                        className="h-9 bg-background/50 border-border/60"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeItem('outOfScope', i)}
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {form.outOfScope.length === 0 && (
                    <p className="text-xs text-muted-foreground font-light py-2">No scope boundaries configured.</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {brief.outOfScope.map((item, i) => (
                    <Badge 
                      key={i} 
                      variant="outline" 
                      className="bg-destructive/5 text-destructive border-destructive/20 text-xs py-1 px-2.5 font-medium transition-all hover:bg-destructive/10"
                    >
                      {item}
                    </Badge>
                  ))}
                  {brief.outOfScope.length === 0 && (
                    <p className="text-xs text-muted-foreground font-light">No out-of-scope items configured.</p>
                  )}
                </div>
              )}
            </div>

            {/* Success Metrics */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">CRITICAL SUCCESS METRICS</Label>
                {editing && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => addItem('successMetrics')}
                    className="h-8 text-xs text-primary hover:bg-primary/10"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Metric
                  </Button>
                )}
              </div>
              {editing ? (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {form.successMetrics.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={item}
                        onChange={(e) => updateItem('successMetrics', i, e.target.value)}
                        placeholder="e.g. Response time < 200ms"
                        className="h-9 bg-background/50 border-border/60"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeItem('successMetrics', i)}
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {form.successMetrics.length === 0 && (
                    <p className="text-xs text-muted-foreground font-light py-2">No success metrics defined.</p>
                  )}
                </div>
              ) : (
                <div className="grid gap-2">
                  {brief.successMetrics.map((item, i) => (
                    <div 
                      key={i} 
                      className="flex items-start gap-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-2.5 transition-all hover:bg-emerald-500/10"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground/90 font-light">{item}</span>
                    </div>
                  ))}
                  {brief.successMetrics.length === 0 && (
                    <p className="text-xs text-muted-foreground font-light">No success metrics configured.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
