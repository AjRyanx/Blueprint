import { GeminiClient } from '../llm/gemini-client.js';
import { GroqClient } from '../llm/groq-client.js';
import { ResilientClient } from '../llm/resilient-client.js';
import { truncateToBudget } from '../utils/token-counter.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const UNIVERSAL_CHECKLIST = [
  {
    id: 'ops-secrets',
    category: 'Secrets Management',
    title: 'No hardcoded credentials',
    description: 'Use environment variables; never commit secrets to version control',
    required: true
  },
  {
    id: 'ops-errors',
    category: 'Error Handling',
    title: 'Safe error responses',
    description: 'Never expose stack traces or sensitive paths in error output',
    required: true
  },
  {
    id: 'ops-vuln',
    category: 'Dependencies',
    title: 'Vulnerability scanning',
    description: 'Automated dependency vulnerability scanning in CI pipeline',
    required: true
  },
];

const AUTH_CHECKLIST = [
  {
    id: 'auth-jwt',
    category: 'Authentication',
    title: 'JWT with expiry',
    description: 'Use JWT tokens with short expiry (15 min) and refresh token rotation',
    required: true
  },
  {
    id: 'auth-ratelimit',
    category: 'Authentication',
    title: 'Rate-limited login',
    description: 'Implement rate limiting on login endpoints to prevent brute force',
    required: true
  },
  {
    id: 'auth-rbac',
    category: 'Authorization',
    title: 'Role-Based Access Control',
    description: 'Implement RBAC with least-privilege defaults',
    required: true
  },
];

const SERVER_CHECKLIST = [
  {
    id: 'val-server',
    category: 'Input Validation',
    title: 'Server-side validation',
    description: 'Validate all inputs server-side regardless of client-side validation',
    required: true
  },
  {
    id: 'sec-csrf',
    category: 'CSRF Protection',
    title: 'CSRF tokens',
    description: 'Token-based CSRF protection on all state-changing operations',
    required: true
  },
];

const DEPLOYMENT_CHECKLISTS = {
  cloud: [
    {
      id: 'ops-https',
      category: 'HTTPS',
      title: 'TLS everywhere',
      description: 'Enforce HTTPS; no mixed content',
      required: true
    },
    {
      id: 'sec-csp',
      category: 'Content Security Policy',
      title: 'CSP headers',
      description: 'Implement Content Security Policy via meta tag or hosting config',
      required: true
    },
  ],
  'self-hosted': [
    {
      id: 'sec-network',
      category: 'Network Security',
      title: 'Network security & firewall',
      description: 'Enforce strict firewall rules, close unused ports, and restrict access',
      required: true
    },
    {
      id: 'sec-backup',
      category: 'Backup & Recovery',
      title: 'Backup & disaster recovery',
      description: 'Configure automated encrypted backups with offline or offsite replication',
      required: true
    },
    {
      id: 'sec-vpn',
      category: 'Network Isolation',
      title: 'VPN or Internal CA isolation',
      description: 'Ensure internal administration endpoints are behind VPN or require a trusted certificate authority',
      required: true
    },
    {
      id: 'sec-logs',
      category: 'Logging',
      title: 'Log aggregation',
      description: 'Aggregate system, access, and security logs to a central read-only log store',
      required: true
    },
  ],
  local: [
    {
      id: 'sec-local-fs',
      category: 'File System Security',
      title: 'Local filesystem permissions',
      description: 'Restrict access permissions to local files and application resources to only the running user',
      required: true
    },
    {
      id: 'sec-local-isolation',
      category: 'Isolation',
      title: 'Single-user isolation',
      description: 'Ensure the application process prevents concurrent multi-user hijack of system resources',
      required: true
    },
    {
      id: 'sec-local-surface',
      category: 'Attack Surface',
      title: 'No remote attack surface',
      description: 'Configure bundled services to bind solely to loopback (127.0.0.1) unless remote access is explicitly intended',
      required: true
    },
    {
      id: 'sec-local-update',
      category: 'Updates',
      title: 'Secure update mechanism',
      description: 'Confirm integrity of update payloads via signature verification before applying local code upgrades',
      required: true
    },
  ],
};

