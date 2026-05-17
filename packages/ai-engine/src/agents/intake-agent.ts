import { GeminiClient, type StreamCallback } from '../llm/gemini-client.js';
import { estimateTokens, truncateToBudget } from '../utils/token-counter.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class IntakeAgent {
  private client: GeminiClient;
  private systemPrompt: string;

  constructor(client: GeminiClient) {
    this.client = client;
    try {
      this.systemPrompt = readFileSync(
        join(__dirname, '../prompts/intake-system.txt'),
        'utf-8',
      );
    } catch {
      this.systemPrompt = `You are a senior product analyst running a structured software project intake. Your goal is to extract a complete project brief from the user through natural conversation.

Rules:
1. Ask ONE question at a time. Never list multiple questions.
2. If the user describes a solution, gently redirect to problem-first thinking.
3. Cover these dimensions: problem, target users, value proposition, success metrics, out-of-scope items.
4. Keep responses concise. Do not add fluff.
5. When you have enough information, say "[READY_TO_SYNTHESIZE]" at the end of your response.`;
    }
  }

  async process(
    userMessage: string,
    conversationHistory: { role: string; content: string }[],
    onToken?: StreamCallback,
  ) {
    const contextSummary = conversationHistory
      .slice(-6)
      .map((m) => `${m.role}: ${m.content.slice(0, 500)}`)
      .join('\n');

    const userContent = truncateToBudget(
      `Conversation so far:\n${contextSummary}\n\nUser message: ${userMessage}`,
    );

    if (onToken) {
      let buffer = '';
      let isOutputting = false;
      let hasFinished = false;
      let processedIndex = 0;

      const fullText = await this.client.generateStream(
        this.systemPrompt,
        userContent,
        (token) => {
          if (hasFinished) return;
          buffer += token;

          while (processedIndex < buffer.length) {
            if (!isOutputting) {
              const startIndex = buffer.indexOf('<output>', processedIndex);
              if (startIndex !== -1) {
                isOutputting = true;
                processedIndex = startIndex + 8;
              } else {
                // Keep moving processedIndex but stop before potential partial tag
                processedIndex = Math.max(0, buffer.length - 8);
                break;
              }
            } else {
              const endIndex = buffer.indexOf('</output>', processedIndex);
              if (endIndex !== -1) {
                const content = buffer.substring(processedIndex, endIndex);
                if (content) onToken(content);
                isOutputting = false;
                hasFinished = true;
                processedIndex = endIndex + 9;
                break;
              } else {
                // Stream what we have so far, but stop before potential partial closing tag
                const safeLength = Math.max(0, buffer.length - 9);
                if (safeLength > processedIndex) {
                  const chunk = buffer.substring(processedIndex, safeLength);
                  onToken(chunk);
                  processedIndex = safeLength;
                }
                break;
              }
            }
          }
        },
      );

      if (!isOutputting && buffer.length > 0 && !buffer.includes('<output>')) {
        // If the model completely ignored the tag instruction, just send the whole thing
        // but this is unlikely with a strong prompt
        onToken(buffer);
      }

      return fullText;
    }

    const rawResponse = await this.client.generate(this.systemPrompt, userContent);
    const match = rawResponse.match(/<output>([\s\S]*?)<\/output>/);
    return (match && match[1]) ? match[1].trim() : rawResponse;
  }

  async synthesizeBrief(conversationHistory: { role: string; content: string }[]) {
    const fullConversation = conversationHistory
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const briefPrompt = `Extract a structured project brief from the conversation below. 
Analyze the user's requirements, the problem they are solving, and the core value proposition discussed.

Required JSON format (EXACTLY LIKE THIS):
{
  "projectName": "Example Project Name",
  "oneLineDescription": "A concise summary of what the project does.",
  "problemStatement": "A clear description of the pain points being addressed.",
  "targetUsers": "The specific demographic or group this is built for.",
  "coreValueProposition": "The primary benefit or value provided to users.",
  "outOfScope": ["List of features NOT in the MVP"],
  "successMetrics": ["Measurable indicators of success"]
}

STRICT CONSTRAINTS:
1. Respond with ONLY the raw JSON object. No markdown.
2. FORBIDDEN WORD: Do not EVER use the literal word "string" as a value in any field.
3. If a field was not explicitly discussed in the conversation, use your expertise to infer a logical, professional placeholder based on the project type (e.g., if it's an invoice tracker, infer that target users are likely freelancers or small business owners).
4. Ensure the output is valid, parseable JSON.

Conversation:
${truncateToBudget(fullConversation, 64_000)}`;

    const response = await this.client.generate(
      'You are a precise data extraction assistant. Output only valid JSON. Never include markdown, code fences, or any text outside the JSON object.',
      briefPrompt,
    );

    const cleaned = response
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return cleaned;
  }
}
