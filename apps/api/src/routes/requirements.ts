import type { FastifyInstance } from 'fastify';
import { createRequirementSchema, updateRequirementSchema } from '@blueprint/shared';
import { db } from '../db/index.js';
import { requirements } from '../db/schema/requirements.js';
import { projects } from '../db/schema/projects.js';
import { eq, and } from 'drizzle-orm';
import { GeminiClient, GroqClient, Orchestrator } from '@blueprint/ai-engine';
import { getProjectBrief, advancePhase } from '../services/intake-service.js';

export async function requirementsRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  const geminiClient = new GeminiClient({
    apiKey: process.env.GEMINI_API_KEY!,
    model: process.env.GEMINI_MODEL ?? 'gemma-4-26b-a4b-it',
  });
  const groqClient = new GroqClient({
    apiKey: process.env.GROQ_API_KEY!,
    model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
  });
  const orchestrator = new Orchestrator(geminiClient, groqClient);

  fastify.get('/api/v1/projects/:id/requirements', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const reqs = await db
      .select()
      .from(requirements)
      .where(eq(requirements.projectId, id));

    return { success: true, data: reqs };
  });

  fastify.post('/api/v1/projects/:id/requirements/generate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const brief = await getProjectBrief(id);
    if (!brief) {
      return reply.status(400).send({ success: false, error: 'Project brief not found. Complete Phase 1 first.' });
    }

    const briefText = JSON.stringify(brief);
    let storiesJson = await orchestrator.generateRequirements(briefText);
    
    // Clean up potential markdown, surrounding conversational text, or trailing characters
    storiesJson = storiesJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    if (storiesJson.includes('[') && storiesJson.includes(']')) {
      storiesJson = storiesJson.replace(/^[^\[]*\[/, '[').replace(/\][^\]]*$/, ']');
    }

    let stories: any[];
    try {
      stories = JSON.parse(storiesJson);
    } catch (err) {
      request.log.error({ storiesJson, err }, 'Failed to parse generated requirements');
      return reply.status(500).send({ 
        success: false, 
        error: 'Failed to parse generated requirements',
        detail: storiesJson.slice(0, 500)
      });
    }

    // Clear existing requirements before generating new ones
    await db.delete(requirements).where(eq(requirements.projectId, id));

    const inserted = [];
    for (const story of stories) {
      const [req] = await db
        .insert(requirements)
        .values({
          projectId: id,
          userStory: `As a ${story.actor}, I want to ${story.action}, so that ${story.benefit}`,
          actor: story.actor,
          action: story.action,
          benefit: story.benefit,
          priority: story.priority ?? 'must',
        })
        .returning();
      inserted.push(req);
    }

    if (project.currentPhase < 3) {
      await advancePhase(id, 3);
    }

    return { success: true, data: inserted };
  });

  fastify.post('/api/v1/projects/:id/requirements', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const parsed = createRequirementSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' });
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const { userStory, priority, dependencies } = parsed.data;
    const match = userStory.match(/As a (.+?), I want to (.+?), so that (.+)/);
    const actor = match?.[1] ?? '';
    const action = match?.[2] ?? '';
    const benefit = match?.[3] ?? '';

    const [req] = await db
      .insert(requirements)
      .values({ projectId: id, userStory, actor, action, benefit, priority, dependencies })
      .returning();

    return reply.status(201).send({ success: true, data: req });
  });

  fastify.patch('/api/v1/projects/:id/requirements/:reqId', async (request, reply) => {
    const { id, reqId } = request.params as { id: string; reqId: string };
    const { userId } = request.user;

    const parsed = updateRequirementSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' });
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const [existing] = await db
      .select()
      .from(requirements)
      .where(and(eq(requirements.id, reqId), eq(requirements.projectId, id)));

    if (!existing) {
      return reply.status(404).send({ success: false, error: 'Requirement not found' });
    }

    const [updated] = await db
      .update(requirements)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(requirements.id, reqId))
      .returning();

    return { success: true, data: updated };
  });

  fastify.delete('/api/v1/projects/:id/requirements/:reqId', async (request, reply) => {
    const { id, reqId } = request.params as { id: string; reqId: string };
    const { userId } = request.user;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    await db
      .delete(requirements)
      .where(and(eq(requirements.id, reqId), eq(requirements.projectId, id)));

    return { success: true, data: null };
  });
}
