import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { projects } from '../db/schema/projects.js';
import { eq } from 'drizzle-orm';
import { saveProjectBrief, advancePhase } from '../services/intake-service.js';

export async function intakeRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.put('/api/v1/projects/:id/intake/brief', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;
    const brief = request.body;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const saved = await saveProjectBrief(id, brief);
    await advancePhase(id, 2);
    return { success: true, data: brief };
  });
}
