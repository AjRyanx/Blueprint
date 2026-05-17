import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { projects } from '../db/schema/projects.js';
import { eq } from 'drizzle-orm';
import { GeminiClient, GroqClient, Orchestrator } from '@blueprint/ai-engine';
import { getProjectBrief, saveProjectBrief, advancePhase } from '../services/intake-service.js';

function stripReasoning(text: string): string {
  const matches = text.match(/<output>([\s\S]*?)<\/output>/gi);
  if (matches && matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    if (!lastMatch) return text.trim();
    
    let content = lastMatch.replace(/<\/?output>/gi, '').trim();
    for (const divisor of [4, 3, 2]) {
      if (content.length % divisor === 0) {
        const chunkLen = Math.floor(content.length / divisor);
        const firstChunk = content.slice(0, chunkLen).trim();
        const chunks: string[] = [];
        for (let i = 0; i < divisor; i++) {
          chunks.push(content.slice(i * chunkLen, (i + 1) * chunkLen).trim());
        }
        if (chunks.every(c => c === firstChunk && c.length > 10)) {
          return firstChunk;
        }
      }
    }
    return content;
  }
  const lastOpen = text.lastIndexOf('<output>');
  if (lastOpen !== -1) {
    return text.slice(lastOpen + 8).trim();
  }
  const quoteMatch = text.match(/"([^"]{20,})"/);
  if (quoteMatch && quoteMatch[1]) {
    const content = quoteMatch[1].trim();
    if (content.length > 15) return content;
  }
  const lines = text.split('\n');
  const nonBulletLines = lines.filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('-') && l.trim().length > 0);
  return nonBulletLines.length > 0 ? nonBulletLines.join(' ').trim() : text.trim();
}

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  const geminiClient = new GeminiClient({
    apiKey: process.env.GEMINI_API_KEY!,
    model: process.env.GEMINI_MODEL ?? 'gemma-4-26b-a4b-it',
  });
  const groqClient = new GroqClient({
    apiKey: process.env.GROQ_API_KEY!,
    model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
  });
  const orchestrator = new Orchestrator(geminiClient, groqClient);

  fastify.post('/api/v1/projects/:id/chat', async (request, reply) => {
    request.log.info({ headers: request.headers }, 'Incoming Chat Request Headers');
    const { id } = request.params as { id: string };
    const { userId } = request.user;
    const { message } = request.body as { message: string };

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    const history = (request.body as any).history ?? [];

    reply.hijack();

    const corsHeaders = reply.getHeaders();
    for (const [key, value] of Object.entries(corsHeaders)) {
      if (value !== undefined) {
        reply.raw.setHeader(key, value as string | number | readonly string[]);
      }
    }
    
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders();

    try {
      await orchestrator.processPhase1Intake(
        message,
        history,
        (token: string) => {
          try {
            reply.raw.write(`data: ${JSON.stringify({ token })}\n\n`);
          } catch {}
        },
      );

      reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err) {
      request.log.error({ err }, 'Chat processing failed');
      try {
        reply.raw.write(
          `data: ${JSON.stringify({ error: 'Failed to process message' })}\n\n`,
        );
      } catch {}
    }

    reply.raw.end();
  });

  fastify.post('/api/v1/projects/:id/intake/synthesize', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user;
    const { conversation } = request.body as { conversation: { role: string; content: string }[] };

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Project not found' });
    }

    try {
      let briefJson = await orchestrator.generateProjectBrief(conversation);
      briefJson = briefJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

      let raw: any;
      const firstBrace = briefJson.indexOf('{');
      if (firstBrace !== -1) {
        let depth = 0;
        let start = firstBrace;
        let end = -1;
        for (let i = start; i < briefJson.length; i++) {
          if (briefJson[i] === '{') depth++;
          else if (briefJson[i] === '}') {
            depth--;
            if (depth === 0) { end = i + 1; break; }
          }
        }
        if (end !== -1) {
          raw = JSON.parse(briefJson.slice(start, end));
        } else {
          raw = JSON.parse(briefJson.slice(firstBrace));
        }
      } else {
        raw = JSON.parse(briefJson);
      }

      const brief = {
        projectName: raw.projectName ?? project.name,
        oneLineDescription: raw.oneLineDescription ?? '',
        problemStatement: raw.problemStatement ?? '',
        targetUsers: raw.targetUsers ?? '',
        coreValueProposition: raw.coreValueProposition ?? '',
        outOfScope: Array.isArray(raw.outOfScope) ? raw.outOfScope : [],
        successMetrics: Array.isArray(raw.successMetrics) ? raw.successMetrics : [],
        needsDatabase:
          raw.needsDatabase === true ? true :
          raw.needsDatabase === false ? false :
          null,
        needsServer:
          raw.needsServer === true ? true :
          raw.needsServer === false ? false :
          null,
        needsAuth:
          raw.needsAuth === true ? true :
          raw.needsAuth === false ? false :
          null,
      };

      const saved = await saveProjectBrief(id, brief);
      await advancePhase(id, 2);

      return { success: true, data: saved };
    } catch (err) {
      request.log.error({ err }, 'Failed to synthesize brief');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ success: false, error: `Failed to synthesize brief: ${message}` });
    }
  });
}
