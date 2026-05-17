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
};

const ROLE_TEMPLATE = `You are a senior {stack} developer building {projectName}.`;

const CONTEXT_TEMPLATE = `This system {description}. The project uses {techStack}.`;

const SECURITY_REQUIREMENTS = [
  'Enforce server-side input validation on all endpoints',
  'Use parameterised queries to prevent SQL injection',
  'Never expose stack traces to the client',
  'Use environment variables for all secrets and configuration',
  'Implement proper error handling with structured logging',
];

const OUTPUT_FORMAT_TEMPLATE = `Return only the requested {outputType}. Include brief inline comments for non-obvious decisions.`;

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
  const securityLines = securityRequirements ?? SECURITY_REQUIREMENTS;
  
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
export function assembleRoleAndContext(brief: ProjectBrief, stack?: ProjectStack): { role: string; contextSummary: string } {
  const role = interpolate(ROLE_TEMPLATE, {
    stack: stack?.backend ?? 'TypeScript',
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
  const { role, contextSummary } = assembleRoleAndContext(context.brief, context.stack);

  const archSpec = assembleArchitectureContext(context.architecture);
  const dataModelSpec = assembleDataModelContext(context.dataModel);
  const securitySpec = assembleSecurityContext(context.security);

  const taskHeader = assembleTaskHeader(
    context.task.title,
    context.task.objective,
    context.task.acceptanceCriteria,
    context.stack,
    context.securityRequirements
  );

  const referenceContext = [
    '---',
    '## 📖 SYSTEM REFERENCE CONTEXT (For developer tool background awareness)',
    '',
    `**Role Context**: ${role}`,
    `**System Overview**: ${contextSummary}`,
    '',
    archSpec,
    dataModelSpec,
    securitySpec,
  ].filter((p) => p !== '').join('\n');

  const outputFormat = interpolate(OUTPUT_FORMAT_TEMPLATE, {
    outputType: 'files/modules needed for this task',
  });

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
export function generateAcceptanceCriteria(requirement: Requirement): string[] {
  const criteria = [
    `Verify that the ${requirement.actor} can successfully execute the action: "${requirement.action}"`,
  ];
  
  if (requirement.benefit) {
    criteria.push(`Confirm that the system achieves the desired benefit: "${requirement.benefit}"`);
  }

  const actionLower = requirement.action.toLowerCase();
  
  if (actionLower.includes('create') || actionLower.includes('add') || actionLower.includes('save') || actionLower.includes('update') || actionLower.includes('set')) {
    criteria.push(`Verify that new or updated records are correctly committed to the database and match the schema rules`);
    criteria.push(`Ensure that form/API validation prevents empty, invalid, or duplicate submissions`);
  } else if (actionLower.includes('view') || actionLower.includes('list') || actionLower.includes('search') || actionLower.includes('read') || actionLower.includes('get')) {
    criteria.push(`Verify that data is retrieved and rendered correctly in real-time or cached formats`);
    criteria.push(`Confirm that empty or missing states are handled gracefully in the user interface`);
  } else if (actionLower.includes('transfer') || actionLower.includes('process') || actionLower.includes('calculate') || actionLower.includes('simulate') || actionLower.includes('adjust')) {
    criteria.push(`Verify that calculations, updates, or transitions update all associated entities and states correctly`);
    criteria.push(`Ensure transactional integrity is maintained, reverting changes if any sub-operation fails`);
  }

  return criteria;
}
