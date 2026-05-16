export type TaskStatus = 'pending' | 'ready' | 'generated' | 'accepted' | 'rejected';

export type ImplementationTask = {
  id: string;
  projectId: string;
  requirementId: string;
  sequenceOrder: number;
  title: string;
  objective: string;
  promptText: string;
  acceptanceCriteria: string[];
  status: TaskStatus;
  reviewStatus: 'pending' | 'passed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
};

export type GeneratedPrompt = {
  taskId: string;
  roleDefinition: string;
  contextSummary: string;
  taskSpecification: string;
  technicalConstraints: string[];
  securityRequirements: string[];
  outputFormat: string;
  acceptanceCriteria: string[];
  fullPrompt: string;
};
