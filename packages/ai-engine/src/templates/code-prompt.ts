import type { ProjectBrief, Requirement } from '@blueprint/shared';

export type TechStackItem = {
  name: string;
  version?: string;
  notes?: string;
};

export type TechStackCategory = {
  category: string;
  items: TechStackItem[];
};

/**
 * System Architecture design schema mapping.
 * Shape:
 * - techStack: { category: string; items: { name: string; version?: string; notes?: string }[] }[]
 * - patterns: { name: string; description: string; rationale?: string }[]
 * - constraints: string[]
 */
export type ArchitectureContext = {
  overview?: string | null;
  techStack?: unknown;
  patterns?: unknown;
  constraints?: unknown;
};

/**
 * Database Data Schema mapping.
 * Shape:
 * - entities: { name: string; description?: string; attributes: { name: string; type: string; required?: boolean; unique?: boolean; notes?: string }[] }[]
 * - relationships: { name?: string | null; type: string; source?: string; target?: string; from?: string; to?: string; description?: string }[]
 */
export type DataModelContext = {
  entities?: unknown;
  relationships?: unknown;
};

/**
 * Security audit checklist mapping.
 * Shape:
 * - checklist: { id: string; category: string; title: string; description: string; required: boolean; passed?: boolean; status?: string; name?: string }[]
 */
export type SecurityContext = {
  checklist?: unknown;
};

export type ProjectStack = {
  frontend?: string;
  backend?: string;
  database?: string;
  auth?: string;
};

export type PromptContext = {
  brief: ProjectBrief;
  requirements: Requirement[];
  task: {
    title: string;
    objective: string;
    acceptanceCriteria: string[];
  };
  stack?: ProjectStack;
  securityRequirements?: string[];
  architecture?: ArchitectureContext | null;
  dataModel?: DataModelContext | null;
  security?: SecurityContext | null;
  needsDatabase?: boolean;  // defaults to true if absent
  needsServer?: boolean;    // defaults to true if absent
  needsAuth?: boolean;      // defaults to true if absent
  targetPlatform?: 'web' | 'cli';
  deploymentModel?: 'cloud' | 'self-hosted' | 'local';
};

const ROLE_TEMPLATE = `You are a senior {stack} developer building {projectName}.`;

const CONTEXT_TEMPLATE = `This system {description}. The project uses {techStack}.`;

function getSecurityRequirements(
  needsDatabase: boolean = true,
  needsServer: boolean = true,
  targetPlatform: string = 'web',
  needsAuth: boolean = true
): string[] {
  if (targetPlatform === 'cli') {
    return [
      'Sanitise all CLI arguments before passing to shell commands or subprocesses',
      'Use absolute paths for subprocess calls — do not rely on PATH resolution',
      'Never accept secrets as CLI arguments — use environment variables or interactive prompts',
      'Validate and sanitise all file path arguments to prevent path traversal',
      'Use environment variables for all configuration and credentials',
      'Implement proper error handling — write errors to stderr, not stdout',
    ];
  }
  const base = [
    'Never expose stack traces to the client',
    'Use environment variables for all secrets and configuration',
    'Implement proper error handling with structured logging',
    'Enforce Content Security Policy headers',
  ];
  if (needsServer) {
    base.unshift('Enforce server-side input validation on all endpoints');
  }
  if (needsServer && needsDatabase) {
    base.splice(1, 0, 'Use parameterised queries to prevent SQL injection');
  }
  if (needsAuth) {
    base.push('Implement rate limiting on login/auth endpoints');
    base.push('Use cryptographically strong tokens with expiry for session management');
  }
  return base;
}

function getOutputFormat(targetPlatform?: string, deploymentModel?: string): string {
  const OUTPUT_FORMAT_TEMPLATE = 'Return only the {outputType}. Include brief inline comments for non-obvious decisions. Do NOT explain your code, do NOT provide installation instructions, and do NOT wrap code in anything other than markdown code blocks.';

  if (targetPlatform === 'cli') {
    return interpolate(OUTPUT_FORMAT_TEMPLATE, { outputType: 'CLI command/module and its exported handlers' });
  }
  if (deploymentModel === 'self-hosted') {
    return interpolate(OUTPUT_FORMAT_TEMPLATE, { outputType: 'the service module, Dockerfile changes, and configuration' });
  }
  if (deploymentModel === 'local') {
    return interpolate(OUTPUT_FORMAT_TEMPLATE, { outputType: 'the module and its bundled executable entry point' });
  }
  return interpolate(OUTPUT_FORMAT_TEMPLATE, { outputType: 'files/modules needed for this task' });
}

