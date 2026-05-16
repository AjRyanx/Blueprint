import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { implementationTasks } from '../db/schema/tasks.js';
import { requirements } from '../db/schema/requirements.js';
import { projects } from '../db/schema/projects.js';
import { architectureDesigns } from '../db/schema/architecture.js';
import { dataModels } from '../db/schema/data.js';
import { securityChecklists } from '../db/schema/security.js';
import { eq, and, desc, inArray } from 'drizzle-orm';
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

    // Load ALL prioritised requirements (Must, Should, Could) - excluding Wont
    const reqs = await db
      .select()
      .from(requirements)
      .where(
        and(
          eq(requirements.projectId, id),
          inArray(requirements.priority, ['must', 'should', 'could'])
        )
      );

    if (reqs.length === 0) {
      return reply.status(400).send({ success: false, error: 'No prioritised requirements found (Must, Should, or Could Have).' });
    }

    // Sort requirements chronologically by priority: Must Have -> Should Have -> Could Have
    const priorityValues: Record<string, number> = { must: 1, should: 2, could: 3, wont: 4 };
    reqs.sort((a, b) => (priorityValues[a.priority as string] ?? 99) - (priorityValues[b.priority as string] ?? 99));

    // Load Phase 3: System Architecture Design
    const [architecture] = await db
      .select()
      .from(architectureDesigns)
      .where(eq(architectureDesigns.projectId, id));

    // Load Phase 4: Database Data Schema
    const [dataModel] = await db
      .select()
      .from(dataModels)
      .where(eq(dataModels.projectId, id));

    // Load Phase 5: Security Gates Audit
    const [security] = await db
      .select()
      .from(securityChecklists)
      .where(eq(securityChecklists.projectId, id));

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
        architecture: architecture ?? null,
        dataModel: dataModel ?? null,
        security: security ?? null,
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

    // 2. Add Requirement-based Tasks (including Must, Should, and Could)
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
        architecture: architecture ?? null,
        dataModel: dataModel ?? null,
        security: security ?? null,
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

  fastify.patch('/api/v1/projects/:id/tasks/:taskId', async (request, reply) => {
    const { id, taskId } = request.params as { id: string; taskId: string };
    const { userId } = request.user;
    const { status, reviewStatus } = request.body as { status?: string; reviewStatus?: string };

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const [updated] = await db
      .update(implementationTasks)
      .set({
        ...(status && { status }),
        ...(reviewStatus && { reviewStatus }),
        updatedAt: new Date(),
      })
      .where(and(eq(implementationTasks.id, taskId), eq(implementationTasks.projectId, id)))
      .returning();

    if (!updated) {
      return reply.status(404).send({ success: false, error: 'Task not found' });
    }

    return { success: true, data: updated };
  });
}
