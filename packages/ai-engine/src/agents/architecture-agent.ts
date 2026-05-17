import { GroqClient } from '../llm/groq-client.js';
import { truncateToBudget } from '../utils/token-counter.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class ArchitectureAgent {
  private client: GroqClient;
  private systemPrompt: string;

  constructor(client: GroqClient) {
    this.client = client;
    try {
      this.systemPrompt = readFileSync(
        join(__dirname, '../prompts/architecture-system.txt'),
        'utf-8',
      );
    } catch {
      this.systemPrompt = `You are an expert Software Architect. Output ONLY valid JSON.
Base your design on the provided project brief and user stories.
Recommend a modern tech stack (e.g. Next.js, Node, PostgreSQL).
Include a valid Mermaid.js diagram.`;
    }
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
    const hint = needsDatabaseHint === null
      ? 'Undetermined — infer from the project type.'
      : needsDatabaseHint
        ? 'Yes — the intake conversation indicates persistence is needed.'
        : 'Possibly not — the intake conversation suggests no persistence. Confirm based on requirements.';

    const serverHint = needsServerHint === null
      ? 'Undetermined — infer from the project type.'
      : needsServerHint
        ? 'Yes — the intake conversation indicates a backend server is needed.'
        : 'Possibly not — the intake conversation suggests no server. Confirm based on requirements.';

    const authHint = needsAuthHint === null
      ? 'Undetermined — infer from the project type.'
      : needsAuthHint
        ? 'Yes — the intake conversation indicates user accounts are needed.'
        : 'Possibly not — the intake conversation suggests no user accounts (VPN, local, CLI with no login, etc.). Confirm based on requirements.';

    const context = [
      `Project Brief:\n${brief}`,
      `User Stories:\n${JSON.stringify(stories, null, 2)}`,
      `Persistence hint from intake: ${hint}`,
      `Server hint from intake: ${serverHint}`,
      `Auth hint from intake: ${authHint}`,
      `Target platform: ${targetPlatform}`,
      `Deployment model: ${deploymentModel}`,
    ].join('\n\n');

    const content = truncateToBudget(
      `${context}\n\nGenerate a complete system architecture design as a JSON object.`,
      64_000,
    );

    return this.client.generate(this.systemPrompt, content);
  }
}
