import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string; email: string };
    user: { userId: string; email: string };
  }
}

export default fp(async function authPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyCookie);
  await fastify.register(fastifyJwt, {
    secret: config.jwt.accessSecret,
  });

  fastify.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply) {
      if (request.method === 'OPTIONS') {
        return; // Allow preflight requests to pass through
      }
      request.log.info({ authHeader: request.headers.authorization, allHeaders: request.headers }, 'Auth Hook Inspect');
      try {
        await request.jwtVerify();
      } catch (err: any) {
        request.log.error({ 
          msg: err.message, 
          name: err.name,
          header: request.headers.authorization 
        }, 'JWT Verification Failed');
        reply.status(401).send({ success: false, error: 'Unauthorized', detail: err.message });
      }
    },
  );
});
