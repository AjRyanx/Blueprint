import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { implementationTasks } from '../db/schema/tasks.js';
import { requirements } from '../db/schema/requirements.js';
import { projects } from '../db/schema/projects.js';
import { eq, and, desc } from 'drizzle-orm';
import { getProjectBrief } from '../services/intake-service.js';
import { buildPrompt, generateTaskTitle, generateTaskObjective, generateAcceptanceCriteria } from '@blueprint/ai-engine';

export async function tasksRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/api/v1/projects/:id/tasks', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const tasks = await db
      .select()
      .from(implementationTasks)
      .where(eq(implementationTasks.projectId, id))
      .orderBy(implementationTasks.sequenceOrder);

    return { success: true, data: tasks };
  });

  fastify.post('/api/v1/projects/:id/tasks/generate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const brief = await getProjectBrief(id);
    if (!brief) {
      return reply.status(400).send({ success: false, error: 'Complete Phase 1 first' });
    }

    const reqs = await db
      .select()
      .from(requirements)
      .where(and(eq(requirements.projectId, id), eq(requirements.priority, 'must')));

    if (reqs.length === 0) {
      return reply.status(400).send({ success: false, error: 'No must-have requirements found' });
    }

    await db.delete(implementationTasks).where(eq(implementationTasks.projectId, id));

    const tasks = [];
    for (let i = 0; i < reqs.length; i++) {
      const req = reqs[i];
      const title = generateTaskTitle(req);
      const objective = generateTaskObjective(req);
      const criteria = generateAcceptanceCriteria(req);

      const context = {
        brief: brief as any,
        requirements: reqs as any[],
        task: { title, objective, acceptanceCriteria: criteria },
        stack: { backend: 'Node.js/Fastify', database: 'PostgreSQL' },
      };

      const promptText = buildPrompt(context);

      const [task] = await db
        .insert(implementationTasks)
        .values({
          projectId: id,
          requirementId: req.id,
          sequenceOrder: i + 1,
          title,
          objective,
          promptText,
          acceptanceCriteria: criteria,
          status: 'ready',
        })
        .returning();

      tasks.push(task);
    }

    return { success: true, data: tasks };
  });
}
