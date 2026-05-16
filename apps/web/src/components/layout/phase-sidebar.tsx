'use client';

import { useProjectStore } from '@/stores/project-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Lightbulb,
  FileText,
  LayoutDashboard,
  Database,
  Shield,
  Code,
  CheckCircle2,
  Lock,
} from 'lucide-react';

const phaseIcons = [Lightbulb, FileText, LayoutDashboard, Database, Shield, Code];

const phaseLabels = [
  'Idea & Scope',
  'Requirements',
  'Architecture',
  'Data Schema',
  'Security Scan',
  'Task Build',
];

const statusIcon = {
  completed: CheckCircle2,
  active: null,
  locked: Lock,
  skipped: Lock,
};

const phaseRoutes = ['intake', 'requirements', 'architecture', 'data', 'security', 'implement'];

export function PhaseSidebar() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { phases, currentPhase, setCurrentPhase, sidebarOpen } = useProjectStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !sidebarOpen) return null;

  return (
    <aside className="w-64 border-r border-border/40 bg-card/65 backdrop-blur-md flex flex-col shrink-0 relative">
      {/* Sidebar background gradient lines */}
      <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-border/20 via-border/50 to-border/20" />
      
      <div className="p-5 border-b border-border/40">
        <h2 className="font-bold text-[10px] text-primary uppercase tracking-widest">
          Development Gateways
        </h2>
        <p className="text-[11px] text-muted-foreground font-light mt-0.5">Stage-gated engineering process</p>
      </div>

      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-2">
          {phases.map((phase, i) => {
            const Icon = phaseIcons[i] || Code;
            const StatusIcon = statusIcon[phase.status];
            const isActive = phase.phase === currentPhase;
            const isClickable = phase.status === 'active' || phase.status === 'completed';

            return (
              <Button
                key={phase.phase}
                variant="ghost"
                size="sm"
                className={cn(
                  'relative w-full justify-start gap-3 h-auto py-3 px-3.5 rounded-xl border border-transparent transition-all duration-300 group',
                  isActive 
                    ? 'bg-primary/10 border-primary/20 text-foreground font-semibold shadow-sm' 
                    : isClickable
                    ? 'hover:bg-accent/40 text-muted-foreground hover:text-foreground'
                    : 'opacity-40 cursor-not-allowed text-muted-foreground/60',
                )}
                disabled={!isClickable}
                onClick={() => {
                  if (!isClickable || !projectId) return;
                  setCurrentPhase(phase.phase);
                  router.push(`/projects/${projectId}/${phaseRoutes[phase.phase - 1]}`);
                }}
              >
                {/* Active Indicator Light */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                )}

                <span className={cn(
                  "relative flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-transform duration-300",
                  isActive ? "bg-primary text-primary-foreground scale-100" : "bg-secondary text-muted-foreground group-hover:scale-105"
                )}>
                  <Icon className="h-4 w-4" />
                  {StatusIcon && (
                    <StatusIcon
                      className={cn(
                        'h-3.5 w-3.5 absolute -top-1 -right-1 rounded-full bg-background',
                        phase.status === 'completed' && 'text-emerald-500 fill-emerald-500/10',
                        phase.status === 'locked' && 'text-muted-foreground',
                      )}
                    />
                  )}
                </span>
                
                <div className="flex flex-col items-start text-left">
                  <span className="text-xs font-semibold tracking-tight">{phaseLabels[i]}</span>
                  <span className="text-[9px] text-muted-foreground/80 font-mono">Gateway {phase.phase}</span>
                </div>
              </Button>
            );
          })}
        </nav>
      </ScrollArea>
      
      {/* Bottom Footer Section in Sidebar */}
      <div className="p-4 border-t border-border/40 bg-card/20 text-center">
        <span className="text-[10px] text-muted-foreground font-light uppercase tracking-wider">
          Blueprint Engine v1.0
        </span>
      </div>
    </aside>
  );
}
