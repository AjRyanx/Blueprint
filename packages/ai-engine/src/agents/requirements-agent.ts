import { GeminiClient, type StreamCallback } from '../llm/gemini-client.js';
import { GroqClient } from '../llm/groq-client.js';
import { truncateToBudget } from '../utils/token-counter.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class RequirementsAgent {
  private client: GeminiClient | GroqClient;
  private systemPrompt: string;

  constructor(client: GeminiClient | GroqClient) {
    this.client = client;
    try {
      this.systemPrompt = readFileSync(
        join(__dirname, '../prompts/requirements-system.txt'),
        'utf-8',
      );
    } catch {
      this.systemPrompt = `You are a requirements engineer. Output ONLY a valid JSON array of objects.
Do not explain anything. Do not use markdown.

Format:
[
  { "actor": "User", "action": "view dashboard", "benefit": "see unpaid invoices", "priority": "must" }
]

Rules:
1. Use MoSCoW: must, should, could, wont.
2. MANDATORY: Convert all "Out of Scope" items from the brief into "wont" priority stories.
3. Return between 10 and 15 stories.
4. Output ONLY the raw JSON.`;
    }
  }

  async generateUserStories(brief: string, onToken?: StreamCallback) {
    const content = truncateToBudget(
      `Project Brief:\n${brief}\n\nGenerate user stories as a JSON array.`,
      64_000,
    );

    if (onToken) {
      return this.client.generateStream(this.systemPrompt, content, onToken);
    }
    return this.client.generate(this.systemPrompt, content);
  }

  async analyzeDependencies(stories: string) {
    const content = `Given these user stories:\n${stories}\n\nAnalyze dependencies between them. Return a JSON object mapping each story ID to an array of story IDs it depends on.`;
    return this.client.generate(
      'You are a dependency analysis specialist. Output only valid JSON.',
      content,
    );
  }
}
