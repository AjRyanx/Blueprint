import type { ProjectBrief, Requirement, ImplementationTask } from '@blueprint/shared';

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

  const taskSpec = [
    `## Task: ${context.task.title}`,
    '',
    context.task.objective,
    '',
    '### Technical Constraints',
    ...(context.stack
      ? Object.entries(context.stack)
          .filter(([, v]) => v)
          .map(([layer, tech]) => `- ${layer}: ${tech}`)
      : []),
    '',
    '### Security Requirements',
    ...(context.securityRequirements ?? SECURITY_REQUIREMENTS).map((r) => `- ${r}`),
    '',
    '### Acceptance Criteria',
    ...context.task.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`),
  ].join('\n');

  const outputFormat = OUTPUT_FORMAT_TEMPLATE.replace(
    '{outputType}',
    'files/modules needed for this task',
  );

  return [
    role,
    '',
    contextSummary,
    '',
    taskSpec,
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
