'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GraduationCap, Briefcase, BarChart3, ArrowRight, Sparkles } from 'lucide-react';
import { useCreateProject } from '@/hooks/use-project';
import { toast } from 'sonner';

type Persona = 'graduate' | 'founder' | 'professional';

const personas = [
  {
    id: 'graduate' as Persona,
    title: 'Graduate Builder',
    description: 'Recently graduated in software engineering. Need to ship your first solo project.',
    icon: GraduationCap,
    tone: 'supportive',
  },
  {
    id: 'founder' as Persona,
    title: 'Technical Founder',
    description: 'Building an MVP. Need structured, professional-grade output.',
    icon: Briefcase,
    tone: 'efficient',
  },
  {
    id: 'professional' as Persona,
    title: 'Adjacent Professional',
    description: 'Data analyst, DevOps, QA — building internal tools and applications.',
    icon: BarChart3,
    tone: 'practical',
  },
];

export function WelcomeScreen() {
  const router = useRouter();
  const { data: session } = useSession();
  const createProject = useCreateProject();
  const [step, setStep] = useState<'persona' | 'project'>('persona');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const handlePersonaSelect = (persona: Persona) => {
    setSelectedPersona(persona);
    setStep('project');
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;

    try {
      const project = await createProject.mutateAsync({
        name: projectName,
        description: projectDescription || undefined,
      });
      toast.success('Project created!');
      router.push(`/projects/${project.id}/intake`);
    } catch {
      toast.error('Failed to create project');
    }
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Welcome to Blueprint</h1>
          <p className="text-muted-foreground mt-2">
            Guided AI-powered software development. From idea to production-grade code.
          </p>
        </div>

        {step === 'persona' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center">Who best describes you?</h2>
            <p className="text-sm text-muted-foreground text-center -mt-2">
              This helps me set the right tone and complexity level.
            </p>
            <div className="grid gap-4">
              {personas.map((persona) => {
                const Icon = persona.icon;
                return (
                  <Card
                    key={persona.id}
                    className={cn(
                      'cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm',
                      selectedPersona === persona.id && 'border-primary shadow-sm',
                    )}
                    onClick={() => handlePersonaSelect(persona.id)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{persona.title}</h3>
                          <Badge variant="outline" className="text-[10px]">
                            {persona.tone}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {persona.description}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {step === 'project' && (
          <Card>
            <CardHeader>
              <CardTitle>Name your project</CardTitle>
              <CardDescription>
                What are you building? You can refine the details in the next step.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  placeholder="e.g., TaskFlow, PriceTracker, DevMetrics"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-desc">Brief description (optional)</Label>
                <Input
                  id="project-desc"
                  placeholder="A short description of your idea"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('persona')}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreateProject}
                  disabled={!projectName.trim() || createProject.isPending}
                >
                  {createProject.isPending ? 'Creating...' : 'Start Building'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
