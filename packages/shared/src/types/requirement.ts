export type Priority = 'must' | 'should' | 'could' | 'wont';

export type RequirementStatus = 'draft' | 'approved' | 'implemented' | 'blocked';

export type Requirement = {
  id: string;
  projectId: string;
  userStory: string;
  actor: string;
  action: string;
  benefit: string;
  priority: Priority;
  status: RequirementStatus;
  dependencies: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type CreateRequirementRequest = {
  userStory: string;
  priority: Priority;
  dependencies?: string[];
};

export type UpdateRequirementRequest = {
  userStory?: string;
  priority?: Priority;
  status?: RequirementStatus;
  dependencies?: string[];
};