/**
 * Type-safe string interpolation helper.
 */
function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (key in variables) {
      return variables[key] ?? '';
    }
    return match;
  });
}

/**
 * Assembler for specific implementation task objective and criteria headers.
 */
export function assembleTaskHeader(
  title: string,
  objective: string,
  acceptanceCriteria: string[],
  stack?: ProjectStack,
  securityRequirements?: string[]
): string {
  const securityLines = securityRequirements ?? getSecurityRequirements(true, true);
  
  return [
    `# 📋 IMPLEMENTATION TASK: ${title.toUpperCase()}`,
    '',
    `**Objective**: ${objective}`,
    '',
    '### ✅ Acceptance Criteria',
    ...acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`),
    '',
    '### 🛠️ Technical Constraints',
    ...(stack
      ? Object.entries(stack)
          .filter(([, v]) => v)
          .map(([layer, tech]) => `- **${layer.charAt(0).toUpperCase() + layer.slice(1)}**: ${tech}`)
      : []),
    '',
    '### 🔒 Security Requirements',
    ...securityLines.map((r) => `- ${r}`),
    '',
  ].join('\n');
}

/**
 * Assembler for System Architecture context specs.
 */
export function assembleArchitectureContext(architecture?: ArchitectureContext | null): string {
  if (!architecture) return '';

  const categories = (architecture.techStack as any) || [];
  const patterns = (architecture.patterns as any) || [];
  const constraints = (architecture.constraints as any) || [];

  const archLines = [
    '### 🏛️ System Architecture Design',
    architecture.overview ? `*Overview*: ${architecture.overview}` : '',
    categories.length > 0
      ? `*Technology Stack*:\n${categories.map((c: any) => `  - **${c.category}**: ${c.items.map((i: any) => `${i.name}${i.notes ? ` (${i.notes})` : ''}`).join(', ')}`).join('\n')}`
      : '',
    patterns.length > 0
      ? `*Design Patterns*:\n${patterns.map((p: any) => `  - **${p.name}**: ${p.description}`).join('\n')}`
      : '',
    constraints.length > 0
      ? `*System Constraints*:\n${constraints.map((c: any) => `  - ${c}`).join('\n')}`
      : '',
  ].filter(Boolean);

  return archLines.length > 1 ? archLines.join('\n') + '\n' : '';
}

/**
 * Assembler for Database Data Schema specs.
 */
export function assembleDataModelContext(dataModel?: DataModelContext | null): string {
  if (!dataModel) return '';

  const entities = (dataModel.entities as any) || [];
  const relationships = (dataModel.relationships as any) || [];

  const dataLines = [
    '### 💾 Database Schema & Entity Map',
    entities.length > 0
      ? `*Database Entities*:\n${entities.map((e: any) => {
          const attrList = (e.attributes || []).map((a: any) => `${a.name} (${a.type}${a.required ? ', required' : ''}${a.unique ? ', unique' : ''})`).join(', ');
          return `  - **${e.name}**: ${e.description || 'Data Entity'}. Fields: [${attrList}]`;
        }).join('\n')}`
      : '',
    relationships.length > 0
      ? `*Entity Relationships*:\n${relationships.map((r: any) => {
          const source = r.source || r.from || 'undefined';
          const target = r.target || r.to || 'undefined';
          return `  - ${source} --(${r.name || 'Relationship'}: ${r.type})--> ${target}`;
        }).join('\n')}`
      : '',
  ].filter(Boolean);

  return dataLines.length > 1 ? dataLines.join('\n') + '\n' : '';
}

/**
 * Assembler for Security gate checklists.
 */
export function assembleSecurityContext(security?: SecurityContext | null): string {
  if (!security) return '';

  const checklist = (security.checklist as any) || [];
  const passedChecks = checklist.filter((c: any) => c.status === 'passed' || c.passed === true);

  if (passedChecks.length === 0) return '';

  return [
    '### 🛡️ Security Gate Requirements',
    `*Validated Controls*:\n${passedChecks.map((c: any) => `  - **${c.title || c.name}**: ${c.description}`).join('\n')}`,
    ''
  ].join('\n');
}

/**
 * Assembler for core Role play and Context briefs.
 */
export function assembleRoleAndContext(
  brief: ProjectBrief,
  stack?: ProjectStack,
  needsServer?: boolean,
  targetPlatform?: 'web' | 'cli'
): { role: string; contextSummary: string } {
  const stackRole =
    targetPlatform === 'cli'
      ? (stack?.backend ?? 'Node.js')
      : needsServer === false
        ? (stack?.frontend ?? 'React')
        : (stack?.backend ?? 'TypeScript');

  const role = targetPlatform === 'cli'
    ? `You are a senior CLI developer building ${brief.projectName}.`
    : interpolate(ROLE_TEMPLATE, {
        stack: stackRole,
        projectName: brief.projectName,
      });

  const techStackString = [
    stack?.frontend,
    stack?.backend,
    stack?.database,
  ]
    .filter(Boolean)
    .join(' + ') || 'the selected stack';

  const description = brief.oneLineDescription || 'is being built';
  const contextSummary = interpolate(CONTEXT_TEMPLATE, {
    description,
    techStack: techStackString,
  });

  return { role, contextSummary };
}

/**
 * High-quality thin composer of developer implementation tasks prompts.
 */
export function buildPrompt(context: PromptContext): string {
  const { role, contextSummary } = assembleRoleAndContext(
    context.brief,
    context.stack,
    context.needsServer,
    context.targetPlatform
  );

  const archSpec = assembleArchitectureContext(context.architecture);
  const dataModelSpec = assembleDataModelContext(context.dataModel);
  const securitySpec = assembleSecurityContext(context.security);

  const securityLines = context.securityRequirements
    ?? getSecurityRequirements(
      context.needsDatabase ?? true,
      context.needsServer ?? true,
      context.targetPlatform ?? 'web',
      context.needsAuth ?? true
    );

  // Filter stack based on deployment model (Step 6)
  let filteredStack = context.stack ? { ...context.stack } : undefined;
  if (filteredStack && context.deploymentModel === 'local') {
    delete (filteredStack as any).hosting;
    delete (filteredStack as any).cdn;
  }
  if (filteredStack && context.deploymentModel === 'self-hosted') {
    (filteredStack as any).infrastructure = 'Docker Compose / Nginx (Self-Hosted)';
  }

  const taskHeader = assembleTaskHeader(
    context.task.title,
    context.task.objective,
    context.task.acceptanceCriteria,
    filteredStack,
    securityLines
  );

  // Deployment-specific constraints + auth constraints at the TOP (Step 3)
  const instructions: string[] = [];

  if (context.deploymentModel === 'self-hosted') {
    instructions.push(
      'IMPORTANT: This project is self-hosted. Ensure all configuration is externalized via environment variables or config files. Include health check endpoints. Document required infrastructure (Docker, reverse proxy, SSL).'
    );
  } else if (context.deploymentModel === 'local') {
    instructions.push(
      'IMPORTANT: This application runs locally. Do not depend on external network services at runtime. Ensure clean shutdown on SIGTERM/SIGINT. Bind to localhost only.'
    );
  }

  if (context.needsAuth === false) {
    instructions.push(
      'IMPORTANT: This project does NOT require user accounts or authentication. Do NOT generate any login forms, session management, NextAuth configs, custom auth routes, or JWT utilities.'
    );
  }

  const referenceContext = [
    '---',
    '## 📖 SYSTEM REFERENCE CONTEXT (For developer tool background awareness)',
    '',
    ...instructions,
    ...(instructions.length > 0 ? [''] : []),
    `**Role Context**: ${role}`,
    `**System Overview**: ${contextSummary}`,
    '',
    archSpec,
    dataModelSpec,
    securitySpec,
  ].filter((p) => p !== '').join('\n');

  const outputFormat = getOutputFormat(context.targetPlatform, context.deploymentModel);

  return [
    taskHeader,
    referenceContext,
    '',
    outputFormat,
    '',
    `Keep this response focused and within approximately 2000-6000 tokens.`,
  ].join('\n');
}

export function generateTaskTitle(requirement: Requirement): string {
  const action = requirement.action.slice(0, 60);
  return `Implement ${action}`;
}

export function generateTaskObjective(requirement: Requirement): string {
  const story = requirement.userStory || `As a ${requirement.actor || 'User'}, I want to ${requirement.action || 'perform an action'}, so that ${requirement.benefit || 'achieve a benefit'}`;
  return `Implement the user story: "${story}". This is a ${requirement.priority || 'must'}-priority requirement.`;
}

/**
 * Action-based, highly testable acceptance criteria generator.
 */
export function generateAcceptanceCriteria(
  requirement: Requirement,
  needsDatabase: boolean = true,
  needsServer: boolean = true,
  targetPlatform: string = 'web',
  deploymentModel: string = 'cloud'
): string[] {
  const criteria = [
    `Verify that the ${requirement.actor} can successfully execute the action: "${requirement.action}"`,
  ];
  
  if (requirement.benefit) {
    criteria.push(`Confirm that the system achieves the desired benefit: "${requirement.benefit}"`);
  }

  const actionLower = requirement.action.toLowerCase();
  
  if (targetPlatform === 'cli') {
    criteria.push(
      `Verify the command exits with code 0 on success and a non-zero code on failure`
    );
    criteria.push(
      `Verify that --help output is correct and describes all flags and arguments`
    );
    if (actionLower.includes('create') || actionLower.includes('add') || actionLower.includes('save') || actionLower.includes('update') || actionLower.includes('set')) {
      criteria.push(
        `Verify that invalid or missing arguments produce a clear error message on stderr`
      );
      criteria.push(
        `Verify that the command is idempotent or handles existing state gracefully`
      );
    } else if (actionLower.includes('view') || actionLower.includes('list') || actionLower.includes('search') || actionLower.includes('read') || actionLower.includes('get')) {
      criteria.push(
        `Verify that output is correctly formatted for both TTY and piped consumption`
      );
      criteria.push(
        `Verify that empty results produce an appropriate message rather than silence`
      );
    }
  } else {
    if (actionLower.includes('create') || actionLower.includes('add') || actionLower.includes('save') || actionLower.includes('update') || actionLower.includes('set')) {
      criteria.push(
        needsDatabase
          ? `Verify that new or updated records are correctly committed to the database and match the schema rules`
          : `Verify that new or updated records are correctly persisted and match the expected data structure`
      );
      criteria.push(`Ensure that ${needsServer === false ? 'client-side' : 'form/API'} validation prevents empty, invalid, or duplicate submissions`);
    } else if (actionLower.includes('view') || actionLower.includes('list') || actionLower.includes('search') || actionLower.includes('read') || actionLower.includes('get')) {
      criteria.push(`Verify that data is retrieved and rendered correctly in real-time or cached formats`);
      criteria.push(`Confirm that empty or missing states are handled gracefully in the user interface`);
    } else if (actionLower.includes('transfer') || actionLower.includes('process') || actionLower.includes('calculate') || actionLower.includes('simulate') || actionLower.includes('adjust')) {
      criteria.push(`Verify that calculations, updates, or transitions update all associated entities and states correctly`);
      criteria.push(`Ensure transactional integrity is maintained, reverting changes if any sub-operation fails`);
    }

    if (deploymentModel === 'self-hosted') {
      criteria.push(
        'Verify container configuration incorporates Docker network isolation and environment-variable-driven variables',
        'Ensure a working health check endpoint is implemented and documented setup procedure is provided'
      );
    } else if (deploymentModel === 'local') {
      criteria.push(
        'Verify the service binds solely to loopback (127.0.0.1) and handles clean shutdown on SIGTERM/SIGINT',
        'Ensure the application is fully offline-capable with zero external runtime network dependencies'
      );
    }
  }

  return criteria;
}
