import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { authRoutes } from './routes/auth.js';
import { projectRoutes } from './routes/projects.js';
import { phaseRoutes } from './routes/phases.js';
import { healthRoutes } from './routes/health.js';
import { chatRoutes } from './routes/chat.js';
import { intakeRoutes } from './routes/intake.js';
import { requirementsRoutes } from './routes/requirements.js';
import { securityRoutes } from './routes/security.js';
import { architectureRoutes } from './routes/architecture.js';
import { dataRoutes } from './routes/data.js';
import { chatMessageRoutes } from './routes/chat-messages.js';
import { tasksRoutes } from './routes/tasks.js';
import { creditRoutes } from './routes/credits.js';
import { stripeRoutes } from './routes/stripe.js';
import authPlugin from './plugins/auth.js';

async function main() {
  const fastify = Fastify({
    logger: {
      transport: config.nodeEnv === 'development' ? { target: 'pino-pretty' } : undefined,
    },
  });

  await fastify.register(cors, {
    origin: config.cors.origin,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  await fastify.register(rateLimit, {
    max: config.rateLimit.standard,
    timeWindow: '1 minute',
  });

  await fastify.register(authPlugin);

  await fastify.register(authRoutes);
  await fastify.register(projectRoutes);
  await fastify.register(phaseRoutes);
  await fastify.register(healthRoutes);
  await fastify.register(chatRoutes);
  await fastify.register(intakeRoutes);
  await fastify.register(requirementsRoutes);
  await fastify.register(architectureRoutes);
  await fastify.register(dataRoutes);
  await fastify.register(chatMessageRoutes);
  await fastify.register(securityRoutes);
  await fastify.register(tasksRoutes);
  await fastify.register(creditRoutes);
  await fastify.register(stripeRoutes);

  fastify.setErrorHandler((error: any, _request, reply) => {
    fastify.log.error(error);
    const statusCode = error.statusCode ?? 500;
    reply.status(statusCode).send({
      success: false,
      error: statusCode === 500 ? 'Internal server error' : error.message,
    });
  });

  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    fastify.log.info(`Blueprint API running on port ${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
