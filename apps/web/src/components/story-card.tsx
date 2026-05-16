'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, Pencil } from 'lucide-react';
import type { Requirement, Priority } from '@blueprint/shared';
import { cn } from '@/lib/utils';

const priorityConfig: Record<Priority, { label: string; variant: 'destructive' | 'warning' | 'default' | 'secondary' }> = {
  must: { label: 'Must', variant: 'destructive' },
  should: { label: 'Should', variant: 'warning' },
  could: { label: 'Could', variant: 'default' },
  wont: { label: 'Won\'t', variant: 'secondary' },
};

type StoryCardProps = {
  requirement: Requirement;
  onDelete?: (id: string) => void;
  onEdit?: (req: Requirement) => void;
  draggable?: boolean;
};

export function StoryCard({ requirement, onDelete, onEdit, draggable }: StoryCardProps) {
  const config = priorityConfig[requirement.priority];

  return (
    <Card className={cn('cursor-pointer hover:shadow-sm transition-shadow', draggable && 'cursor-grab')}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {draggable && (
            <GripVertical className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">
                {config.label}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {requirement.status}
              </Badge>
            </div>
            <p className="text-sm leading-snug">{requirement.userStory}</p>
            {requirement.dependencies.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {requirement.dependencies.map((dep) => (
                  <Badge key={dep} variant="outline" className="text-[10px]">
                    depends on {dep.slice(0, 8)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(requirement)}>
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(requirement.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
