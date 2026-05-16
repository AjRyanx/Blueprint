import { GeminiClient } from '../llm/gemini-client.js';
import { truncateToBudget } from '../utils/token-counter.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const STANDARD_CHECKLIST = [
  { category: 'Authentication', title: 'JWT with expiry', description: 'Use JWT tokens with short expiry (15 min) and refresh token rotation', required: true },
  { category: 'Authentication', title: 'Rate-limited login', description: 'Implement rate limiting on login endpoints to prevent brute force', required: true },
  { category: 'Authorization', title: 'Role-Based Access Control', description: 'Implement RBAC with least-privilege defaults', required: true },
  { category: 'Input Validation', title: 'Server-side validation', description: 'Validate all inputs server-side regardless of client-side validation', required: true },
  { category: 'SQL Injection', title: 'Parameterised queries', description: 'Use parameterised queries everywhere; no string concatenation in queries', required: true },
  { category: 'XSS Prevention', title: 'Output encoding + CSP', description: 'Encode all output; implement Content Security Policy headers', required: true },
  { category: 'CSRF Protection', title: 'CSRF tokens', description: 'Token-based CSRF protection on all state-changing operations', required: true },
  { category: 'Secrets Management', title: 'No hardcoded credentials', description: 'Use environment variables; never commit secrets to version control', required: true },
  { category: 'Error Handling', title: 'Safe error responses', description: 'Never expose stack traces to clients; use structured logging', required: true },
  { category: 'HTTPS', title: 'TLS everywhere', description: 'Enforce HTTPS; no mixed content', required: true },
  { category: 'Dependencies', title: 'Vulnerability scanning', description: 'Automated dependency vulnerability scanning in CI pipeline', required: true },
];

export class SecurityAgent {
  private client: GeminiClient;
  private systemPrompt: string;

  constructor(client: GeminiClient) {
    this.client = client;
    try {
      this.systemPrompt = readFileSync(
        join(__dirname, '../prompts/security-system.txt'),
        'utf-8',
      );
    } catch {
      this.systemPrompt = `You are a security architect. Given a project brief and requirements, perform a threat assessment and generate a security checklist.

1. Identify threats using STRIDE categories (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege).
2. Generate a JSON response with two fields: threats (array) and additionalChecklistItems (array).
3. Standard items are already included. Only add custom items if the project has specific risks.`;
    }
  }

  async generateChecklist(brief: string, requirements: string) {
    const content = truncateToBudget(
      `Project Brief:\n${brief}\n\nRequirements:\n${requirements}\n\nReturn a JSON object with threats and additionalChecklistItems.`,
      64_000,
    );

    const response = await this.client.generate(this.systemPrompt, content);

    let customItems;
    try {
      const parsed = JSON.parse(response);
      customItems = parsed.additionalChecklistItems ?? [];
    } catch {
      customItems = [];
    }

    return {
      threats: [],
      checklist: [...STANDARD_CHECKLIST, ...customItems],
    };
  }
}
