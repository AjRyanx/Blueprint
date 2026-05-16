import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/health', async (_request, reply) => {
    try {
      await db.execute(sql`SELECT 1`);
      return { success: true, data: { status: 'healthy', database: 'connected' } };
    } catch {
      reply.status(503);
      return { success: false, error: 'Database connection failed', data: { status: 'degraded' } };
    }
  });
}
