export type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical';

export type Threat = {
  id: string;
  category: string;
  description: string;
  severity: ThreatSeverity;
  mitigation: string;
  mitigated: boolean;
};

export type ChecklistItem = {
  id: string;
  category: string;
  title: string;
  description: string;
  required: boolean;
  passed: boolean | null;
  notes: string | null;
};

export type SecurityChecklist = {
  id: string;
  projectId: string;
  threats: Threat[];
  checklist: ChecklistItem[];
  signedOffAt: Date | null;
  signedOffBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdateChecklistItemRequest = {
  itemId: string;
  passed: boolean;
  notes?: string;
};

export type SignOffRequest = {
  projectId: string;
};
