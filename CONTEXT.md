# Blueprint — AI Context File

## Project Identity

**Blueprint** is a web-based, AI-powered software development assistant that guides users from a raw idea through a structured, stage-gated engineering process. It produces optimized, self-contained prompts that users paste into their own AI coding tools (Claude, Cursor, etc.) — it does **not** generate code directly.

**Current status:** MVP complete (all 6 phases implemented). Active development with known issues.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15 (App Router) + React 18 | SSR/CSR, file-based routing |
| **Styling** | Tailwind CSS 3 + shadcn/ui (18 components) | Dark mode, Radix UI primitives |
| **Backend** | Fastify 5 + TypeScript | REST API, plugin architecture |
| **Database** | PostgreSQL 16 + Drizzle ORM 0.38 | 10 tables, JSONB for dynamic fields |
| **Auth** | Auth.js v5 (next-auth 5.0.0-beta.25) | Credentials + Google + GitHub OAuth, JWT |
| **LLM** | Google Generative AI SDK (Gemma 4) | Intake, Requirements, Security agents |
| **LLM (Alt)** | Groq SDK (Llama 3.3 70B) | Architecture, Data agents |
| **Client State** | Zustand 5 | SSE chat streaming, phase navigation |
| **Server State** | TanStack React Query 5 | Projects, requirements, tasks |
| **Payments** | Stripe Checkout + Customer Portal | Subscriptions, credit purchases |
| **Dev** | Docker Compose + Turborepo 2 | Local PostgreSQL, parallel dev servers |
| **Validation** | Zod 3.23 | Shared schemas (frontend + backend) |
| **Package Mgr** | npm 10.8.0 (npm workspaces) | Monorepo management |

---

## Directory Tree

```
blueprint/
├── .env.example
├── .gitignore
├── .prettierrc
├── BLUEPRINT-DEV-HANDOFF.md
├── CONTEXT.md                          (this file)
├── docker-compose.yml
├── package.json                        (root workspace config)
├── tsconfig.base.json
├── turbo.json
│
├── apps/
│   ├── api/                            Fastify 5 backend
│   │   ├── Dockerfile
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                (server entry, Fastify bootstrap)
│   │       ├── config.ts               (env config loader)
│   │       ├── db/
│   │       │   ├── index.ts            (Drizzle client)
│   │       │   └── schema/             (10 table definitions)
│   │       │       ├── index.ts
│   │       │       ├── users.ts
│   │       │       ├── projects.ts
│   │       │       ├── chat-messages.ts
│   │       │       ├── requirements.ts
│   │       │       ├── architecture.ts
│   │       │       ├── data.ts
│   │       │       ├── security.ts
│   │       │       ├── tasks.ts
│   │       │       └── credits.ts
│   │       ├── middleware/
│   │       │   └── auth-guard.ts       (JWT verification middleware)
│   │       ├── plugins/
│   │       │   └── auth.ts             (Fastify JWT + cookie plugin)
│   │       ├── routes/                 (15 route modules)
│   │       │   ├── health.ts
│   │       │   ├── auth.ts
│   │       │   ├── projects.ts
│   │       │   ├── phases.ts
│   │       │   ├── chat.ts
│   │       │   ├── intake.ts
│   │       │   ├── requirements.ts
│   │       │   ├── security.ts
│   │       │   ├── architecture.ts
│   │       │   ├── data.ts
│   │       │   ├── tasks.ts
│   │       │   ├── chat-messages.ts
│   │       │   ├── credits.ts
│   │       │   ├── stripe.ts
│   │       │   └── __tests__/          (empty)
│   │       └── services/
│   │           ├── auth-service.ts
│   │           ├── intake-service.ts
│   │           └── credit-service.ts
│   │
│   └── web/                            Next.js 15 frontend
│       ├── Dockerfile
│       ├── next.config.js
│       ├── package.json
│       ├── postcss.config.js
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── types/
│       │   └── next-auth.d.ts
│       └── src/
│           ├── app/
│           │   ├── globals.css
│           │   ├── layout.tsx
│           │   ├── page.tsx            (Home / Welcome)
│           │   ├── api/auth/[...nextauth]/route.ts
│           │   ├── auth/
│           │   │   ├── login/page.tsx
│           │   │   └── register/page.tsx
│           │   └── projects/
│           │       ├── page.tsx
│           │       └── [id]/
│           │           ├── intake/page.tsx
│           │           ├── requirements/page.tsx
│           │           ├── architecture/page.tsx
│           │           ├── data/page.tsx
│           │           ├── security/page.tsx
│           │           └── implement/page.tsx
│           ├── components/
│           │   ├── providers.tsx
│           │   ├── welcome-screen.tsx
│           │   ├── brief-viewer.tsx
│           │   ├── requirements-board.tsx
│           │   ├── story-card.tsx
│           │   ├── architecture-designer.tsx
│           │   ├── data-modeller.tsx
│           │   ├── checklist-viewer.tsx
│           │   ├── task-queue.tsx
│           │   ├── layout/
│           │   │   ├── app-shell.tsx
│           │   │   ├── chat-panel.tsx
│           │   │   └── phase-sidebar.tsx
│           │   └── ui/                 (18 shadcn primitives)
│           ├── hooks/
│           │   ├── use-chat.ts
│           │   └── use-project.ts
│           ├── lib/
│           │   ├── api-client.ts
│           │   ├── auth.ts
│           │   └── utils.ts
│           └── stores/
│               ├── chat-store.ts       (Zustand — SSE chat state)
│               └── project-store.ts    (Zustand — current project)
│
└── packages/
    ├── ai-engine/                      AI orchestration
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts
    │       ├── orchestrator.ts         (routes agents by phase)
    │       ├── agents/
    │       │   ├── intake-agent.ts
    │       │   ├── requirements-agent.ts
    │       │   ├── architecture-agent.ts
    │       │   ├── data-agent.ts
    │       │   └── security-agent.ts
    │       ├── llm/
    │       │   ├── gemini-client.ts    (Gemma 4 / Google AI SDK)
    │       │   └── groq-client.ts      (Llama 3.3 / Groq API)
    │       ├── prompts/
    │       │   ├── intake-system.txt
    │       │   ├── requirements-system.txt
    │       │   ├── architecture-system.txt
    │       │   ├── data-system.txt
    │       │   └── security-system.txt
    │       ├── templates/
    │       │   └── code-prompt.ts      (prompt builder for Phase 6)
    │       └── utils/
    │           ├── token-counter.ts
    │           ├── context-compressor.ts
    │           └── cache.ts
    │
    ├── shared/                         Shared types + Zod schemas
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts
    │       ├── types/
    │       │   ├── index.ts
    │       │   ├── user.ts
    │       │   ├── project.ts
    │       │   ├── phase.ts
    │       │   ├── requirement.ts
    │       │   ├── security.ts
    │       │   └── prompt.ts
    │       └── schemas/
    │           ├── index.ts
    │           ├── auth.ts
    │           ├── project.ts
    │           ├── phase.ts
    │           ├── requirement.ts
    │           ├── security.ts
    │           ├── architecture.ts
    │           └── data.ts
    │
    └── tsconfig/                       Shared tsconfig base
        └── package.json
```

