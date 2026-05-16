export const PHASE_NAMES = [
  'Idea Capture & Scoping',
  'Requirements Engineering',
  'System Architecture Design',
  'Data Modelling',
  'Security & Standards Planning',
  'Guided Implementation',
] as const;

export type PhaseName = (typeof PHASE_NAMES)[number];

export type PhaseStatus = 'locked' | 'active' | 'completed' | 'skipped';

export type PhaseState = {
  phase: number;
  name: PhaseName;
  status: PhaseStatus;
};

export type PhaseTransition = {
  projectId: string;
  fromPhase: number;
  toPhase: number;
  acknowledged: boolean;
};
