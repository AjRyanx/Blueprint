import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { architectureDesigns } from '../db/schema/architecture.js';
import { projects } from '../db/schema/projects.js';
import { eq } from 'drizzle-orm';
import { architectureDesignSchema } from '@blueprint/shared';
import { GeminiClient, GroqClient, Orchestrator } from '@blueprint/ai-engine';
import { getProjectBrief, advancePhase } from '../services/intake-service.js';
import { requirements } from '../db/schema/requirements.js';

export async function architectureRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/api/v1/projects/:id/architecture', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const [design] = await db
      .select()
      .from(architectureDesigns)
      .where(eq(architectureDesigns.projectId, id));

    return { success: true, data: design ?? null };
  });

  fastify.put('/api/v1/projects/:id/architecture', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const parsed = architectureDesignSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' });
    }

    const existing = await db
      .select()
      .from(architectureDesigns)
      .where(eq(architectureDesigns.projectId, id));

    let result;
    if (existing.length > 0) {
      [result] = await db
        .update(architectureDesigns)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(architectureDesigns.projectId, id))
        .returning();
    } else {
      [result] = await db
        .insert(architectureDesigns)
        .values({ projectId: id, ...parsed.data })
        .returning();
    }

    if (project.currentPhase < 3) {
      await advancePhase(id, 3);
    }

    return { success: true, data: result };
  });

  fastify.post('/api/v1/projects/:id/architecture/generate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
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

    let designJson = await orchestrator.generateArchitecture(JSON.stringify(brief), stories);
    
    // Clean up potential markdown or surrounding text
    designJson = designJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const firstBrace = designJson.indexOf('{');
    const lastBrace = designJson.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      designJson = designJson.slice(firstBrace, lastBrace + 1);
    }

    let designData: any;
    try {
      designData = JSON.parse(designJson);
    } catch (err) {
      request.log.error({ designJson, err }, 'Failed to parse generated architecture');
      return reply.status(500).send({ success: false, error: 'Failed to parse generated architecture' });
    }

    // Save to DB
    const existing = await db
      .select()
      .from(architectureDesigns)
      .where(eq(architectureDesigns.projectId, id));

    let result;
    if (existing.length > 0) {
      [result] = await db
        .update(architectureDesigns)
        .set({ ...designData, updatedAt: new Date() })
        .where(eq(architectureDesigns.projectId, id))
        .returning();
    } else {
      [result] = await db
        .insert(architectureDesigns)
        .values({ projectId: id, ...designData })
        .returning();
    }

    return { success: true, data: result };
  });
}
