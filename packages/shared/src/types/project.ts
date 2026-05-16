export type ProjectStatus = 'active' | 'archived';

export type Project = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  currentPhase: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectBrief = {
  id: string;
  projectId: string;
  projectName: string;
  oneLineDescription: string;
  problemStatement: string;
  targetUsers: string;
  coreValueProposition: string;
  outOfScope: string[];
  successMetrics: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProjectRequest = {
  name: string;
  description?: string;
};

export type UpdateProjectRequest = {
  name?: string;
  description?: string;
  status?: ProjectStatus;
};
