import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

export type GeminiConfig = {
  apiKey: string;
  model?: string;
  maxRetries?: number;
};

export type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};

export type StreamCallback = (token: string) => void;

export class GeminiClient {
  private model: GenerativeModel;
  private maxRetries: number;
  private usage: { promptTokens: number; completionTokens: number } = {
    promptTokens: 0,
    completionTokens: 0,
  };

  constructor(config: GeminiConfig) {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = genAI.getGenerativeModel({
      model: config.model ?? 'gemma-4-26b-a4b-it',
    });
    this.maxRetries = config.maxRetries ?? 3;
  }

  async generate(
    systemPrompt: string,
    userContent: string,
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const result = await this.model.generateContent([
          { text: systemPrompt },
          { text: userContent },
        ]);

        const response = result.response;
        const text = response.text();

        this.usage.promptTokens += response.usageMetadata?.promptTokenCount ?? 0;
        this.usage.completionTokens += response.usageMetadata?.candidatesTokenCount ?? 0;

        return text;
      } catch (err) {
        lastError = err as Error;
        if (attempt < this.maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError ?? new Error('Gemini API call failed after retries');
  }

  async generateStream(
    systemPrompt: string,
    userContent: string,
    onToken: StreamCallback,
  ): Promise<string> {
    let lastError: Error | null = null;
    let fullText = '';

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const result = await this.model.generateContentStream([
          { text: systemPrompt },
          { text: userContent },
        ]);

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            fullText += text;
            onToken(text);
          }
        }

        return fullText;
      } catch (err) {
        lastError = err as Error;
        if (attempt < this.maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError ?? new Error('Gemini stream call failed after retries');
  }

  getUsage() {
    return { ...this.usage };
  }

  resetUsage() {
    this.usage = { promptTokens: 0, completionTokens: 0 };
  }
}
