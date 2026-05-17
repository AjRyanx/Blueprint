export type TargetPlatform = 'web' | 'cli';

export type DeploymentModel = 'cloud' | 'self-hosted' | 'local';

export type ProjectStatus = 'active' | 'archived';

export type Project = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  currentPhase: number;
  needsDatabase: boolean;
  needsServer: boolean;
  needsAuth: boolean;
  targetPlatform: TargetPlatform;
  deploymentModel: DeploymentModel;
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
  needsDatabase: boolean | null;  // null = undetermined at intake stage
  needsServer: boolean | null;    // null = undetermined at intake stage
  needsAuth: boolean | null;      // null = undetermined at intake stage
  targetPlatform: TargetPlatform;
  deploymentModel: DeploymentModel | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProjectRequest = {
  name: string;
  description?: string;
  targetPlatform?: TargetPlatform;
  deploymentModel?: DeploymentModel;
};

export type UpdateProjectRequest = {
  name?: string;
  description?: string;
  status?: ProjectStatus;
};

