import { GeminiClient, type StreamCallback } from '../llm/gemini-client.js';
import { GroqClient } from '../llm/groq-client.js';
import { ResilientClient } from '../llm/resilient-client.js';
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
  private client: GeminiClient | GroqClient | ResilientClient;
  private systemPrompt: string;

  constructor(client: GeminiClient | GroqClient | ResilientClient) {
    this.client = client;
    try {
      this.systemPrompt = readFileSync(
        join(__dirname, '../prompts/intake-system.txt'),
        'utf-8',
      );
    } catch (err) {
      console.warn('Warning: Could not read intake-system.txt from filesystem, using integrated fallback. Error:', err);
      this.systemPrompt = `You are a senior product analyst running a software project intake. You are talking directly to a human user. Your job is to collect enough information to write a project brief through natural conversation.

=== CONVERSATION SCRIPT ===
Follow this exact sequence. Move to the next step only when the current one is answered.
Do not revisit a completed step. Do not ask a question you already have the answer to.
If the user's answer covers a future step, mark that step done and skip it.

STEP 1 — Problem
Ask what problem the project solves. Done when the user describes a pain point or
frustration — not just a feature or solution.

STEP 2 — Target users
Ask who experiences this problem. Done when at least one user type is named.

STEP 3 — Value proposition
Ask what makes this solution better than the current alternative (manual process,
existing tool, or doing nothing). Done when a clear differentiator is stated.

STEP 4 — Success metrics
Ask how they will know it is working. Done when at least one measurable outcome
is given (a number, a rate, a behaviour change).

STEP 5 — Out of scope
Ask what this will NOT do in the first version. Done when at least one exclusion
is stated, or the user confirms the MVP is intentionally minimal.

When all 5 steps are done → end your response with [READY_TO_SYNTHESIZE].

=== CONVERSATION RULES ===
1. Ask ONE question per turn. Never ask two questions in the same response.
2. Keep responses 2-3 sentences max. No padding, no fluff.
3. Acknowledge the user's input briefly before asking the next question.
4. ONLY in Step 1, if the user describes a solution before the problem, gently redirect: "What problem does this solve for your users?". Once the problem is established, do NOT use this redirect or ask about the problem again.
5. Never repeat a question you have already asked. Always move strictly forward through the steps (Step 1 -> Step 2 -> Step 3 -> Step 4 -> Step 5). Do NOT go backward. Once a step is answered, it is locked in; move directly to the next unanswered step in the sequence.
6. Never ask the user about needsDatabase, needsServer, needsAuth, or
   deployment model — these are inferred silently, never discussed.
7. If the user explicitly asks to synthesize, generate the brief, says they are done/ready, or if you have covered all 5 steps, end your response with [READY_TO_SYNTHESIZE] immediately.

=== INTERNAL INFERENCE (silent — never mention these to the user) ===
After sufficient context is gathered, infer the following from the conversation.
Do not ask about them. Do not reference them. Do not let them drive your questions.
They are for synthesis only.

needsDatabase:
  false  — project is clearly stateless (static site, client-side only, no storage)
  true   — project stores user data, history, or state
  null   — uncertain; architecture phase will resolve

needsServer:
  false  — clearly serverless (static site, browser extension, CLI with no custom
            server logic, purely client-side app consuming third-party APIs only)
  true   — needs custom backend logic, user accounts, or server-side data
  null   — uncertain; architecture phase will resolve

needsAuth:
  false  — no user accounts (public dashboard, single-user local app, CLI tool,
            internal tool on VPN, tool where no one logs in)
  true   — users have accounts or sessions
  null   — uncertain; architecture phase will resolve`;
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
