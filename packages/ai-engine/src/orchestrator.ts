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
    this.intakeAgent = new IntakeAgent(this.geminiClient);
    this.requirementsAgent = new RequirementsAgent(this.geminiClient);
    this.architectureAgent = new ArchitectureAgent(this.groqClient);
    this.dataAgent = new DataAgent(this.groqClient);
    this.securityAgent = new SecurityAgent(this.geminiClient);
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
    onToken?: (token: string) => void,
  ) {
    return this.requirementsAgent.generateUserStories(brief, onToken);
  }

  async generateSecurityChecklist(
    brief: string,
    requirements: string,
  ) {
    return this.securityAgent.generateChecklist(brief, requirements);
  }

  async generateArchitecture(brief: string, stories: any[]) {
    return this.architectureAgent.generateArchitecture(brief, stories);
  }

  async generateDataModel(brief: string, stories: any[]) {
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
