import type { FastifyInstance } from 'fastify';
import { createProjectSchema, updateProjectSchema } from '@blueprint/shared';
import { db } from '../db/index.js';
import { projects, projectBriefs } from '../db/schema/projects.js';
import { eq, desc } from 'drizzle-orm';

export async function projectRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/api/v1/projects', async (request) => {
    const { userId } = request.user;
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
    return { success: true, data: userProjects };
  });

  fastify.get('/api/v1/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));

    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const [brief] = await db
      .select()
      .from(projectBriefs)
      .where(eq(projectBriefs.projectId, id));

    // Auto-advance if brief exists but phase is still 1
    let currentPhase = project.currentPhase;
    if (brief && currentPhase === 1) {
      const [updated] = await db
        .update(projects)
        .set({ currentPhase: 2, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();
      if (updated) currentPhase = 2;
    }

    return { success: true, data: { ...project, currentPhase, brief: brief ?? null } };
  });

  fastify.post('/api/v1/projects', async (request, reply) => {
    const parsed = createProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' });
    }

    const { userId } = request.user;
    const { name, description } = parsed.data;

    const [project] = await db
      .insert(projects)
      .values({ userId, name, description })
      .returning();

    return reply.status(201).send({ success: true, data: project });
  });

  fastify.patch('/api/v1/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const parsed = updateProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' });
    }

    const [existing] = await db.select().from(projects).where(eq(projects.id, id));
    if (!existing || existing.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const [updated] = await db
      .update(projects)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    return { success: true, data: updated };
  });

  fastify.delete('/api/v1/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const [existing] = await db.select().from(projects).where(eq(projects.id, id));
    if (!existing || existing.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    await db.delete(projects).where(eq(projects.id, id));
    return { success: true, data: null };
  });
}
