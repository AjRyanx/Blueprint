import type { FastifyInstance } from 'fastify';
import { getCreditBalance } from '../services/credit-service.js';

export async function creditRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/api/v1/credits', async (request) => {
    const { userId } = request.user;
    const balance = await getCreditBalance(userId);
    return { success: true, data: balance };
  });
}
