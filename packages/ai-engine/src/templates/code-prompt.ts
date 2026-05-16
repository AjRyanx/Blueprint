import type { ProjectBrief, Requirement } from '@blueprint/shared';

export type PromptContext = {
  brief: ProjectBrief;
  requirements: Requirement[];
  task: {
    title: string;
    objective: string;
    acceptanceCriteria: string[];
  };
  stack?: {
    frontend?: string;
    backend?: string;
    database?: string;
    auth?: string;
  };
  securityRequirements?: string[];
  architecture?: any;
  dataModel?: any;
  security?: any;
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

export function buildPrompt(context: PromptContext): string {
  const role = ROLE_TEMPLATE.replace('{stack}', context.stack?.backend ?? 'TypeScript')
    .replace('{projectName}', context.brief.projectName);

  const techStack = [
    context.stack?.frontend,
    context.stack?.backend,
    context.stack?.database,
  ]
    .filter(Boolean)
    .join(' + ');

  const description = context.brief.oneLineDescription || 'is being built';
  const contextSummary = CONTEXT_TEMPLATE.replace('{description}', description)
    .replace('{techStack}', techStack || 'the selected stack');

  // Assemble Architecture Design context
  let archSpec = '';
  if (context.architecture) {
    const categories = context.architecture.techStack || [];
    const patterns = context.architecture.patterns || [];
    const constraints = context.architecture.constraints || [];
    
    const archLines = [
      '### 🏛️ System Architecture Design',
      context.architecture.overview ? `*Overview*: ${context.architecture.overview}` : '',
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

    if (archLines.length > 1) {
      archSpec = archLines.join('\n') + '\n';
    }
  }

  // Assemble Data Model Schema context
  let dataModelSpec = '';
  if (context.dataModel) {
    const entities = context.dataModel.entities || [];
    const relationships = context.dataModel.relationships || [];
    
    const dataLines = [
      '### 💾 Database Schema & Entity Map',
      entities.length > 0
        ? `*Database Entities*:\n${entities.map((e: any) => {
            const attrList = (e.attributes || []).map((a: any) => `${a.name} (${a.type}${a.required ? ', required' : ''}${a.unique ? ', unique' : ''})`).join(', ');
            return `  - **${e.name}**: ${e.description || 'Data Entity'}. Fields: [${attrList}]`;
          }).join('\n')}`
        : '',
      relationships.length > 0
        ? `*Entity Relationships*:\n${relationships.map((r: any) => `  - ${r.source} --(${r.name}: ${r.type})--> ${r.target}`).join('\n')}`
        : '',
    ].filter(Boolean);

    if (dataLines.length > 1) {
      dataModelSpec = dataLines.join('\n') + '\n';
    }
  }

  // Assemble Security audit context
  let securitySpec = '';
  if (context.security) {
    const checklist = context.security.checklist || [];
    const passedChecks = checklist.filter((c: any) => c.status === 'passed');
    
    if (passedChecks.length > 0) {
      securitySpec = [
        '### 🛡️ Security Gate Requirements',
        `*Validated Controls*:\n${passedChecks.map((c: any) => `  - **${c.name}**: ${c.description}`).join('\n')}`,
        ''
      ].join('\n');
    }
  }

  // Task details at the VERY TOP of the prompt
  const taskHeader = [
    `# 📋 IMPLEMENTATION TASK: ${context.task.title.toUpperCase()}`,
    '',
    `**Objective**: ${context.task.objective}`,
    '',
    '### ✅ Acceptance Criteria',
    ...context.task.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`),
    '',
    '### 🛠️ Technical Constraints',
    ...(context.stack
      ? Object.entries(context.stack)
          .filter(([, v]) => v)
          .map(([layer, tech]) => `- **${layer.charAt(0).toUpperCase() + layer.slice(1)}**: ${tech}`)
      : []),
    '',
    '### 🔒 Security Requirements',
    ...(context.securityRequirements ?? SECURITY_REQUIREMENTS).map((r) => `- ${r}`),
    '',
  ].join('\n');

  // Background context at the bottom
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

  const outputFormat = OUTPUT_FORMAT_TEMPLATE.replace(
    '{outputType}',
    'files/modules needed for this task',
  );

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
  return `Implement the user story: "${requirement.userStory}". This is a ${requirement.priority}-priority requirement.`;
}

export function generateAcceptanceCriteria(requirement: Requirement): string[] {
  return [
    `The ${requirement.actor} can ${requirement.action.toLowerCase()}`,
    `Input validation is enforced server-side`,
    `Errors are handled gracefully with appropriate messages`,
    `The feature follows the agreed security requirements`,
  ];
}
