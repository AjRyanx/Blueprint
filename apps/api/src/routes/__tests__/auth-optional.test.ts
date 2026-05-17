import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import Fastify from 'fastify';
import { chatRoutes } from '../chat.js';
import { securityRoutes } from '../security.js';
import { architectureRoutes } from '../architecture.js';
import { tasksRoutes } from '../tasks.js';
import { db } from '../../db/index.js';
import { Orchestrator, SecurityAgent } from '@blueprint/ai-engine';

describe('auth-optional.test.ts — Optional Authentication Integration Tests', () => {
  let app: any;
  const originalSelect = db.select;
  const originalInsert = db.insert;
  const originalUpdate = db.update;
  const originalDelete = db.delete;
  const originalGenerateProjectBrief = Orchestrator.prototype.generateProjectBrief;
  const originalGenerateSecurityChecklist = Orchestrator.prototype.generateSecurityChecklist;
  const originalGenerateArchitecture = Orchestrator.prototype.generateArchitecture;

  beforeEach(async () => {
    app = Fastify();
    app.decorate('authenticate', async (request: any) => {
      request.user = { userId: 'test-user-id', email: 'test@example.com' };
    });
    // Register routing handlers
    await app.register(chatRoutes);
    await app.register(securityRoutes);
    await app.register(architectureRoutes);
    await app.register(tasksRoutes);
  });

  afterEach(() => {
    db.select = originalSelect;
    db.insert = originalInsert;
    db.update = originalUpdate;
    db.delete = originalDelete;
    Orchestrator.prototype.generateProjectBrief = originalGenerateProjectBrief;
    Orchestrator.prototype.generateSecurityChecklist = originalGenerateSecurityChecklist;
    Orchestrator.prototype.generateArchitecture = originalGenerateArchitecture;
  });

  test('Synthesis successfully extracts needsAuth from LLM response', async () => {
    db.select = (() => ({
      from: (table: any) => ({
        where: async () => {
          const keys = Object.keys(table || {});
          if (keys.includes('currentPhase')) {
            return [{ id: 'proj-1', userId: 'test-user-id', name: 'Test Proj', currentPhase: 1 }];
          }
          return [];
        }
      })
    })) as any;

    let savedBrief: any;
    db.insert = (() => ({
      values: (values: any) => {
        savedBrief = values;
        return {
          returning: async () => [values]
        };
      }
    })) as any;

    db.update = (() => ({
      set: () => ({
        where: () => ({
          returning: async () => []
        })
      })
    })) as any;

    Orchestrator.prototype.generateProjectBrief = async function() {
      return JSON.stringify({
        projectName: 'Auth Free App',
        oneLineDescription: 'Just a public wiki',
        problemStatement: 'None',
        targetUsers: 'All',
        coreValueProposition: 'Info',
        outOfScope: [],
        successMetrics: [],
        needsDatabase: false,
        needsServer: false,
        needsAuth: false
      });
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-1/intake/synthesize',
      payload: { conversation: [] }
    });

    assert.strictEqual(response.statusCode, 200);
    const parsed = JSON.parse(response.payload);
    assert.strictEqual(parsed.success, true);
    assert.strictEqual(savedBrief.needsAuth, false);
  });

  test('Architecture generation updates projects table with needsAuth', async () => {
    db.select = (() => ({
      from: (table: any) => ({
        where: async () => {
          const keys = Object.keys(table || {});
          if (keys.includes('currentPhase')) {
            return [{ id: 'proj-2', userId: 'test-user-id', targetPlatform: 'web' }];
          }
          if (keys.includes('oneLineDescription')) {
            return [{ id: 'brief-2', projectId: 'proj-2', needsAuth: false }];
          }
          return [];
        }
      })
    })) as any;

    let projectUpdates: any;
    db.update = (() => ({
      set: (updates: any) => {
        projectUpdates = updates;
        return {
          where: () => ({
            returning: async () => []
          })
        };
      }
    })) as any;

    db.insert = (() => ({
      values: () => ({
        returning: async () => [{ id: 'design-1' }]
      })
    })) as any;

    Orchestrator.prototype.generateArchitecture = async function(
      brief: string,
      stories: any[],
      needsDatabaseHint?: boolean | null,
      needsServerHint?: boolean | null,
      targetPlatform?: string,
      needsAuthHint?: boolean | null
    ) {
      return JSON.stringify({
        overview: 'No auth architecture',
        techStack: [],
        patterns: [],
        decisions: [],
        constraints: [],
        qualityAttributes: [],
        diagrams: '',
        needsDatabase: false,
        needsServer: false,
        needsAuth: false
      });
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-2/architecture/generate'
    });

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(projectUpdates.needsAuth, false);
  });

  test('Security generate Checklist independently resolves AUTH_CHECKLIST and SERVER_CHECKLIST', async () => {
    db.select = (() => ({
      from: (table: any) => ({
        where: async () => {
          const keys = Object.keys(table || {});
          if (keys.includes('currentPhase')) {
            return [{ id: 'proj-3', userId: 'test-user-id', needsDatabase: false, needsServer: false, needsAuth: true, targetPlatform: 'web' }];
          }
          return [];
        }
      })
    })) as any;

    db.insert = (() => ({
      values: (values: any) => {
        return {
          returning: async () => [values]
        };
      }
    })) as any;

    const agent = new SecurityAgent({
      generate: async () => JSON.stringify({ threats: [], additionalChecklistItems: [] })
    } as any);

    // Case 1: needsServer=false, needsAuth=true
    const res1 = await agent.generateChecklist('brief', 'reqs', false, false, 'web', true);
    const ids1 = res1.checklist.map((item: any) => item.id);
    assert.ok(ids1.includes('auth-jwt'));
    assert.ok(!ids1.includes('val-server'));

    // Case 2: needsServer=true, needsAuth=false
    const res2 = await agent.generateChecklist('brief', 'reqs', true, true, 'web', false);
    const ids2 = res2.checklist.map((item: any) => item.id);
    assert.ok(!ids2.includes('auth-jwt'));
    assert.ok(ids2.includes('val-server'));
  });

  test('Tasks generation: respects needsAuth=false and injects non-auth instruction into developer prompts', async () => {
    db.select = (() => ({
      from: (table: any) => ({
        where: async () => {
          const keys = Object.keys(table || {});
          if (keys.includes('currentPhase')) {
            return [{ id: 'proj-4', userId: 'test-user-id', needsDatabase: false, needsServer: false, needsAuth: false, targetPlatform: 'web' }];
          }
          if (keys.includes('oneLineDescription')) {
            return [{ id: 'brief-4', projectId: 'proj-4' }];
          }
          if (keys.includes('userStory')) {
            return [{ id: 'req-2', projectId: 'proj-4', actor: 'User', action: 'browse catalog', benefit: 'see products', priority: 'must' }];
          }
          return [];
        }
      })
    })) as any;

    db.delete = (() => ({
      where: async () => {}
    })) as any;

    const insertedTasks: any[] = [];
    db.insert = (() => ({
      values: (values: any) => {
        insertedTasks.push(values);
        return {
          returning: async () => [values]
        };
      }
    })) as any;

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/proj-4/tasks/generate'
    });

    assert.strictEqual(response.statusCode, 200);
    assert.ok(insertedTasks.length > 0);
    assert.ok(insertedTasks[0].promptText.includes('This project does NOT require user accounts or authentication. Do NOT generate any login forms, session management, NextAuth configs, custom auth routes, or JWT utilities.'));
  });
});
