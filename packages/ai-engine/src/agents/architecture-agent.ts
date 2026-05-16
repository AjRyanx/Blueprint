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

  async generateArchitecture(brief: string, stories: any[]) {
    const context = `Project Brief:\n${brief}\n\nUser Stories:\n${JSON.stringify(stories, null, 2)}`;
    const content = truncateToBudget(
      `${context}\n\nGenerate a complete system architecture design as a JSON object.`,
      64_000,
    );

    return this.client.generate(this.systemPrompt, content);
  }
}
