import { GeminiClient } from './llm/gemini-client.js';
import { GroqClient } from './llm/groq-client.js';
import { IntakeAgent } from './agents/intake-agent.js';
import { RequirementsAgent } from './agents/requirements-agent.js';
import { ArchitectureAgent } from './agents/architecture-agent.js';
import { DataAgent } from './agents/data-agent.js';
import { SecurityAgent } from './agents/security-agent.js';
export class Orchestrator {
  private intakeAgent: IntakeAgent;
  private requirementsAgent: RequirementsAgent;
  private architectureAgent: ArchitectureAgent;
  private dataAgent: DataAgent;
  private securityAgent: SecurityAgent;

  constructor(private geminiClient: GeminiClient, private groqClient: GroqClient) {
    this.intakeAgent = new IntakeAgent(this.groqClient);
    this.requirementsAgent = new RequirementsAgent(this.groqClient);
    this.architectureAgent = new ArchitectureAgent(this.groqClient);
    this.dataAgent = new DataAgent(this.groqClient);
    this.securityAgent = new SecurityAgent(this.groqClient);
  }

  async processPhase1Intake(
    userMessage: string,
    conversationHistory: { role: string; content: string }[],
    onToken?: (token: string) => void,
  ) {
    return this.intakeAgent.process(userMessage, conversationHistory, onToken);
  }

  async generateProjectBrief(conversationHistory: { role: string; content: string }[]) {
    return this.intakeAgent.synthesizeBrief(conversationHistory);
  }

  async generateRequirements(
    brief: string,
    contextOrOnToken?: {
      targetPlatform?: string;
      deploymentModel?: string;
      needsServer?: boolean | null;
      needsAuth?: boolean | null;
    } | ((token: string) => void),
    onToken?: (token: string) => void,
  ) {
    return this.requirementsAgent.generateUserStories(brief, contextOrOnToken, onToken);
  }

  async generateSecurityChecklist(
    brief: string,
    requirements: string,
    needsDatabase: boolean = true,
    needsServer: boolean = true,
    targetPlatform: string = 'web',
    needsAuth: boolean = true,
    deploymentModel: string = 'cloud'
  ) {
    return this.securityAgent.generateChecklist(
      brief,
      requirements,
      needsDatabase,
      needsServer,
      targetPlatform,
      needsAuth,
      deploymentModel
    );
  }

  async generateArchitecture(
    brief: string,
    stories: any[],
    needsDatabaseHint: boolean | null,
    needsServerHint: boolean | null,
    targetPlatform: string = 'web',
    needsAuthHint: boolean | null = null,
    deploymentModel: string = 'cloud'
  ) {
    return this.architectureAgent.generateArchitecture(
      brief,
      stories,
      needsDatabaseHint,
      needsServerHint,
      targetPlatform,
      needsAuthHint,
      deploymentModel
    );
  }

  async generateDataModel(
    brief: string,
    stories: any[],
    architecture: { needsDatabase: boolean }
  ) {
    if (!architecture.needsDatabase) return null;
    return this.dataAgent.generateDataModel(brief, stories);
  }

  getPhaseForNumber(phase: number): string {
    const phases = [
      'idea-capture',
      'requirements',
      'architecture',
      'data-modelling',
      'security',
      'implementation',
    ];
    return phases[phase - 1] ?? 'unknown';
  }
}
