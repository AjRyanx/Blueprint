import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { dataModels } from '../db/schema/data.js';
import { projects } from '../db/schema/projects.js';
import { requirements } from '../db/schema/requirements.js';
import { getProjectBrief, advancePhase } from '../services/intake-service.js';
import { eq } from 'drizzle-orm';
import { dataModelSchema } from '@blueprint/shared';
import { GeminiClient, GroqClient, Orchestrator } from '@blueprint/ai-engine';

export async function dataRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/api/v1/projects/:id/data', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const [model] = await db
      .select()
      .from(dataModels)
      .where(eq(dataModels.projectId, id));

    return { success: true, data: model ?? null };
  });

  fastify.put('/api/v1/projects/:id/data', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const parsed = dataModelSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' });
    }

    const existing = await db
      .select()
      .from(dataModels)
      .where(eq(dataModels.projectId, id));

    let result;
    if (existing.length > 0) {
      [result] = await db
        .update(dataModels)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(dataModels.projectId, id))
        .returning();
    } else {
      [result] = await db
        .insert(dataModels)
        .values({ projectId: id, ...parsed.data })
        .returning();
    }

    if (project.currentPhase < 4) {
      await advancePhase(id, 4);
    }

    return { success: true, data: result };
  });

  fastify.post('/api/v1/projects/:id/data/generate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    if (!project.needsDatabase) {
      return reply.status(400).send({ success: false, error: 'Database modelling is skipped for this project.' });
    }

    const brief = await getProjectBrief(id);
    if (!brief) {
      return reply.status(400).send({ success: false, error: 'Project brief not found.' });
    }

    const stories = await db
      .select()
      .from(requirements)
      .where(eq(requirements.projectId, id));

    const geminiClient = new GeminiClient({
      apiKey: process.env.GEMINI_API_KEY!,
      model: process.env.GEMINI_MODEL ?? 'gemma-4-26b-a4b-it',
    });
    const groqClient = new GroqClient({
      apiKey: process.env.GROQ_API_KEY!,
      model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
    });
    const orchestrator = new Orchestrator(geminiClient, groqClient);

    let dataJson = await orchestrator.generateDataModel(JSON.stringify(brief), stories, { needsDatabase: true });
    if (!dataJson) {
      return reply.status(400).send({ success: false, error: 'Data modelling skipped or database not needed.' });
    }
    
    // Clean up potential markdown or surrounding text
    dataJson = dataJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const firstBrace = dataJson.indexOf('{');
    const lastBrace = dataJson.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      dataJson = dataJson.slice(firstBrace, lastBrace + 1);
    }

    let dataModel: any;
    try {
      dataModel = JSON.parse(dataJson);
    } catch (err) {
      request.log.error({ dataJson, err }, 'Failed to parse generated data model');
      return reply.status(500).send({ success: false, error: 'Failed to parse generated data model' });
    }

    // Save to DB
    const existing = await db
      .select()
      .from(dataModels)
      .where(eq(dataModels.projectId, id));

    let result;
    if (existing.length > 0) {
      [result] = await db
        .update(dataModels)
        .set({ ...dataModel, updatedAt: new Date() })
        .where(eq(dataModels.projectId, id))
        .returning();
    } else {
      [result] = await db
        .insert(dataModels)
        .values({ projectId: id, ...dataModel })
        .returning();
    }

    return { success: true, data: result };
  });
}
