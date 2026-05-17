import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import Fastify from 'fastify';
import { securityRoutes } from '../security.js';
import { architectureRoutes } from '../architecture.js';
import { tasksRoutes } from '../tasks.js';
import { db } from '../../db/index.js';
import { Orchestrator, GeminiClient, GroqClient, generateAcceptanceCriteria, buildPrompt, IntakeAgent } from '@blueprint/ai-engine';

describe('platform.test.ts — CLI & Web platform isolation boundaries', () => {
  let app: any;
  const originalSelect = db.select;
  const originalInsert = db.insert;
  const originalUpdate = db.update;
  const originalDelete = db.delete;
  const originalGenerateSecurityChecklist = Orchestrator.prototype.generateSecurityChecklist;
  const originalGenerateArchitecture = Orchestrator.prototype.generateArchitecture;
  const originalGeminiGenerate = GeminiClient.prototype.generate;
  const originalGroqGenerate = GroqClient.prototype.generate;

  beforeEach(async () => {
    app = Fastify();
    app.decorate('authenticate', async (request: any) => {
      request.user = { userId: 'test-user-id', email: 'test@example.com' };
    });
    // Register routing handlers
    await app.register(securityRoutes);
    await app.register(architectureRoutes);
    await app.register(tasksRoutes);
  });

  afterEach(() => {
    db.select = originalSelect;
    db.insert = originalInsert;
    db.update = originalUpdate;
    db.delete = originalDelete;
    Orchestrator.prototype.generateSecurityChecklist = originalGenerateSecurityChecklist;
    Orchestrator.prototype.generateArchitecture = originalGenerateArchitecture;
    GeminiClient.prototype.generate = originalGeminiGenerate;
    GroqClient.prototype.generate = originalGroqGenerate;
  });

  test('Security Checklist: Returns CLI specific checks and excludes browser policies for cli platform projects', async () => {
    db.select = (() => ({
      from: (table: any) => ({
        where: async () => {
          const keys = Object.keys(table || {});
          if (keys.includes('currentPhase')) {
            return [{ id: 'project-cli', userId: 'test-user-id', needsDatabase: false, needsServer: false, targetPlatform: 'cli' }];
          }
          if (keys.includes('oneLineDescription')) {
            return [{ id: 'brief-cli', projectId: 'project-cli', needsDatabase: false, needsServer: false, targetPlatform: 'cli' }];
          }
          return [];
        }
      })
    })) as any;

    db.insert = (() => ({
      values: (values: any) => ({
        returning: async () => [{ id: 'checklist-cli', threats: values.threats, checklist: values.checklist }]
      })
    })) as any;

    let passedPlatform: string | undefined;

    Orchestrator.prototype.generateSecurityChecklist = async function(
      brief: string,
      requirements: string,
      needsDatabase?: boolean,
      needsServer?: boolean,
      targetPlatform?: string
    ) {
      passedPlatform = targetPlatform;
      return {
        threats: [{ category: 'Injection', threat: 'Argument Injection', mitigation: 'Sanitise args' }],
        checklist: [
          { id: 'ops-secrets', category: 'Secrets Management', title: 'No hardcoded credentials', description: '', required: true },
          { id: 'cli-arg-injection', category: 'Input Security', title: 'Argument injection prevention', description: '', required: true }
        ]
      };
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/project-cli/security/generate'
    });

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(passedPlatform, 'cli');
    
    const parsed = JSON.parse(response.payload);
    assert.strictEqual(parsed.success, true);
    
    const ids = parsed.data.checklist.map((item: any) => item.id);
    assert.ok(ids.includes('cli-arg-injection'));
    assert.ok(!ids.includes('ops-https')); // web only
    assert.ok(!ids.includes('sec-csp'));  // web only
  });

  test('Architecture Generation: passes cli targetPlatform parameter to Orchestrator', async () => {
    db.select = (() => ({
      from: (table: any) => ({
        where: async () => {
          const keys = Object.keys(table || {});
          if (keys.includes('currentPhase')) {
            return [{ id: 'project-arch-cli', userId: 'test-user-id', needsDatabase: false, needsServer: false, targetPlatform: 'cli' }];
          }
          if (keys.includes('oneLineDescription')) {
            return [{ id: 'brief-arch-cli', projectId: 'project-arch-cli', needsDatabase: false, needsServer: false, targetPlatform: 'cli' }];
          }
          return [];
        }
      })
    })) as any;

    db.insert = (() => ({
      values: () => ({
        returning: async () => [{ id: 'design-cli', overview: 'CLI tool architecture' }]
      })
    })) as any;

    db.update = (() => ({
      set: () => ({
        where: () => ({
          returning: async () => [{ id: 'design-cli', overview: 'CLI tool architecture' }]
        })
      })
    })) as any;

    let passedPlatform: string | undefined;

    Orchestrator.prototype.generateArchitecture = async function(
      brief: string,
      stories: any[],
      needsDatabaseHint?: boolean | null,
      needsServerHint?: boolean | null,
      targetPlatform?: string
    ) {
      passedPlatform = targetPlatform;
      return JSON.stringify({
        overview: 'CLI tool',
        techStack: [{ category: 'CLI Framework', items: [{ name: 'yargs', version: '17.0.0', notes: '' }] }],
        patterns: [],
        decisions: [],
        constraints: [],
        qualityAttributes: [],
        diagrams: '',
        needsDatabase: false,
        needsServer: false
      });
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/project-arch-cli/architecture/generate'
    });

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(passedPlatform, 'cli');
  });

  test('Tasks Generation: Generates only CLI Tool Setup system task for cli projects', async () => {
    db.select = (() => ({
      from: (table: any) => ({
        where: async () => {
          const keys = Object.keys(table || {});
          if (keys.includes('currentPhase')) {
            return [{ id: 'project-task-cli', userId: 'test-user-id', needsDatabase: false, needsServer: false, targetPlatform: 'cli' }];
          }
          if (keys.includes('oneLineDescription')) {
            return [{ id: 'brief-task-cli', projectId: 'project-task-cli', needsDatabase: false, needsServer: false, targetPlatform: 'cli' }];
          }
          if (keys.includes('userStory')) {
            // Requirements mock
            return [{ id: 'req-1', projectId: 'project-task-cli', actor: 'User', action: 'run CLI tool', benefit: 'get results', priority: 'must' }];
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
      url: '/api/v1/projects/project-task-cli/tasks/generate'
    });

    assert.strictEqual(response.statusCode, 200);
    
    // Check that we generated one foundational system task: 'CLI Tool Setup'
    const systemFoundations = insertedTasks.filter(t => t.requirementId === null);
    assert.strictEqual(systemFoundations.length, 1);
    assert.strictEqual(systemFoundations[0].title, 'CLI Tool Setup');
    assert.ok(systemFoundations[0].promptText.includes('You are a senior CLI developer'));

    // Check that the requirement task uses CLI-appropriate criteria
    const reqTasks = insertedTasks.filter(t => t.requirementId === 'req-1');
    assert.strictEqual(reqTasks.length, 1);
    assert.ok(reqTasks[0].acceptanceCriteria.includes('Verify the command exits with code 0 on success and a non-zero code on failure'));
  });

  test('Security Checklist: Returns self-hosted specific checks for self-hosted deploymentModel', async () => {
    GeminiClient.prototype.generate = async () => JSON.stringify({ threats: [], additionalChecklistItems: [] });
    GroqClient.prototype.generate = async () => JSON.stringify({ threats: [], additionalChecklistItems: [] });

    db.select = (() => ({
      from: (table: any) => ({
        where: async () => {
          const keys = Object.keys(table || {});
          if (keys.includes('currentPhase')) {
            return [{ id: 'project-self-hosted', userId: 'test-user-id', needsDatabase: true, needsServer: true, targetPlatform: 'web', deploymentModel: 'self-hosted' }];
          }
          if (keys.includes('oneLineDescription')) {
            return [{ id: 'brief-self-hosted', projectId: 'project-self-hosted', needsDatabase: true, needsServer: true, targetPlatform: 'web' }];
          }
          return [];
        }
      })
    })) as any;

    db.insert = (() => ({
      values: (values: any) => ({
        returning: async () => [{ id: 'checklist-self-hosted', threats: values.threats, checklist: values.checklist }]
      })
    })) as any;

    db.update = (() => ({
      set: (values: any) => ({
        where: () => ({
          returning: async () => [{ id: 'checklist-self-hosted', threats: values.threats, checklist: values.checklist }]
        })
      })
    })) as any;

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/project-self-hosted/security/generate'
    });

    assert.strictEqual(response.statusCode, 200);
    const parsed = JSON.parse(response.payload);
    assert.strictEqual(parsed.success, true);
    
    const ids = parsed.data.checklist.map((item: any) => item.id);
    assert.ok(ids.includes('sec-network')); // self-hosted specific
    assert.ok(ids.includes('sec-backup'));  // self-hosted specific
    assert.ok(ids.includes('sec-vpn'));     // self-hosted specific
    assert.ok(ids.includes('sec-logs'));    // self-hosted specific
    assert.ok(!ids.includes('ops-https'));  // cloud specific (moved from web)
    assert.ok(!ids.includes('sec-csp'));   // cloud specific (moved from web)
  });

  test('Security Checklist: Returns local specific checks for local deploymentModel', async () => {
    GeminiClient.prototype.generate = async () => JSON.stringify({ threats: [], additionalChecklistItems: [] });
    GroqClient.prototype.generate = async () => JSON.stringify({ threats: [], additionalChecklistItems: [] });

    db.select = (() => ({
      from: (table: any) => ({
        where: async () => {
          const keys = Object.keys(table || {});
          if (keys.includes('currentPhase')) {
            return [{ id: 'project-local', userId: 'test-user-id', needsDatabase: true, needsServer: true, targetPlatform: 'web', deploymentModel: 'local' }];
          }
          if (keys.includes('oneLineDescription')) {
            return [{ id: 'brief-local', projectId: 'project-local', needsDatabase: true, needsServer: true, targetPlatform: 'web' }];
          }
          return [];
        }
      })
    })) as any;

    db.insert = (() => ({
      values: (values: any) => ({
        returning: async () => [{ id: 'checklist-local', threats: values.threats, checklist: values.checklist }]
      })
    })) as any;

    db.update = (() => ({
      set: (values: any) => ({
        where: () => ({
          returning: async () => [{ id: 'checklist-local', threats: values.threats, checklist: values.checklist }]
        })
      })
    })) as any;

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/project-local/security/generate'
    });

    assert.strictEqual(response.statusCode, 200);
    const parsed = JSON.parse(response.payload);
    assert.strictEqual(parsed.success, true);
    
    const ids = parsed.data.checklist.map((item: any) => item.id);
    assert.ok(ids.includes('sec-local-fs'));        // local specific
    assert.ok(ids.includes('sec-local-isolation')); // local specific
    assert.ok(ids.includes('sec-local-surface'));   // local specific
    assert.ok(ids.includes('sec-local-update'));    // local specific
    assert.ok(!ids.includes('ops-https'));         // cloud specific
    assert.ok(!ids.includes('sec-csp'));          // cloud specific
  });

  test('Security Checklist: Falls back to cloud specific checks for legacy (null) deploymentModel', async () => {
    GeminiClient.prototype.generate = async () => JSON.stringify({ threats: [], additionalChecklistItems: [] });
    GroqClient.prototype.generate = async () => JSON.stringify({ threats: [], additionalChecklistItems: [] });

    db.select = (() => ({
      from: (table: any) => ({
        where: async () => {
          const keys = Object.keys(table || {});
          if (keys.includes('currentPhase')) {
            return [{ id: 'project-legacy', userId: 'test-user-id', needsDatabase: true, needsServer: true, targetPlatform: 'web', deploymentModel: null }];
          }
          if (keys.includes('oneLineDescription')) {
            return [{ id: 'brief-legacy', projectId: 'project-legacy', needsDatabase: true, needsServer: true, targetPlatform: 'web' }];
          }
          return [];
        }
      })
    })) as any;

    db.insert = (() => ({
      values: (values: any) => ({
        returning: async () => [{ id: 'checklist-legacy', threats: values.threats, checklist: values.checklist }]
      })
    })) as any;

    db.update = (() => ({
      set: (values: any) => ({
        where: () => ({
          returning: async () => [{ id: 'checklist-legacy', threats: values.threats, checklist: values.checklist }]
        })
      })
    })) as any;

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/project-legacy/security/generate'
    });

    assert.strictEqual(response.statusCode, 200);
    const parsed = JSON.parse(response.payload);
    assert.strictEqual(parsed.success, true);
    
    const ids = parsed.data.checklist.map((item: any) => item.id);
    assert.ok(ids.includes('ops-https')); // legacy defaults to cloud!
    assert.ok(ids.includes('sec-csp'));   // legacy defaults to cloud!
    assert.ok(!ids.includes('sec-network')); // no self-hosted specific
    assert.ok(!ids.includes('sec-local-fs')); // no local specific
  });

  test('Tasks Generation: Generates self-hosted setup foundational task', async () => {
    db.select = (() => ({
      from: (table: any) => ({
        where: async () => {
          const keys = Object.keys(table || {});
          if (keys.includes('currentPhase')) {
            return [{ id: 'project-self-hosted-task', userId: 'test-user-id', needsDatabase: true, needsServer: true, targetPlatform: 'web', deploymentModel: 'self-hosted' }];
          }
          if (keys.includes('oneLineDescription')) {
            return [{ id: 'brief-self-hosted-task', projectId: 'project-self-hosted-task', needsDatabase: true, needsServer: true, targetPlatform: 'web' }];
          }
          if (keys.includes('userStory')) {
            return [{ id: 'req-1', projectId: 'project-self-hosted-task', actor: 'User', action: 'deploy app', benefit: 'run it self-hosted', priority: 'must' }];
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
      url: '/api/v1/projects/project-self-hosted-task/tasks/generate'
    });

    assert.strictEqual(response.statusCode, 200);
    const systemFoundations = insertedTasks.filter(t => t.requirementId === null);
    // Should have foundational task with self-hosted Docker title
    const foundTask = systemFoundations.find(t => t.title.includes('Project & Database Setup (Self-Hosted Docker)'));
    assert.ok(foundTask);
    assert.ok(foundTask.objective.includes('establish a local Docker Compose setup'));
  });

  test('Tasks Generation: Generates local SQLite setup foundational task', async () => {
    db.select = (() => ({
      from: (table: any) => ({
        where: async () => {
          const keys = Object.keys(table || {});
          if (keys.includes('currentPhase')) {
            return [{ id: 'project-local-task', userId: 'test-user-id', needsDatabase: true, needsServer: true, targetPlatform: 'web', deploymentModel: 'local' }];
          }
          if (keys.includes('oneLineDescription')) {
            return [{ id: 'brief-local-task', projectId: 'project-local-task', needsDatabase: true, needsServer: true, targetPlatform: 'web' }];
          }
          if (keys.includes('userStory')) {
            return [{ id: 'req-1', projectId: 'project-local-task', actor: 'User', action: 'run locally', benefit: 'run it local SQLite', priority: 'must' }];
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
      url: '/api/v1/projects/project-local-task/tasks/generate'
    });

    assert.strictEqual(response.statusCode, 200);
    const systemFoundations = insertedTasks.filter(t => t.requirementId === null);
    // Should have foundational task with local SQLite title
    const foundTask = systemFoundations.find(t => t.title.includes('Project Setup & Local SQLite/Database Setup'));
    assert.ok(foundTask);
    assert.ok(foundTask.objective.includes('configure local database storage (SQLite/Local DB)'));
  });

  test('generateAcceptanceCriteria with deploymentModel=\'local\' produces loopback-only / no-external-deps criteria', () => {
    const req = { id: 'req-1', actor: 'User', action: 'save data', benefit: 'keep it local', priority: 'must', userStory: '' };
    const criteria = generateAcceptanceCriteria(req as any, true, true, 'web', 'local');
    assert.ok(criteria.some(c => c.includes('loopback')));
    assert.ok(criteria.some(c => c.includes('offline-capable') || c.includes('offline')));
  });

  test('generateAcceptanceCriteria with deploymentModel=\'self-hosted\' produces Docker/config/health-check criteria', () => {
    const req = { id: 'req-1', actor: 'User', action: 'save data', benefit: 'keep it safe', priority: 'must', userStory: '' };
    const criteria = generateAcceptanceCriteria(req as any, true, true, 'web', 'self-hosted');
    assert.ok(criteria.some(c => c.includes('container') || c.includes('Docker')));
    assert.ok(criteria.some(c => c.includes('health check') || c.includes('healthcheck')));
  });

  test('buildPrompt output contains deployment-specific system instruction text and that instruction appears BEFORE the task objective section', () => {
    const brief = { id: 'b1', projectId: 'p1', projectName: 'LocalTest', oneLineDescription: 'test local', problemStatement: '', targetUsers: '', coreValueProposition: '', outOfScope: [], successMetrics: [], version: 1 };
    const context = {
      brief: brief as any,
      requirements: [],
      task: { title: 'Test Task', objective: 'Test Objective', acceptanceCriteria: ['criteria 1'] },
      stack: { frontend: 'React', backend: 'Fastify' },
      deploymentModel: 'local' as const,
      needsServer: true,
      needsAuth: true,
    };
    const prompt = buildPrompt(context);
    assert.ok(prompt.includes('IMPORTANT: This application runs locally.'));
    
    // Verify instruction appears before Role Context
    const idxInstruction = prompt.indexOf('IMPORTANT: This application runs locally.');
    const idxRole = prompt.indexOf('**Role Context**:');
    assert.ok(idxInstruction !== -1);
    assert.ok(idxRole !== -1);
    assert.ok(idxInstruction < idxRole);
  });

  test('deploymentModel=\'local\' + needsServer=false produces appropriate bundled-executable output format', () => {
    const brief = { id: 'b1', projectId: 'p1', projectName: 'LocalTest', oneLineDescription: 'test local', problemStatement: '', targetUsers: '', coreValueProposition: '', outOfScope: [], successMetrics: [], version: 1 };
    const context = {
      brief: brief as any,
      requirements: [],
      task: { title: 'Test Task', objective: 'Test Objective', acceptanceCriteria: ['criteria 1'] },
      stack: { frontend: 'React' },
      deploymentModel: 'local' as const,
      needsServer: false,
      needsAuth: false,
    };
    const prompt = buildPrompt(context);
    assert.ok(prompt.includes('bundled executable entry point'));
  });

  test('Technical Constraints section emits no blank keys when deployment-specific constraints are filtered out', () => {
    const brief = { id: 'b1', projectId: 'p1', projectName: 'LocalTest', oneLineDescription: 'test local', problemStatement: '', targetUsers: '', coreValueProposition: '', outOfScope: [], successMetrics: [], version: 1 };
    const context = {
      brief: brief as any,
      requirements: [],
      task: { title: 'Test Task', objective: 'Test Objective', acceptanceCriteria: ['criteria 1'] },
      stack: { frontend: 'React', hosting: undefined, cdn: undefined } as any,
      deploymentModel: 'local' as const,
      needsServer: false,
      needsAuth: false,
    };
    const prompt = buildPrompt(context);
    // Confirm "hosting" and "cdn" are not in Technical Constraints
    assert.ok(!prompt.includes('Hosting'));
    assert.ok(!prompt.includes('Cdn'));
    assert.ok(!prompt.includes('undefined'));
  });

  test('IntakeAgent.process streaming path successfully filters and strips Chain-of-Thought reasoning lines', async () => {
    const mockClient = {
      generateStream: async (sys: string, user: string, onToken: (t: string) => void) => {
        // Simulates model emitting tokens including CoT inside <output>
        const tokens = [
          'Some reasoning before\n',
          '<output>',
          '* Internal logic (not to be output):\n',
          '* needsDatabase: false\n',
          'Draft: hello\n',
          'This is a clean response.\n',
          'Is that what you want?\n',
          '</output>'
        ];
        for (const token of tokens) {
          onToken(token);
        }
        return tokens.join('');
      }
    };
    
    const agent = new IntakeAgent(mockClient as any);
    const streamedTokens: string[] = [];
    await agent.process('hello', [], (token) => {
      streamedTokens.push(token);
    });
    
    const combined = streamedTokens.join('');
    // Verify it doesn't contain any reasoning lines
    assert.ok(!combined.includes('Internal logic'));
    assert.ok(!combined.includes('needsDatabase'));
    assert.ok(!combined.includes('Draft:'));
    // Verify it does contain the clean conversational lines
    assert.ok(combined.includes('This is a clean response.'));
    assert.ok(combined.includes('Is that what you want?'));
  });

  test('IntakeAgent.process streaming fallback recovers correctly when the closing output tag is truncated during streaming chunks', async () => {
    const mockClient = {
      generateStream: async (sys: string, user: string, onToken: (t: string) => void) => {
        // Simulates model emitting tokens but closing tag gets cut off/not matched during chunk streams
        const tokens = [
          'Some reasoning before\n',
          '<output>',
          'This is a clean response that gets cut off.\n'
          // </output> gets appended at final resolution but not streamed dynamically
        ];
        for (const token of tokens) {
          onToken(token);
        }
        return tokens.join('') + '</output>';
      }
    };
    
    const agent = new IntakeAgent(mockClient as any);
    const streamedTokens: string[] = [];
    await agent.process('hello', [], (token) => {
      streamedTokens.push(token);
    });
    
    const combined = streamedTokens.join('');
    assert.ok(combined.includes('This is a clean response that gets cut off.'));
  });
});
