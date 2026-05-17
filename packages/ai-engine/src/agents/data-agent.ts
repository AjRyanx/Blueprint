import { GeminiClient } from '../llm/gemini-client.js';
import { GroqClient } from '../llm/groq-client.js';
import { truncateToBudget } from '../utils/token-counter.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class DataAgent {
  private client: GeminiClient | GroqClient;
  private systemPrompt: string;

  constructor(client: GeminiClient | GroqClient) {
    this.client = client;
    try {
      this.systemPrompt = readFileSync(
        join(__dirname, '../prompts/data-system.txt'),
        'utf-8',
      );
    } catch {
      this.systemPrompt = `You are an expert Data Architect. Output ONLY valid JSON.
Design a robust data model based on the brief and stories.
Include entities, attributes, relationships, and indexes.`;
    }
  }

  async generateDataModel(brief: string, stories: any[]) {
    const context = `Project Brief:\n${brief}\n\nUser Stories:\n${JSON.stringify(stories, null, 2)}`;
    const content = truncateToBudget(
      `${context}\n\nGenerate a complete database schema design as a JSON object.`,
      64_000,
    );

    return this.client.generate(this.systemPrompt, content);
  }
}
