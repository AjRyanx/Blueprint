import type { FastifyInstance } from 'fastify';

export function registerAuthGuard(fastify: FastifyInstance) {
  fastify.addHook('onRoute', (routeOptions) => {
    const publicPaths = [
      '/api/v1/auth/register',
      '/api/v1/auth/login',
      '/api/v1/auth/refresh',
      '/api/v1/health',
    ];

    if (routeOptions.url && !publicPaths.includes(routeOptions.url)) {
      const existingConfig = routeOptions.config ?? {};
      routeOptions.config = { ...existingConfig, requiresAuth: true };
    }
  });
}
