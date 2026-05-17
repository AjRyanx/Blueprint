import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { projects } from '../db/schema/projects.js';
import { eq } from 'drizzle-orm';

export async function phaseRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/api/v1/projects/:id/phases', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const phases = [1, 2, 3, 4, 5, 6].map((phase) => {
      let status: string;
      if (phase === 4 && project.needsDatabase === false) {
        status = 'skipped';
      } else if (phase < project.currentPhase) {
        status = 'completed';
      } else if (phase === project.currentPhase) {
        status = 'active';
      } else {
        status = 'locked';
      }

      const names = [
        'Idea Capture & Scoping',
        'Requirements Engineering',
        'System Architecture Design',
        'Data Modelling',
        'Security & Standards Planning',
        'Guided Implementation',
      ];

      return { phase, name: names[phase - 1], status };
    });

    return { success: true, data: phases };
  });

  fastify.patch('/api/v1/projects/:id/phase', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;
    const { toPhase } = request.body as { toPhase: number };

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    if (toPhase < 1 || toPhase > 6) {
      return reply.status(400).send({ success: false, error: 'Invalid phase number' });
    }

    let targetPhase = toPhase;
    let phase4Skipped = false;

    if (toPhase === 4 && project.needsDatabase === false) {
      targetPhase = 5;
      phase4Skipped = true;
    }

    if (
      targetPhase !== project.currentPhase &&
      targetPhase !== project.currentPhase + 1 &&
      !(phase4Skipped && targetPhase === project.currentPhase + 2)
    ) {
      return reply.status(400).send({ success: false, error: 'Can only advance to the next phase' });
    }

    const [updated] = await db
      .update(projects)
      .set({ currentPhase: targetPhase, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    return {
      success: true,
      data: updated,
      nextPhase: targetPhase,
      phase4: phase4Skipped ? 'skipped' : undefined,
    };
  });

  fastify.post('/api/v1/projects/:id/phases/enable', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;
    const { phase } = request.body as { phase: number };

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    if (phase === 4) {
      const [updated] = await db
        .update(projects)
        .set({
          needsDatabase: true,
          currentPhase: 4,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, id))
        .returning();

      return { success: true, phase: 4, status: 'active', data: updated };
    }

    return reply.status(400).send({ success: false, error: 'Only phase 4 can be re-enabled' });
  });
}