---

## Architecture Overview

### Data Flow

```
Browser (React/Next.js)
  │
  ├── SSR pages (Next.js 15 App Router)
  ├── REST API calls (TanStack React Query → fetch)
  └── SSE chat stream (EventSource → Zustand store)
        │
        ▼
Fastify 5 API (port 4000)
  ├── JWT auth plugin (@fastify/jwt + @fastify/cookie)
  ├── CORS plugin
  ├── Rate limiting
  └── 15 route modules (Fastify plugin pattern)
        │
        ├── PostgreSQL 16 + Drizzle ORM (10 tables)
        └── AI Engine (@blueprint/ai-engine)
              ├── Google Generative AI (Gemma 4)
              ├── Groq API (Llama 3.3 70B)
              └── 5 agents → each reads system prompt + context → returns structured JSON
```

### AI Engine Internals

```
Orchestrator
  ├── IntakeAgent (GeminiClient)       Phase 1: conversational brief extraction
  ├── RequirementsAgent (GeminiClient) Phase 2: user story generation (MoSCoW)
  ├── ArchitectureAgent (GroqClient)   Phase 3: system architecture + Mermaid
  ├── DataAgent (GroqClient)           Phase 4: entity-relationship models
  └── SecurityAgent (GeminiClient)     Phase 5: threat assessment + checklist

Each agent:
  1. Reads system prompt from .txt file (with hardcoded fallback)
  2. Appends user context (project brief, previous phase data)
  3. Calls LLM client (generate or generateStream)
  4. Parses + validates JSON response
  5. Returns structured result

GeminiClient:
  - generate() — non-streaming completion
  - generateStream() — streaming with retry (3 attempts, exponential backoff)
  - Tracks token usage
  - Has stripReasoning() to remove Gemma 4 chain-of-thought from output

GroqClient:
  - generate() — non-streaming via Groq API
  - generateStream() — streaming via fetch + ReadableStream
  - Uses OpenAI-compatible endpoint
```

