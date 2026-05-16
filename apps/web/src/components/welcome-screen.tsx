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
import { GraduationCap, Briefcase, BarChart3, ArrowRight, Sparkles, ArrowLeft } from 'lucide-react';
import { useCreateProject } from '@/hooks/use-project';
import { toast } from 'sonner';

type Persona = 'graduate' | 'founder' | 'professional';

const personas = [
  {
    id: 'graduate' as Persona,
    title: 'Graduate Builder',
    description: 'Recently graduated in software engineering. Learn, structure, and ship your first production-grade solo project.',
    icon: GraduationCap,
    tone: 'supportive',
    badgeColor: 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/20',
    iconColor: 'text-indigo-500',
    glowColor: 'group-hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]',
  },
  {
    id: 'founder' as Persona,
    title: 'Technical Founder',
    description: 'Building a venture-backed MVP. Turn your vision into structured, secure, investor-ready codebases.',
    icon: Briefcase,
    tone: 'efficient',
    badgeColor: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20',
    iconColor: 'text-emerald-500',
    glowColor: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]',
  },
  {
    id: 'professional' as Persona,
    title: 'Adjacent Professional',
    description: 'Product Manager, Analyst, QA or DevOps wizard — build clean, maintainable internal tools with confidence.',
    icon: BarChart3,
    tone: 'practical',
    badgeColor: 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20',
    iconColor: 'text-amber-500',
    glowColor: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
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
      toast.success('Project created successfully!');
      router.push(`/projects/${project.id}/intake`);
    } catch {
      toast.error('Failed to create project');
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-3rem)] w-full flex items-center justify-center p-6 md:p-12 overflow-hidden bg-background">
      {/* Decorative ambient glowing background circles */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-rose-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-3xl space-y-8 relative z-10">
        <div className="text-center space-y-4 animate-in fade-in duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold backdrop-blur-sm shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span>Next Generation Builder</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
            Welcome to Blueprint
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto font-light leading-relaxed">
            Bridge the gap between vision and production-grade software. Follow our expert stage-gated journey.
          </p>
        </div>

        {step === 'persona' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div className="text-center space-y-1.5">
              <h2 className="text-xl font-bold tracking-tight">Select your starting profile</h2>
              <p className="text-sm text-muted-foreground">
                We customize the guidance tone and technical abstraction to perfectly match your background.
              </p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-1">
              {personas.map((persona) => {
                const Icon = persona.icon;
                return (
                  <div
                    key={persona.id}
                    className={cn(
                      'group relative rounded-xl border border-border/50 bg-card/40 backdrop-blur-md p-5 flex items-center gap-5 cursor-pointer transition-all duration-300 hover:border-primary/40 hover:bg-card/75 hover:shadow-lg',
                      selectedPersona === persona.id && 'border-primary/80 bg-card/80 shadow-md ring-1 ring-primary/30',
                      persona.glowColor
                    )}
                    onClick={() => handlePersonaSelect(persona.id)}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110",
                      persona.id === 'graduate' ? 'bg-indigo-500/10' : persona.id === 'founder' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                    )}>
                      <Icon className={cn("h-6 w-6", persona.iconColor)} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base tracking-tight text-card-foreground">
                          {persona.title}
                        </h3>
                        <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider", persona.badgeColor)}>
                          {persona.tone}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-normal font-light">
                        {persona.description}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground/60 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 'project' && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
            <Card className="border-border/50 bg-card/40 backdrop-blur-md shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold tracking-tight">Initialize New Project</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  What software product are we blueprinting today? You can customize these details dynamically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="project-name" className="text-sm font-semibold tracking-wide">
                    Project name
                  </Label>
                  <Input
                    id="project-name"
                    placeholder="e.g., Football Manager Lite, Invoice Tracker"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="h-11 border-border/60 bg-background/50 focus-visible:ring-primary focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-desc" className="text-sm font-semibold tracking-wide">
                    Elevator Pitch / Description (optional)
                  </Label>
                  <Input
                    id="project-desc"
                    placeholder="A brief summary of your product goals or target audience"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="h-11 border-border/60 bg-background/50 focus-visible:ring-primary focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 transition-all"
                  />
                </div>
                <div className="flex gap-4 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('persona')}
                    className="h-11 px-5 border-border/60 bg-background/30 hover:bg-background/80 transition-all gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </Button>
                  <Button
                    className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/95 transition-all gap-2 shadow-lg hover:shadow-primary/20 font-medium"
                    onClick={handleCreateProject}
                    disabled={!projectName.trim() || createProject.isPending}
                  >
                    <span>{createProject.isPending ? 'Forging Architecture...' : 'Start Scoping Journey'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
