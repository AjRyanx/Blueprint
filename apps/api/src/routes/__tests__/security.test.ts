import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import Fastify from 'fastify';
import { securityRoutes } from '../security.js';
import { db } from '../../db/index.js';
import { Orchestrator } from '@blueprint/ai-engine';

describe('security.ts — dynamic security checklist generation', () => {
  let app: any;
  const originalSelect = db.select;
  const originalInsert = db.insert;
  const originalUpdate = db.update;
  const originalGenerateSecurityChecklist = Orchestrator.prototype.generateSecurityChecklist;

  beforeEach(async () => {
    app = Fastify();
    // Mock authenticate plugin decorator
    app.decorate('authenticate', async (request: any) => {
      request.user = { userId: 'test-user-id', email: 'test@example.com' };
    });
    // Register the routes
    await app.register(securityRoutes);
  });

  afterEach(() => {
    db.select = originalSelect;
    db.insert = originalInsert;
    db.update = originalUpdate;
    Orchestrator.prototype.generateSecurityChecklist = originalGenerateSecurityChecklist;
  });

  test('passes needsDatabase=true and needsServer=true when both are true on project', async () => {
    // arrange
    db.select = (() => ({
      from: (table: any) => ({
        where: async () => {
          const keys = Object.keys(table || {});
          if (keys.includes('currentPhase')) {
            return [{ id: 'project-1', userId: 'test-user-id', needsDatabase: true, needsServer: true }];
          }
          if (keys.includes('oneLineDescription')) {
            return [{ id: 'brief-1', projectId: 'project-1', needsDatabase: true, needsServer: true }];
          }
          return [];
        }
      })
    })) as any;

    db.insert = (() => ({
      values: () => ({
        returning: async () => [{ id: 'checklist-1', threats: [], checklist: [] }]
      })
    })) as any;

    let passedDatabase: boolean | undefined;
    let passedServer: boolean | undefined;

    Orchestrator.prototype.generateSecurityChecklist = async function(
      brief: string,
      requirements: string,
      needsDatabase?: boolean,
      needsServer?: boolean
    ) {
      passedDatabase = needsDatabase;
      passedServer = needsServer;
      return { threats: [], checklist: [] };
    };

    // act
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/project-1/security/generate'
    });

    // assert
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(passedDatabase, true);
    assert.strictEqual(passedServer, true);
  });

  test('passes needsDatabase=false and needsServer=false when both are false on project', async () => {
    // arrange
    db.select = (() => ({
      from: (table: any) => ({
        where: async () => {
          const keys = Object.keys(table || {});
          if (keys.includes('currentPhase')) {
            return [{ id: 'project-2', userId: 'test-user-id', needsDatabase: false, needsServer: false }];
          }
          if (keys.includes('oneLineDescription')) {
            return [{ id: 'brief-2', projectId: 'project-2', needsDatabase: false, needsServer: false }];
          }
          return [];
        }
      })
    })) as any;

    db.insert = (() => ({
      values: () => ({
        returning: async () => [{ id: 'checklist-2', threats: [], checklist: [] }]
      })
    })) as any;

    let passedDatabase: boolean | undefined;
    let passedServer: boolean | undefined;

    Orchestrator.prototype.generateSecurityChecklist = async function(
      brief: string,
      requirements: string,
      needsDatabase?: boolean,
      needsServer?: boolean
    ) {
      passedDatabase = needsDatabase;
      passedServer = needsServer;
      return { threats: [], checklist: [] };
    };

    // act
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/project-2/security/generate'
    });

    // assert
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(passedDatabase, false);
    assert.strictEqual(passedServer, false);
  });

  test('passes needsDatabase=false and needsServer=true for server without database on project', async () => {
    // arrange
    db.select = (() => ({
      from: (table: any) => ({
        where: async () => {
          const keys = Object.keys(table || {});
          if (keys.includes('currentPhase')) {
            return [{ id: 'project-3', userId: 'test-user-id', needsDatabase: false, needsServer: true }];
          }
          if (keys.includes('oneLineDescription')) {
            return [{ id: 'brief-3', projectId: 'project-3', needsDatabase: false, needsServer: true }];
          }
          return [];
        }
      })
    })) as any;

    db.insert = (() => ({
      values: () => ({
        returning: async () => [{ id: 'checklist-3', threats: [], checklist: [] }]
      })
    })) as any;

    let passedDatabase: boolean | undefined;
    let passedServer: boolean | undefined;

    Orchestrator.prototype.generateSecurityChecklist = async function(
      brief: string,
      requirements: string,
      needsDatabase?: boolean,
      needsServer?: boolean
    ) {
      passedDatabase = needsDatabase;
      passedServer = needsServer;
      return { threats: [], checklist: [] };
    };

    // act
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/project-3/security/generate'
    });

    // assert
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(passedDatabase, false);
    assert.strictEqual(passedServer, true);
  });
});