### Phase Pipeline

```
Phase 0: Foundation  →  Phase 1: Intake  →  Phase 2: Requirements  →  Phase 3: Architecture
  →  Phase 4: Data (skippable if !needsDatabase)  →  Phase 5: Security (gate — must sign off)
  →  Phase 6: Implementation
```

- Strict sequential progression enforced server-side
- Phase 4 can be skipped when `needsDatabase === false`
- Phase 5 is a mandatory sign-off gate before Phase 6
- Phase advancement is auto-detected and validated

---

## Database Schema (10 Tables)

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `users` | id (uuid PK), email (unique), name, avatar_url, hashed_password, plan_tier (free/builder/pro/team), credits_remaining | User accounts |
| `projects` | id (uuid PK), user_id (FK), name, description, status, current_phase, needs_database, needs_server, target_platform | Software projects |
| `project_briefs` | id (uuid PK), project_id (FK unique), project_name, one_line_description, problem_statement, target_users, core_value_proposition, out_of_scope (jsonb), success_metrics (jsonb), version | Phase 1 output |
| `requirements` | id (uuid PK), project_id (FK), user_story, actor, action, benefit, priority (must/should/could/wont), status, dependencies (jsonb) | MoSCoW user stories |
| `architecture_designs` | id (uuid PK), project_id (FK unique), overview, tech_stack (jsonb), patterns (jsonb), decisions (jsonb), constraints (jsonb), quality_attributes (jsonb), diagrams (text) | Phase 3 design |
| `data_models` | id (uuid PK), project_id (FK unique), entities (jsonb), relationships (jsonb), indexes (jsonb), notes | Phase 4 data model |
| `security_checklists` | id (uuid PK), project_id (FK unique), threats (jsonb), checklist (jsonb), signed_off_at, signed_off_by | Phase 5 security |
| `implementation_tasks` | id (uuid PK), project_id (FK), requirement_id (FK), sequence_order, title, objective, prompt_text, acceptance_criteria (jsonb), status, review_status | Phase 6 prompts |
| `credit_ledger` | id (uuid PK), user_id (FK), operation, amount, description | Credit usage audit |
| `chat_messages` | id (uuid PK), project_id (FK), role (user/assistant), content | Chat history |

---

## API Routes (Fastify 5)

| Route File | Endpoints | Purpose |
|-----------|-----------|---------|
| `health.ts` | `GET /api/v1/health` | DB connectivity check (public) |
| `auth.ts` | `POST register`, `POST login`, `POST oauth`, `POST refresh`, `POST logout` | JWT auth with HttpOnly cookies |
| `projects.ts` | `GET /projects`, `POST /projects`, `GET /projects/:id`, `PATCH /projects/:id`, `DELETE /projects/:id` | Project CRUD |
| `phases.ts` | `GET .../phases`, `PATCH .../phase`, `POST .../phases/enable` | Phase state management |
| `chat.ts` | `POST .../chat` (SSE stream), `POST .../intake/synthesize` | Streaming AI chat, brief synthesis |
| `intake.ts` | `PUT .../intake/brief` | Save/update project brief |
| `requirements.ts` | `GET /requirements`, `POST /requirements`, `POST .../generate`, `PATCH .../:reqId`, `DELETE .../:reqId` | CRUD + AI generation |
| `architecture.ts` | `GET /architecture`, `PUT /architecture`, `POST .../generate`, `POST .../enable-server` | Architecture CRUD + AI gen |
| `data.ts` | `GET /data`, `PUT /data`, `POST .../generate` | Data model CRUD + AI gen |
| `security.ts` | `GET /security`, `POST .../generate`, `PATCH .../item`, `POST .../sign-off` | Security checklist + sign-off |
| `tasks.ts` | `GET /tasks`, `POST .../generate`, `PATCH .../:taskId` | Implementation task generation |
| `chat-messages.ts` | `GET /messages`, `POST /messages` | Persist/load chat history |
| `credits.ts` | `GET /credits` | Get user balance + plan tier |
| `stripe.ts` | `POST .../create-checkout`, `POST .../create-portal`, `POST .../webhook` | Stripe subscriptions |

---

## Shared Types & Zod Schemas

### TypeScript Interfaces (`packages/shared/src/types/`)

