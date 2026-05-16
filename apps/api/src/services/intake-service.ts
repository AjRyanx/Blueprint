import { db } from '../db/index.js';
import { projectBriefs } from '../db/schema/projects.js';
import { projects } from '../db/schema/projects.js';
import { eq } from 'drizzle-orm';
import { Orchestrator } from '@blueprint/ai-engine';

export async function saveProjectBrief(
  projectId: string,
  brief: {
    projectName: string;
    oneLineDescription: string;
    problemStatement: string;
    targetUsers: string;
    coreValueProposition: string;
    outOfScope: string[];
    successMetrics: string[];
  },
) {
  const existing = await db
    .select()
    .from(projectBriefs)
    .where(eq(projectBriefs.projectId, projectId));

  if (existing.length > 0) {
    const [updated] = await db
      .update(projectBriefs)
      .set({ ...brief, version: existing[0].version + 1, updatedAt: new Date() })
      .where(eq(projectBriefs.projectId, projectId))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(projectBriefs)
    .values({ projectId, ...brief })
    .returning();

  return created;
}

export async function getProjectBrief(projectId: string) {
  const [brief] = await db
    .select()
    .from(projectBriefs)
    .where(eq(projectBriefs.projectId, projectId));
  return brief ?? null;
}

export async function advancePhase(projectId: string, toPhase: number) {
  const [updated] = await db
    .update(projects)
    .set({ currentPhase: toPhase, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();
  return updated;
}
