import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import Fastify from 'fastify';
import { phaseRoutes } from '../phases.js';
import { db } from '../../db/index.js';

describe('phases.ts — auto-skip Phase 4', () => {
  let app: any;
  const originalSelect = db.select;
  const originalUpdate = db.update;

  beforeEach(async () => {
    app = Fastify();
    // Mock authenticate plugin decorator
    app.decorate('authenticate', async (request: any) => {
      request.user = { userId: 'test-user-id', email: 'test@example.com' };
    });
    // Register the routes
    await app.register(phaseRoutes);
  });

  afterEach(() => {
    db.select = originalSelect;
    db.update = originalUpdate;
  });

  test('skips Phase 4 and activates Phase 5 when needsDatabase is false', async () => {
    // arrange: project with needsDatabase = false
    db.select = (() => ({
      from: () => ({
        where: async () => [
          { id: 'project-1', userId: 'test-user-id', currentPhase: 3, needsDatabase: false }
        ]
      })
    })) as any;

    let targetPhaseSet: number | null = null;
    db.update = ((table: any) => ({
      set: (values: any) => {
        targetPhaseSet = values.currentPhase;
        return {
          where: () => ({
            returning: async () => [
              { id: 'project-1', userId: 'test-user-id', currentPhase: targetPhaseSet, needsDatabase: false }
            ]
          })
        };
      }
    })) as any;

    // act: PATCH /api/v1/projects/project-1/phase { toPhase: 4 }
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/projects/project-1/phase',
      payload: { toPhase: 4 }
    });

    // assert
    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.nextPhase, 5);
    assert.strictEqual(body.phase4, 'skipped');
    assert.strictEqual(targetPhaseSet, 5); // targetPhase was redirected to 5
  });

  test('does NOT skip Phase 4 when needsDatabase is true', async () => {
    // arrange: project with needsDatabase = true
    db.select = (() => ({
      from: () => ({
        where: async () => [
          { id: 'project-2', userId: 'test-user-id', currentPhase: 3, needsDatabase: true }
        ]
      })
    })) as any;

    let targetPhaseSet: number | null = null;
    db.update = ((table: any) => ({
      set: (values: any) => {
        targetPhaseSet = values.currentPhase;
        return {
          where: () => ({
            returning: async () => [
              { id: 'project-2', userId: 'test-user-id', currentPhase: targetPhaseSet, needsDatabase: true }
            ]
          })
        };
      }
    })) as any;

    // act: PATCH /api/v1/projects/project-2/phase { toPhase: 4 }
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/projects/project-2/phase',
      payload: { toPhase: 4 }
    });

    // assert
    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.nextPhase, 4);
    assert.strictEqual(body.phase4, undefined);
    assert.strictEqual(targetPhaseSet, 4); // targetPhase remained 4
  });

  test('GET /api/v1/projects/:id/phases returns correct statuses (skipped for Phase 4)', async () => {
    // arrange: project with needsDatabase = false
    db.select = (() => ({
      from: () => ({
        where: async () => [
          { id: 'project-1', userId: 'test-user-id', currentPhase: 5, needsDatabase: false }
        ]
      })
    })) as any;

    // act: GET /api/v1/projects/project-1/phases
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/project-1/phases'
    });

    // assert
    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.success, true);
    
    // Check Phase 4 is skipped and Phase 5 is active
    const p4 = body.data.find((p: any) => p.phase === 4);
    const p5 = body.data.find((p: any) => p.phase === 5);
    
    assert.strictEqual(p4.status, 'skipped');
    assert.strictEqual(p5.status, 'active');
  });
});
