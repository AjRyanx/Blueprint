import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { securityChecklists } from '../db/schema/security.js';
import { projects } from '../db/schema/projects.js';
import { requirements as requirementsTable } from '../db/schema/requirements.js';
import { eq, and } from 'drizzle-orm';
import { GeminiClient, Orchestrator } from '@blueprint/ai-engine';
import { getProjectBrief } from '../services/intake-service.js';
import { updateChecklistItemSchema, signOffSchema } from '@blueprint/shared';

export async function securityRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  const geminiClient = new GeminiClient({
    apiKey: process.env.GEMINI_API_KEY!,
    model: process.env.GEMINI_MODEL ?? 'gemma-4-26b-a4b-it',
  });
  const orchestrator = new Orchestrator(geminiClient);

  fastify.get('/api/v1/projects/:id/security', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const [checklist] = await db
      .select()
      .from(securityChecklists)
      .where(eq(securityChecklists.projectId, id));

    return { success: true, data: checklist ?? null };
  });

  fastify.post('/api/v1/projects/:id/security/generate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const brief = await getProjectBrief(id);
    const reqs = await db
      .select()
      .from(requirementsTable)
      .where(eq(requirementsTable.projectId, id));

    const result = await orchestrator.generateSecurityChecklist(
      JSON.stringify(brief ?? {}),
      JSON.stringify(reqs),
    );

    const existing = await db
      .select()
      .from(securityChecklists)
      .where(eq(securityChecklists.projectId, id));

    if (existing.length > 0) {
      const [updated] = await db
        .update(securityChecklists)
        .set({
          threats: result.threats,
          checklist: result.checklist,
          updatedAt: new Date(),
        })
        .where(eq(securityChecklists.projectId, id))
        .returning();
      return { success: true, data: updated };
    }

    const [created] = await db
      .insert(securityChecklists)
      .values({
        projectId: id,
        threats: result.threats,
        checklist: result.checklist,
      })
      .returning();

    return { success: true, data: created };
  });

  fastify.patch('/api/v1/projects/:id/security/item', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const parsed = updateChecklistItemSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' });
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const [checklist] = await db
      .select()
      .from(securityChecklists)
      .where(eq(securityChecklists.projectId, id));

    if (!checklist) {
      return reply.status(404).send({ success: false, error: 'Security checklist not found' });
    }

    const { itemId, passed, notes } = parsed.data;
    const updatedItems = (checklist.checklist as any[]).map((item: any) =>
      item.id === itemId ? { ...item, passed, notes: notes ?? item.notes } : item,
    );

    const [updated] = await db
      .update(securityChecklists)
      .set({ checklist: updatedItems, updatedAt: new Date() })
      .where(eq(securityChecklists.projectId, id))
      .returning();

    return { success: true, data: updated };
  });

  fastify.post('/api/v1/projects/:id/security/sign-off', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const [checklist] = await db
      .select()
      .from(securityChecklists)
      .where(eq(securityChecklists.projectId, id));

    if (!checklist) {
      return reply.status(400).send({ success: false, error: 'Generate checklist first' });
    }

    const allPassed = (checklist.checklist as any[]).every(
      (item: any) => !item.required || item.passed === true,
    );

    if (!allPassed) {
      return reply.status(400).send({
        success: false,
        error: 'All required checklist items must be marked as passed before sign-off',
      });
    }

    const [updated] = await db
      .update(securityChecklists)
      .set({
        signedOffAt: new Date(),
        signedOffBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(securityChecklists.projectId, id))
      .returning();

    return { success: true, data: updated };
  });
}
