import type { FastifyInstance } from 'fastify';
import { loginSchema, registerSchema, oauthSchema } from '@blueprint/shared';
import { createUser, findUserByEmail, findUserById, findOrCreateOAuthUser, verifyPassword } from '../services/auth-service.js';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { creditLedger } from '../db/schema/credits.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' });
    }

    const { email, password, name } = parsed.data;

    const existing = await findUserByEmail(email);
    if (existing) {
      return reply.status(409).send({ success: false, error: 'Email already registered' });
    }

    let user: { id: string; email: string; name: string | null; planTier: string };
    try {
      const result = await createUser(email, password, name);
      if (!result) {
        return reply.status(500).send({ success: false, error: 'Failed to create account.' });
      }
      user = result;
    } catch (err) {
      request.log.error({ err }, 'Failed to create user');
      return reply.status(500).send({ success: false, error: 'Failed to create account. Database may not be available or tables not created.' });
    }

    const accessToken = fastify.jwt.sign({ userId: user.id, email: user.email });
    const refreshToken = fastify.jwt.sign(
      { userId: user.id, email: user.email },
      { expiresIn: config.jwt.refreshExpiry },
    );

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    reply.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return {
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, planTier: user.planTier },
        accessToken,
      },
    };
  });

  fastify.post('/api/v1/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' });
    }

    const { email, password } = parsed.data;
    const user = await findUserByEmail(email);
    if (!user || !user.hashedPassword) {
      return reply.status(401).send({ success: false, error: 'Invalid email or password' });
    }

    const valid = await verifyPassword(password, user.hashedPassword);
    if (!valid) {
      return reply.status(401).send({ success: false, error: 'Invalid email or password' });
    }

    const accessToken = fastify.jwt.sign({ userId: user.id, email: user.email });
    const refreshToken = fastify.jwt.sign(
      { userId: user.id, email: user.email },
      { expiresIn: config.jwt.refreshExpiry },
    );

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    reply.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return {
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, planTier: user.planTier },
        accessToken,
      },
    };
  });

  fastify.post('/api/v1/auth/oauth', async (request, reply) => {
    const parsed = oauthSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' });
    }

    const { email, name, avatarUrl } = parsed.data;

    let user: { id: string; email: string; name: string | null; planTier: string };
    try {
      const result = await findOrCreateOAuthUser(email, name, avatarUrl);
      if (!result) {
        return reply.status(500).send({ success: false, error: 'Failed to sync OAuth user.' });
      }
      user = result;
    } catch (err) {
      request.log.error({ err }, 'Failed to sync OAuth user');
      return reply.status(500).send({ success: false, error: 'Failed to sync OAuth account.' });
    }

    const accessToken = fastify.jwt.sign({ userId: user.id, email: user.email });
    const refreshToken = fastify.jwt.sign(
      { userId: user.id, email: user.email },
      { expiresIn: config.jwt.refreshExpiry },
    );

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    reply.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return {
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, planTier: user.planTier },
        accessToken,
      },
    };
  });

  fastify.post('/api/v1/auth/refresh', async (request, reply) => {
    const token = request.cookies.refreshToken;
    if (!token) {
      return reply.status(401).send({ success: false, error: 'Refresh token missing' });
    }

    try {
      const payload = fastify.jwt.verify(token);
      const user = await findUserById(payload.userId);
      if (!user) {
        return reply.status(401).send({ success: false, error: 'User not found' });
      }

      const accessToken = fastify.jwt.sign({ userId: user.id, email: user.email });

      reply.setCookie('accessToken', accessToken, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });

      return {
        success: true,
        data: {
          user: { id: user.id, email: user.email, name: user.name, planTier: user.planTier },
          accessToken,
        },
      };
    } catch {
      return reply.status(401).send({ success: false, error: 'Invalid or expired refresh token' });
    }
  });

  fastify.post('/api/v1/auth/logout', async (_request, reply) => {
    reply.clearCookie('refreshToken', {
      path: '/',
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
    });
    reply.clearCookie('accessToken', {
      path: '/',
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
    });
    return { success: true, data: null };
  });
}
