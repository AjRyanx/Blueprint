'use client';

import { useProjectStore } from '@/stores/project-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Lightbulb,
  FileText,
  LayoutDashboard,
  Database,
  Shield,
  Code,
  Check,
  Lock,
} from 'lucide-react';

const phaseIcons = [Lightbulb, FileText, LayoutDashboard, Database, Shield, Code];

const phaseLabels = ['Idea', 'Requirements', 'Architecture', 'Data', 'Security', 'Implement'];

const statusIcon = {
  completed: Check,
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
    <aside className="w-56 border-r bg-card flex flex-col shrink-0">
      <div className="p-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Phases
        </h2>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {phases.map((phase, i) => {
            const Icon = phaseIcons[i];
            const StatusIcon = statusIcon[phase.status];
            const isActive = phase.phase === currentPhase;
            const isClickable = phase.status === 'active' || phase.status === 'completed';

            return (
              <Button
                key={phase.phase}
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'w-full justify-start gap-3 h-auto py-3 px-3',
                  !isClickable && 'opacity-50 cursor-not-allowed',
                )}
                disabled={!isClickable}
                onClick={() => {
                  if (!isClickable || !projectId) return;
                  setCurrentPhase(phase.phase);
                  router.push(`/projects/${projectId}/${phaseRoutes[phase.phase - 1]}`);
                }}
              >
                <span className="relative flex items-center justify-center w-6 h-6 shrink-0">
                  <Icon className="h-4 w-4" />
                  {StatusIcon && (
                    <StatusIcon
                      className={cn(
                        'h-3 w-3 absolute -top-1 -right-1',
                        phase.status === 'completed' && 'text-emerald-500',
                        phase.status === 'locked' && 'text-muted-foreground',
                      )}
                    />
                  )}
                </span>
                <div className="flex flex-col items-start text-left">
                  <span className="text-xs font-medium">{phaseLabels[i]}</span>
                  <span className="text-[10px] text-muted-foreground">Phase {phase.phase}</span>
                </div>
              </Button>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
