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

    // Deduplicate requirements by story text to prevent duplicate prompts
    const seenStories = new Set<string>();
    const uniqueReqs = reqs.filter((r) => {
      if (seenStories.has(r.userStory)) return false;
      seenStories.add(r.userStory);
      return true;
    });

    const tasks = [];
    let sequence = 1;

    // 1. Add Foundational System Tasks
    const systemTasks = [
      {
        title: 'Project & Database Setup',
        objective: 'Initialize the project structure, environment variables, and implement the database schema based on the design from Phase 4.',
        criteria: [
          'Environment variables are configured correctly',
          'Database migrations/schemas are implemented and verified',
          'Connection to the database is established and logged',
        ],
      },
      {
        title: 'Core Layout & Navigation',
        objective: 'Implement the main application layout, navigation components, and responsive grid based on the Architecture from Phase 3.',
        criteria: [
          'App Shell/Layout component is implemented',
          'Side navigation reflects all project sections',
          'Mobile-responsive layout is functional',
        ],
      },
    ];

    for (const sysTask of systemTasks) {
      const context = {
        brief: brief as any,
        requirements: uniqueReqs as any[],
        task: { title: sysTask.title, objective: sysTask.objective, acceptanceCriteria: sysTask.criteria },
        stack: { backend: 'Node.js/Fastify', database: 'PostgreSQL' },
      };
      const promptText = buildPrompt(context);

      const [task] = await db
        .insert(implementationTasks)
        .values({
          projectId: id,
          sequenceOrder: sequence++,
          title: sysTask.title,
          objective: sysTask.objective,
          promptText,
          acceptanceCriteria: sysTask.criteria,
          status: 'ready',
          requirementId: null,
        })
        .returning();
      tasks.push(task);
    }

    // 2. Add Requirement-based Tasks
    for (let i = 0; i < uniqueReqs.length; i++) {
      const req = uniqueReqs[i];
      if (!req) continue;

      const title = generateTaskTitle(req as any);
      const objective = generateTaskObjective(req as any);
      const criteria = generateAcceptanceCriteria(req as any);

      const context = {
        brief: brief as any,
        requirements: uniqueReqs as any[],
        task: { title, objective, acceptanceCriteria: criteria },
        stack: { backend: 'Node.js/Fastify', database: 'PostgreSQL' },
      };

      const promptText = buildPrompt(context);

      const [task] = await db
        .insert(implementationTasks)
        .values({
          projectId: id,
          requirementId: req.id,
          sequenceOrder: sequence++,
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
