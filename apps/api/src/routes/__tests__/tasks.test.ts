import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import Fastify from 'fastify';
import { tasksRoutes } from '../tasks.js';
import { db } from '../../db/index.js';
import { assembleRoleAndContext } from '@blueprint/ai-engine';

describe('tasks.ts — task role and framework resolution', () => {
  let app: any;
  const originalSelect = db.select;
  const originalInsert = db.insert;
  const originalDelete = db.delete;

  beforeEach(async () => {
    app = Fastify();
    // Mock authenticate plugin decorator
    app.decorate('authenticate', async (request: any) => {
      request.user = { userId: 'test-user-id', email: 'test@example.com' };
    });
    // Register the routes
    await app.register(tasksRoutes);
  });

  afterEach(() => {
    db.select = originalSelect;
    db.insert = originalInsert;
    db.delete = originalDelete;
  });

  // Unit tests for prompt generator cases
  describe('assembleRoleAndContext helper', () => {
    test('uses frontend framework as role when needsServer is false', () => {
      // arrange
      const brief = { projectName: 'Static App', oneLineDescription: 'desc' } as any;
      const stack = { frontend: 'Vue.js', backend: 'Node.js' };

      // act
      const { role } = assembleRoleAndContext(brief, stack, false);

      // assert: Should extract Vue.js instead of Node.js backend
      assert.match(role, /Vue\.js/);
    });

    test("falls back to 'React' when needsServer is false and no frontend framework is in the stack", () => {
      // arrange
      const brief = { projectName: 'Static App', oneLineDescription: 'desc' } as any;
      const stack = {}; // empty tech stack

      // act
      const { role } = assembleRoleAndContext(brief, stack, false);

      // assert: Should fallback to React
      assert.match(role, /React/);
    });
  });

  // Integration tests for routes
  describe('POST /api/v1/projects/:id/tasks/generate endpoint', () => {
    test('resolves framework from Phase 3 techStack and builds setup task successfully', async () => {
      // arrange: mock project with needsServer = false
      db.select = (() => ({
        from: (table: any) => ({
          where: async () => {
            const keys = Object.keys(table || {});
            if (keys.includes('currentPhase')) {
              // project record
              return [{ id: 'project-123', userId: 'test-user-id', needsDatabase: false, needsServer: false }];
            }
            if (keys.includes('oneLineDescription')) {
              // project brief
              return [{ id: 'brief-123', projectId: 'project-123', projectName: 'My App', needsDatabase: false, needsServer: false }];
            }
            if (keys.includes('userStory')) {
              // prioritised requirements list
              return [{ id: 'req-1', projectId: 'project-123', userStory: 'Story 1', action: 'Create profile', priority: 'must' }];
            }
            if (keys.includes('techStack')) {
              // architecture design with a frontend category containing Svelte
              return [{
                id: 'arch-123',
                projectId: 'project-123',
                techStack: [
                  { category: 'Frontend', items: [{ name: 'Svelte', version: '4.0', notes: '' }] }
                ]
              }];
            }
            return []; // dataModels, securityChecklists empty
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

      // act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/projects/project-123/tasks/generate'
      });

      // assert
      assert.strictEqual(response.statusCode, 200);
      
      // Foundational static setup task exists and references Svelte framework
      const setupTask = insertedTasks.find(t => t.title === 'Static Frontend Setup');
      assert.ok(setupTask);
      assert.match(setupTask.objective, /Svelte/);

      // Verify prompt text includes Svelte role developer context
      assert.match(setupTask.promptText, /Svelte developer/);
    });
  });
});
