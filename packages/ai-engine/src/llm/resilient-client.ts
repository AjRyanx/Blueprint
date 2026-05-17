import { GeminiClient } from './gemini-client.js';
import { GroqClient } from './groq-client.js';

export class ResilientClient {
  constructor(
    private primary: GeminiClient | GroqClient,
    private fallback: GeminiClient | GroqClient
  ) {}

  async generate(systemPrompt: string, userContent: string): Promise<string> {
    try {
      return await this.primary.generate(systemPrompt, userContent);
    } catch (err) {
      console.warn('ResilientClient: Primary LLM client failed, falling back to backup client. Error:', err);
      return await this.fallback.generate(systemPrompt, userContent);
    }
  }

  async generateStream(
    systemPrompt: string,
    userContent: string,
    onToken: (token: string) => void
  ): Promise<string> {
    try {
      return await this.primary.generateStream(systemPrompt, userContent, onToken);
    } catch (err) {
      console.warn('ResilientClient: Primary LLM stream client failed, falling back to backup client. Error:', err);
      return await this.fallback.generateStream(systemPrompt, userContent, onToken);
    }
  }
}
