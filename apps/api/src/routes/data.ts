import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { dataModels } from '../db/schema/data.js';
import { projects } from '../db/schema/projects.js';
import { advancePhase } from '../services/intake-service.js';
import { eq } from 'drizzle-orm';
import { dataModelSchema } from '@blueprint/shared';

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
}