const DATABASE_CHECKLIST = [
  {
    id: 'sec-sql',
    category: 'SQL Injection',
    title: 'Parameterised queries',
    description: 'Use parameterised queries everywhere; no string concatenation in queries',
    required: true
  },
];

const CLI_CHECKLIST = [
  {
    id: 'cli-arg-injection',
    category: 'Input Security',
    title: 'Argument injection prevention',
    description: 'Sanitise all CLI arguments before passing to shell commands or subprocesses. Never use string concatenation to build shell commands — use execFile with argument arrays instead.',
    required: true
  },
  {
    id: 'cli-path-hijack',
    category: 'Runtime Security',
    title: 'PATH hijacking prevention',
    description: 'Use absolute paths for all subprocess calls. Do not rely on PATH resolution for security-critical executables.',
    required: true
  },
  {
    id: 'cli-shell-history',
    category: 'Secrets Handling',
    title: 'Sensitive data in shell history',
    description: 'Never accept passwords, tokens, or secrets as CLI arguments — they appear in shell history and ps output. Use environment variables or interactive prompts (e.g. prompts, inquirer) instead.',
    required: true
  },
  {
    id: 'cli-path-traversal',
    category: 'File Security',
    title: 'File path traversal prevention',
    description: 'Validate and sanitise all file path arguments. Resolve paths with path.resolve() and confirm they fall within the intended directory before reading or writing.',
    required: true
  },
  {
    id: 'cli-output-encoding',
    category: 'Output Security',
    title: 'Output encoding',
    description: 'Encode or sanitise output written to terminals, files, or piped to other processes. Do not write unsanitised user input to stdout when the output may be consumed by another program.',
    required: true
  },
];

export class SecurityAgent {
  private client: GeminiClient | GroqClient | ResilientClient;
  private systemPrompt: string;

  constructor(client: GeminiClient | GroqClient | ResilientClient) {
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

  async generateChecklist(
    brief: string,
    requirements: string,
    needsDatabase: boolean = true,
    needsServer: boolean = true,
    targetPlatform: string = 'web',
    needsAuth: boolean = true,
    deploymentModel: string | null = 'cloud'
  ) {
    const model = (deploymentModel === null || deploymentModel === undefined) ? 'cloud' : deploymentModel;

    const content = truncateToBudget(
      `Project Brief:\n${brief}\n\nRequirements:\n${requirements}\n\nProject Flags:\n- targetPlatform: ${targetPlatform}\n- deploymentModel: ${model}\n- needsAuth: ${needsAuth}\n- needsServer: ${needsServer}\n- needsDatabase: ${needsDatabase}\n\nReturn a JSON object with threats and additionalChecklistItems.`,
      64_000,
    );

    const response = await this.client.generate(this.systemPrompt, content);

    let threats: any[] = [];
    let customItems: any[] = [];
    try {
      let cleanedResponse = response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const firstBrace = cleanedResponse.indexOf('{');
      if (firstBrace !== -1) {
        let depth = 0;
        let start = firstBrace;
        let end = -1;
        for (let i = start; i < cleanedResponse.length; i++) {
          if (cleanedResponse[i] === '{') depth++;
          else if (cleanedResponse[i] === '}') {
            depth--;
            if (depth === 0) { end = i + 1; break; }
          }
        }
        if (end !== -1) {
          cleanedResponse = cleanedResponse.substring(start, end);
        }
      }
      const parsed = JSON.parse(cleanedResponse);
      threats = parsed.threats ?? [];
      customItems = (parsed.additionalChecklistItems ?? []).map((item: any, idx: number) => ({
        ...item,
        id: item.id || `custom-${idx}`,
        passed: false,
      }));
    } catch {
      customItems = [];
    }

    const isCLI = targetPlatform === 'cli';
    const deploymentItems = (DEPLOYMENT_CHECKLISTS as any)[model] ?? DEPLOYMENT_CHECKLISTS.cloud;

    return {
      threats,
      checklist: [
        ...UNIVERSAL_CHECKLIST,
        ...(isCLI ? CLI_CHECKLIST : []),
        ...(!isCLI ? deploymentItems : []),
        ...(needsAuth ? AUTH_CHECKLIST : []),
        ...(needsServer ? SERVER_CHECKLIST : []),
        ...(needsServer && needsDatabase ? DATABASE_CHECKLIST : []),
        ...customItems,
      ],
    };
  }
}
