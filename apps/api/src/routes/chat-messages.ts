import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { chatMessages } from '../db/schema/chat-messages.js';
import { projects } from '../db/schema/projects.js';
import { eq } from 'drizzle-orm';

export async function chatMessageRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/api/v1/projects/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const msgs = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.projectId, id))
      .orderBy(chatMessages.createdAt);

    return { success: true, data: msgs };
  });

  fastify.post('/api/v1/projects/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const { role, content } = request.body as { role: string; content: string };

    const [msg] = await db
      .insert(chatMessages)
      .values({ projectId: id, role, content })
      .returning();

    return reply.status(201).send({ success: true, data: msg });
  });
}
