import { GeminiClient, type StreamCallback } from '../llm/gemini-client.js';
import { GroqClient } from '../llm/groq-client.js';
import { estimateTokens, truncateToBudget } from '../utils/token-counter.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function extractCleanResponse(raw: string): string {
  // Try <output> tag first
  const tagMatch = raw.match(/<output>([\s\S]*?)<\/output>/);
  const targetText = tagMatch?.[1] ? tagMatch[1] : raw;

  // Filter out reasoning/CoT/internal metadata lines, but preserve formatting and lists
  const lines = targetText.split('\n').filter(line => {
    const l = line.trim();
    if (l.length === 0) return false;

    // Filter out internal metadata/flag leakage
    if (
      l.includes('needsDatabase') ||
      l.includes('needsServer') ||
      l.includes('needsAuth') ||
      l.includes('deploymentModel')
    ) {
      return false;
    }

    // Filter out lines that look like internal instructions, CoT header, or drafts
    const lower = l.toLowerCase();
    if (
      lower.includes('instruction') ||
      lower.includes('draft') ||
      lower.includes('rule ') ||
      lower.includes('output>') ||
      lower.includes('internal logic') ||
      lower.includes('reasoning') ||
      lower.includes('chain of thought') ||
      lower.includes('thought:')
    ) {
      return false;
    }

    return true;
  });

  if (lines.length > 0) {
    return lines.join('\n').trim();
  }
  return targetText.trim();
}

export class IntakeAgent {
  private client: GeminiClient | GroqClient;
  private systemPrompt: string;

  constructor(client: GeminiClient | GroqClient) {
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
      .slice(-100)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const userContent = truncateToBudget(
      `Conversation so far:\n${contextSummary}\n\nUser message: ${userMessage}`,
    );

    if (onToken) {
      // Execute the generation stream fully to capture the complete text reliably,
      // avoiding any cut-offs or truncation bugs from chunk splits.
      const fullText = await this.client.generateStream(
        this.systemPrompt,
        userContent,
        () => {}, // discard intermediate raw tokens to prevent reasoning leakage
      );

      const cleanResponse = extractCleanResponse(fullText);

      // Stream the cleaned response to the frontend client socket with a natural typing pacing
      const words = cleanResponse.split(' ');
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (word !== undefined) {
          onToken(word + (i === words.length - 1 ? '' : ' '));
          // Micro delay for a premium interactive typing feel
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
      }

      return fullText;
    }

    const rawResponse = await this.client.generate(this.systemPrompt, userContent);
    return extractCleanResponse(rawResponse);
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
  "successMetrics": ["Measurable indicators of success"],
  "needsDatabase": null,
  "needsServer": null,
  "needsAuth": null,
  "deploymentModel": null
}

STRICT CONSTRAINTS:
1. Respond with ONLY the raw JSON object. No markdown.
2. FORBIDDEN WORD: Do not EVER use the literal word "string" as a value in any field.
3. If a field was not explicitly discussed in the conversation, use your expertise to infer a logical, professional placeholder based on the project type (e.g., if it's an invoice tracker, infer that target users are likely freelancers or small business owners). For needsDatabase, needsServer, needsAuth, and deploymentModel: use the project context and type to confidently infer and set them. Confidently set needsAuth to false for CLI tools, standalone/local bots, or local utility scripts. Set deploymentModel to 'local' for CLI tools, desktop apps, standalone scripts, or local bots; set it to 'self-hosted' for Docker, nginx, on-premise, or enterprise setups; and set it to 'cloud' for SaaS, public web apps, or typical hosted projects. Only default to null if it is truly ambiguous.
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