| File | Key Exports | Purpose |
|------|-----------|---------|
| `user.ts` | `User`, `AuthUser`, `LoginRequest`, `RegisterRequest`, `PlanTier` | Auth models |
| `project.ts` | `Project`, `ProjectBrief`, `TargetPlatform`, `ProjectStatus` | Project models |
| `phase.ts` | `PhaseName`, `PhaseStatus`, `PhaseState`, `PhaseTransition` | Phase pipeline |
| `requirement.ts` | `Requirement`, `Priority`, `RequirementStatus` | User stories |
| `security.ts` | `Threat`, `ChecklistItem`, `ThreatSeverity` | Security models |
| `prompt.ts` | `ImplementationTask`, `GeneratedPrompt`, `TaskStatus` | Task/prompt models |

### Zod Schemas (`packages/shared/src/schemas/`)

| File | Key Exports | Validates |
|------|-----------|-----------|
| `auth.ts` | `loginSchema`, `registerSchema`, `oauthSchema`, `refreshTokenSchema` | Auth API inputs |
| `project.ts` | `createProjectSchema`, `updateProjectSchema`, `projectBriefSchema` | Project CRUD |
| `phase.ts` | `phaseTransitionSchema` | Phase transitions |
| `requirement.ts` | `createRequirementSchema`, `updateRequirementSchema` | Requirement CRUD |
| `security.ts` | `updateChecklistItemSchema`, `signOffSchema` | Security operations |
| `architecture.ts` | `architectureDesignSchema`, `techStackItemSchema`, `patternSchema`, `decisionSchema`, `qualityAttributeSchema` | Architecture design |
| `data.ts` | `dataModelSchema`, `entitySchema`, `attributeSchema`, `relationshipSchema`, `indexSchema` | Data models |

---

## Prompt Builder (Phase 6 — Implementation)

`packages/ai-engine/src/templates/code-prompt.ts` — `buildPrompt()` function assembles structured prompts with:
1. **Role definition** — "You are a senior TypeScript developer..."
2. **Context summary** — project description + tech stack
3. **Architecture context** — from Phase 3 design
4. **Data model context** — from Phase 4
5. **Security requirements** — from Phase 5 checklist
6. **Task-specific objective** — plus acceptance criteria
7. **Output format specification**

These prompts are optimized for pasting into Claude, Cursor, GitHub Copilot, etc.

---

## Credit System

| Operation | Cost (credits) |
|-----------|:------------:|
| Chat message | 1 |
| Synthesize brief | 5 |
| Generate (requirements, arch, data, security) | 5 |
| Generate tasks | 10 |

| Plan Tier | Credits |
|-----------|:-------:|
| Free | 50 |
| Builder | 500 |
| Pro | 2000 |
| Team | 8000 |

---

## Known Issues

1. No connection pooling or retry at DB startup (PostgreSQL may not be ready)
2. Generic 500 error messages (no structured error responses)
3. No test infrastructure yet (`__tests__/` directories are empty)
4. `rm -rf` in package.json scripts is incompatible with Windows (`rmdir /s /q` needed)
5. Gemma 4 is slow (17–38s for synthesize) and outputs chain-of-thought reasoning — `stripReasoning()` is heuristic-based and may fail
6. Build cache may cause stale types — `turbo clean` can help

---

## Roadmap

- Full STRIDE-based threat modelling wizard
- Compliance mapping (GDPR, PCI-DSS, HIPAA)
- Full implementation sequencer with regeneration preserving state
- Semantic caching for AI responses
- Template marketplace for prompt customization
- GitHub integration (push generated code, create PRs)
- Vercel/Railway one-click deploy
- Mobile-responsive UI
- Team Plan (SSO, 10 members)
- Observability dashboards (OpenTelemetry)

---

## Dev Commands

```bash
# Start everything (PostgreSQL + API + Web)
docker compose up

# Start dev servers directly (PostgreSQL must be running)
npm run dev          # starts both API (4000) + Web (3000) via turbo

# One-time commands
npx drizzle-kit push  # push schema to DB
npx drizzle-kit studio # open Drizzle Studio

# Known Windows issue: use these instead of package.json scripts
rmdir /s /q "apps\web\.next"      # instead of rm -rf
rmdir /s /q "packages\*\dist"     # clean builds
```

---

## Environment Variables (key)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`, `AUTH_GITHUB_ID/SECRET` | Auth.js OAuth |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Fastify JWT signing |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Google AI (Gemma 4) |
| `GROQ_API_KEY`, `GROQ_MODEL` | Groq (Llama 3.3) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Payments |
| `NEXT_PUBLIC_API_URL`, `API_PORT` | Service discovery |
