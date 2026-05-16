import { create } from 'zustand';
import type { PhaseState } from '@blueprint/shared';

type ProjectState = {
  currentProjectId: string | null;
  currentPhase: number;
  phases: PhaseState[];
  sidebarOpen: boolean;
  setCurrentProject: (id: string) => void;
  setCurrentPhase: (phase: number) => void;
  setPhases: (phases: PhaseState[]) => void;
  updatePhase: (phase: number, status: PhaseState['status']) => void;
  toggleSidebar: () => void;
};

export const useProjectStore = create<ProjectState>((set) => ({
  currentProjectId: null,
  currentPhase: 1,
  phases: [
    { phase: 1, name: 'Idea Capture & Scoping', status: 'active' },
    { phase: 2, name: 'Requirements Engineering', status: 'locked' },
    { phase: 3, name: 'System Architecture Design', status: 'locked' },
    { phase: 4, name: 'Data Modelling', status: 'locked' },
    { phase: 5, name: 'Security & Standards Planning', status: 'locked' },
    { phase: 6, name: 'Guided Implementation', status: 'locked' },
  ],
  sidebarOpen: true,

  setCurrentProject: (id) => set({ currentProjectId: id }),

  setCurrentPhase: (phase) => set((state) => ({
    currentPhase: phase,
    phases: state.phases.map((p) => ({
      ...p,
      status: p.phase < phase ? 'completed' : p.phase === phase ? 'active' : 'locked',
    })),
  })),

  setPhases: (phases) => set({ phases }),

  updatePhase: (phase, status) =>
    set((state) => ({
      phases: state.phases.map((p) => (p.phase === phase ? { ...p, status } : p)),
    })),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
