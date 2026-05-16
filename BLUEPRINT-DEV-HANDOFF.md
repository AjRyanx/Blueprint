# Blueprint — Developer Handoff Document

**Version 0.1.0**  
**Status:** Phase 0 (Foundation) + Phase 1 (MVP Core) + Phase 3 (Architecture) + Phase 4 (Data Modelling) — Complete  
**Last Updated:** May 2026

---

## 1. Project Overview

Blueprint is a web-based, AI-powered software development assistant that guides users from a raw idea through a structured, stage-gated engineering process. It does not simply generate code — it guides users through product definition, requirements engineering, system architecture, data modelling, security planning, and iterative implementation, producing well-structured prompts that feed into a code generation layer in exactly the right order and granularity.

The current build covers **Phase 0 (Foundation)**, **Phase 1 (MVP Core)**, **Phase 3 (System Architecture Design)**, and **Phase 4 (Data Modelling)** of the Product Design Document — 130+ source files across 4 workspace packages. The six-phase pipeline (Idea Capture → Requirements → Architecture → Data Modelling → Security → Implementation) has four phases fully functional, with the security gate implemented and the implementation dashboard producing optimised prompts.

---

## 2. Architecture at a Glance

### 2.1 Monorepo Layout

```
blueprint/
├── apps/
│   ├── web/                    # Next.js 14 App Router — 38 files
│   │   ├── src/app/            # Pages, layouts, route handlers
│   │   ├── src/components/     # React components (ui/ + layout/ + feature/)
│   │   ├── src/hooks/          # React Query hooks, SSE chat hook
│   │   ├── src/stores/         # Zustand stores (chat, project state)
│   │   └── src/lib/            # Utilities, auth config, API client
│   └── api/                    # Fastify 5 backend — 22 files
│       ├── src/routes/         # All REST endpoints (10 route files)
│       ├── src/services/       # Business logic (auth, intake, credits)
│       ├── src/db/schema/      # Drizzle schema (6 tables)
│       ├── src/plugins/        # Fastify plugins (auth/JWT)
│       └── src/middleware/     # Auth guards, request validation
├── packages/
│   ├── shared/                 # Shared types + Zod schemas — 14 files
│   │   ├── src/types/          # TypeScript interfaces
│   │   └── src/schemas/        # Zod validation schemas
│   ├── ai-engine/              # LLM agent system — 13 files
│   │   ├── src/agents/         # IntakeAgent, RequirementsAgent, SecurityAgent
│   │   ├── src/llm/            # Gemini client wrapper
│   │   ├── src/prompts/        # System prompt templates
│   │   ├── src/templates/      # §5.6.2 prompt builder (code-prompt.ts)
│   │   └── src/utils/          # Token counter, context compressor, cache
│   └── tsconfig/               # Shared TypeScript configuration
├── docker-compose.yml          # PostgreSQL + API + Web
├── turbo.json                  # Turborepo pipeline
├── package.json                # Workspace root
└── .env.example                # Environment variable template
```

### 2.2 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 14 + Tailwind CSS + shadcn/ui | SSR performance, mature ecosystem, 18 pre-installed UI components |
| Backend | Fastify 5 + TypeScript | High performance, shared types with frontend, plugin architecture |
| Database | PostgreSQL 16 + Drizzle ORM | JSONB for dynamic `_json` fields, SQL-first API, native RLS support |
| Auth | Auth.js v5 (next-auth@5.0.0-beta.25) | Credentials + Google + GitHub OAuth, JWT sessions, Next.js-native |
| LLM | Google Gemma 4 (gemma-4-26b-a4b-it) | Gemma 4 via Google Generative AI API (all Gemini models exhausted free-tier quota). 8K-32K context, reasoning leak requires server-side stripping |
| Client State | Zustand 5 | SSE chat streaming, phase navigation UI |
| Server State | TanStack React Query 5 | Project data, requirements, tasks — persisted, cached, refetchable |
| Payments | Stripe Checkout + Customer Portal | PCI-compliant, fast integration, subscription management |
| Dev Environment | Docker Compose + Turborepo | Local PostgreSQL, parallel dev servers, incremental builds |
| Package Manager | npm 10.8.0 (npm workspaces) | Monorepo support, zero additional tooling |

### 2.3 Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Code generation mode | **Prompt-only** | Blueprint generates optimised prompts for users to paste into their own AI tool (Claude, Cursor, etc.). No direct LLM code gen calls. This rewrites Phase 6 from the original PDD — the prompt generator is a template engine, not an LLM wrapper. |
| ORM | **Drizzle** (overrides PDD's Prisma) | Better JSONB typing for `outOfScope`, `threats`, `checklist`, `dependencies` fields. SQL-first approach, smaller bundle, native PostgreSQL feel. |
| LLM streaming | **SSE (Server-Sent Events)** | Simpler than WebSockets for unidirectional streaming. HTTP-only, works through all proxies, native `EventSource` support in browsers. |
| Context management | **Token budget estimation** | Every LLM call estimates tokens beforehand, splits tasks if >70% of context window (128K), compresses prior phase outputs to summaries. |
| Security gate | **Phase 5 sign-off required** | Phase 6 (Implementation) is locked until all required security checklist items are passed and signed off. Enforced server-side. |
| Reasoning stripping | **Server-side buffer + strip** | Gemma 4 outputs chain-of-thought reasoning before the actual response. The chat route buffers all tokens, strips reasoning via `stripReasoning()`, then sends chunks. Pattern: quoted response at end, or filter bullet-point lines. |
| State architecture | **React Query + Zustand** | React Query handles server data (fetch, cache, persist). Zustand handles streaming/UI state (chat messages in-flight, sidebar open/closed). |
| Package manager | **npm workspaces over pnpm/yarn** | Zero additional tooling, all devs have npm, sufficient for current monorepo scale. |

---

## 3. Complete Implementation Map

### 3.1 Phase 0: Foundation (Steps 0.1–0.8)

| Step | Module | Key Files | Description |
|------|--------|-----------|-------------|
| 0.1 | Monorepo scaffold | `package.json`, `turbo.json`, `docker-compose.yml`, `tsconfig.base.json`, `.prettierrc`, `.gitignore`, `.env.example` | Turborepo pipeline, npm workspaces config, Docker Compose for Postgres + API + Web, shared TypeScript configuration |
| 0.2 | Shared types + Zod | `packages/shared/src/types/*`, `packages/shared/src/schemas/*` | All type definitions from PDD §6.3: User, Project, ProjectBrief, Requirement, SecurityChecklist, ImplementationTask, CreditLedger + Zod validation for all API inputs. **Now also includes:** architecture, data model schemas |
| 0.3 | UI scaffold | `apps/web/src/app/layout.tsx`, `globals.css`, `components/ui/*` (18 shadcn components), `components/providers.tsx`, `stores/*`, `hooks/*` | Next.js App Router shell, Tailwind CSS with dark mode, shadcn component library, React Query + Session + Tooltip providers, Zustand stores for chat + project |
| 0.4 | Database schema | `apps/api/src/db/schema/*` (9 files) | Drizzle PostgreSQL schema: `users`, `projects` + `project_briefs`, `requirements`, `security_checklists`, `implementation_tasks`, `credit_ledger`, **`architecture_designs`**, **`data_models`**, **`chat_messages`**. JSONB for dynamic fields, UUID primary keys, indexes on foreign keys |
| 0.5 | Auth system | `apps/api/src/routes/auth.ts`, `services/auth-service.ts`, `plugins/auth.ts`, `apps/web/src/lib/auth.ts`, `apps/web/src/app/api/auth/[...nextauth]/route.ts`, `apps/web/src/app/auth/login/page.tsx`, `register/page.tsx` | Fastify JWT plugin with bcrypt (cost 12), access tokens (15m) + refresh tokens (30d) in HttpOnly cookies. Auth.js v5 for Next.js with credentials + Google + GitHub OAuth providers. Login and register pages |
| 0.6 | Base API | `apps/api/src/index.ts`, `routes/health.ts`, `routes/projects.ts`, `routes/phases.ts` | Fastify server entry, health check endpoint (DB connectivity), full project CRUD, phase state management with progression validation |
| 0.7 | LLM integration | `packages/ai-engine/src/llm/gemini-client.ts`, `utils/token-counter.ts`, `utils/context-compressor.ts`, `utils/cache.ts` | Google Generative AI SDK wrapper with retry (3 attempts, exponential backoff), streaming support, token estimation, context budget splitting, conversation compression, semantic cache |
| 0.8 | AI Engine agents | `packages/ai-engine/src/orchestrator.ts`, `agents/intake-agent.ts`, `agents/requirements-agent.ts`, `agents/security-agent.ts`, `prompts/*.txt` | Multi-agent orchestrator. IntakeAgent — conversational extraction of project brief. RequirementsAgent — user story generation from brief. SecurityAgent — threat assessment + checklist generation. All agents have dedicated system prompts |

### 3.2 Phase 1: MVP Core (Steps 1.1–1.10)

| Step | Module | Key Files | Description |
|------|--------|-----------|-------------|
| 1.1 | Intake API + SSE | `apps/api/src/routes/chat.ts`, `services/intake-service.ts`, `routes/intake.ts` | SSE streaming chat endpoint that relays messages to IntakeAgent via Gemma 4 stream, returns tokens in real-time. **Reasoning stripping applied server-side** — buffers all tokens then filters chain-of-thought before sending chunks. Brief synthesis endpoint (conversation → structured JSON). Brief save/update endpoint |
| 1.2 | Project Brief UI | `apps/web/src/components/brief-viewer.tsx`, `apps/web/src/app/projects/[id]/intake/page.tsx` | Editable brief viewer with inline editing, add/remove list items for out-of-scope + success metrics, version tracking, synthesize button appears after 5+ messages. **"Create Manually" button** creates empty brief object and opens BriefViewer for manual editing without AI |
| 1.3 | Requirements API | `apps/api/src/routes/requirements.ts` | AI-generated user stories from brief (via RequirementsAgent). Manual CRUD endpoints. Zod-validated input, user story parsing (actor/action/benefit extraction) |
| 1.4 | Requirements UI | `apps/web/src/components/requirements-board.tsx`, `story-card.tsx`, `apps/web/src/app/projects/[id]/requirements/page.tsx` | 4-column MoSCoW Kanban board (Must/Should/Could/Won't). Drag-to-create, AI generate from brief, individual story cards with priority badges + dependency display |
| 1.5 | Security checklist API | `apps/api/src/routes/security.ts` | Checklist generation using SecurityAgent (11 standard items from PDD §5.5.2). Per-item pass/fail update. Sign-off endpoint validates all required items passed before proceeding |
| 1.6 | Security checklist UI | `apps/web/src/components/checklist-viewer.tsx`, `apps/web/src/app/projects/[id]/security/page.tsx` | Categorized checklist grouped by domain (Authentication, Authorization, Input Validation, etc.). Progress bar, per-item checkbox with description, sign-off button with pre-validation, success alert on completion |
| 1.7 | Prompt generator | `packages/ai-engine/src/templates/code-prompt.ts` | §5.6.2 template engine — builds structured prompts with role definition, context summary, task specification, technical constraints, security requirements, output format, acceptance criteria. Pure TypeScript, no LLM calls |
| 1.8 | Implementation dashboard | `apps/web/src/components/task-queue.tsx`, `apps/web/src/app/projects/[id]/implement/page.tsx` | Task queue sorted by sequence order. Prompt viewer with syntax-highlighted pre block. One-click copy per task, bulk export as .txt file. Status tracking (pending/ready/accepted/rejected), requirement cross-reference |
| 1.9 | Credit system + Stripe | `apps/api/src/services/credit-service.ts`, `routes/credits.ts`, `routes/stripe.ts` | Credit ledger with per-operation costs (chat=1, synthesize=5, generate=5, generate_tasks=10). Stripe Checkout session creation, Customer Portal, webhook handler for subscription lifecycle. Plan limits (free=50, builder=500, pro=2000, team=8000 credits) |
| 1.10 | Onboarding flow | `apps/web/src/components/welcome-screen.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/projects/page.tsx` | 3-persona selector (Graduate Builder / Technical Founder / Adjacent Professional) with tone badges. Two-step flow: persona → project name. Projects listing page with phase indicators. Redirect to intake on project creation |

### 3.3 Phase 3: System Architecture Design (Built from scratch)

| Step | Module | Key Files | Description |
|------|--------|-----------|-------------|
| 3.1 | Architecture DB schema | `apps/api/src/db/schema/architecture.ts` | `architecture_designs` table with `project_id` (FK, unique), `overview`, `tech_stack` (jsonb), `architectural_patterns` (jsonb), `key_decisions` (jsonb), `constraints` (jsonb), `quality_attributes` (jsonb), `mermaid_diagrams` (jsonb). JSONB for all structured fields. Pushed with `npx drizzle-kit push` |
| 3.2 | Architecture API | `apps/api/src/routes/architecture.ts` | `GET /api/v1/projects/:id/architecture` — fetch architecture design. `PUT /api/v1/projects/:id/architecture` — save/update. Zod-validated schemas from `packages/shared/src/schemas/architecture.ts` |
| 3.3 | Architecture UI | `apps/web/src/components/architecture-designer.tsx`, `apps/web/src/app/projects/[id]/architecture/page.tsx` | Full form editor with sections: overview (textarea), tech stack (add/remove items with name + description per layer), architectural patterns (select + description), key decisions (add/remove with title, context, decision, consequences), constraints (add/remove), quality attributes (add/remove with category), Mermaid diagrams (add/remove with title + DSL code) |

### 3.4 Phase 4: Data Modelling (Built from scratch)

| Step | Module | Key Files | Description |
|------|--------|-----------|-------------|
| 4.1 | Data model DB schema | `apps/api/src/db/schema/data.ts` | `data_models` table with `project_id` (FK, unique), `entities` (jsonb — array of { name, description, attributes[], relationships[], indexes[], notes }). JSONB for all structured fields |
| 4.2 | Data model API | `apps/api/src/routes/data.ts` | `GET /api/v1/projects/:id/data` — fetch data model. `PUT /api/v1/projects/:id/data` — save/update. Zod-validated schemas from `packages/shared/src/schemas/data.ts` |
| 4.3 | Data model UI | `apps/web/src/components/data-modeller.tsx`, `apps/web/src/app/projects/[id]/data/page.tsx` | Entity editor with: entity list (add/remove), attribute editor (name, type, primary key, foreign key, unique, nullable, default), relationship editor (type: 1:1/1:N/M:N, source entity, target entity, source attribute, target attribute, label), indexes (add/remove with columns + unique flag), notes per entity |

### 3.5 Chat Persistence (Cross-cutting)

| Step | Module | Key Files | Description |
|------|--------|-----------|-------------|
| — | Chat messages DB | `apps/api/src/db/schema/chat-messages.ts` | `chat_messages` table with `id` (uuid), `project_id` (FK), `role` (user/assistant), `content` (text), `created_at` (timestamp) |
| — | Chat messages API | `apps/api/src/routes/chat-messages.ts` | `GET /api/v1/projects/:id/messages` — load persisted messages. `POST /api/v1/projects/:id/messages` — save a message. Both routes are JWT-authenticated |
| — | Chat persistence hooks | `apps/web/src/hooks/use-chat.ts`, `apps/web/src/stores/chat-store.ts` | `use-chat` hook loads messages on mount via `GET /messages`, saves each user + assistant message to DB after sending. `chat-store.ts` added `setMessages()` for hydration from DB |

---

## 4. API Reference

### 4.1 Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/register` | Public | Create account. Body: `{ email, password, name }`. Returns: `{ user, accessToken }` + refresh cookie |
| `POST` | `/api/v1/auth/login` | Public | Sign in. Body: `{ email, password }`. Returns: `{ user, accessToken }` + refresh cookie |
| `POST` | `/api/v1/auth/oauth` | Public | OAuth sync for Google/GitHub. Body: `{ email, name, avatarUrl?, provider }` |
| `POST` | `/api/v1/auth/refresh` | Public (cookie) | Refresh access token. Reads `refreshToken` cookie |
| `POST` | `/api/v1/auth/logout` | Public | Clears refresh cookie |

### 4.2 Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/health` | Public | Returns `{ status, database }` — checks DB connectivity with `SELECT 1` |

### 4.3 Projects

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/projects` | Required | List user's projects (ordered by created_at desc) |
| `POST` | `/api/v1/projects` | Required | Create project. Body: `{ name, description? }` |
| `GET` | `/api/v1/projects/:id` | Required | Get project + associated brief |
| `PATCH` | `/api/v1/projects/:id` | Required | Update project name/description/status |
| `DELETE` | `/api/v1/projects/:id` | Required | Soft-delete project |

### 4.4 Phases

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/projects/:id/phases` | Required | List all 6 phases with status (locked/active/completed) |
| `PATCH` | `/api/v1/projects/:id/phase` | Required | Advance phase. Body: `{ toPhase }`. Only allows current → next |

### 4.5 Intake & Chat

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/projects/:id/chat` | Required | SSE streaming chat. Body: `{ message, history? }`. Returns text/event-stream |
| `POST` | `/api/v1/projects/:id/intake/synthesize` | Required | Generate brief JSON from conversation history. Body: `{ conversation: [{ role, content }] }` |
| `PUT` | `/api/v1/projects/:id/intake/brief` | Required | Save/update project brief. Body matches `ProjectBriefInput` schema |

### 4.6 Requirements

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/projects/:id/requirements` | Required | List all requirements for project |
| `POST` | `/api/v1/projects/:id/requirements` | Required | Create requirement manually. Body: `{ userStory, priority, dependencies? }` |
| `POST` | `/api/v1/projects/:id/requirements/generate` | Required | AI-generate requirements from project brief. Creates multiple requirements |
| `PATCH` | `/api/v1/projects/:id/requirements/:reqId` | Required | Update requirement fields or priority |
| `DELETE` | `/api/v1/projects/:id/requirements/:reqId` | Required | Delete requirement |

### 4.7 Security

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/projects/:id/security` | Required | Get security checklist (threats + checklist items) |
| `POST` | `/api/v1/projects/:id/security/generate` | Required | AI-generate checklist from brief + requirements |
| `PATCH` | `/api/v1/projects/:id/security/item` | Required | Update single checklist item. Body: `{ itemId, passed, notes? }` |
| `POST` | `/api/v1/projects/:id/security/sign-off` | Required | Sign off checklist. Validates all required items passed. Returns error if not |

### 4.8 Implementation Tasks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/projects/:id/tasks` | Required | List tasks sorted by sequence_order |
| `POST` | `/api/v1/projects/:id/tasks/generate` | Required | Generate tasks from must-have requirements. Deletes + recreates all tasks |

### 4.9 Architecture

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/projects/:id/architecture` | Required | Fetch architecture design (overview, tech stack, patterns, decisions, constraints, quality attributes, diagrams) |
| `PUT` | `/api/v1/projects/:id/architecture` | Required | Save/update architecture design. Body matches `ArchitectureDesignInput` schema |

### 4.10 Data Models

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/projects/:id/data` | Required | Fetch data model (entities with attributes, relationships, indexes, notes) |
| `PUT` | `/api/v1/projects/:id/data` | Required | Save/update data model. Body matches `DataModelInput` schema |

### 4.11 Chat Messages

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/projects/:id/messages` | Required | Load all persisted chat messages for project (ordered by created_at) |
| `POST` | `/api/v1/projects/:id/messages` | Required | Save a chat message. Body: `{ role, content }` |

### 4.12 Credits & Stripe

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/credits` | Required | Get credit balance + plan tier |
| `POST` | `/api/v1/stripe/create-checkout` | Required | Create Stripe Checkout session. Body: `{ priceId }` |
| `POST` | `/api/v1/stripe/create-portal` | Required | Create Customer Portal session |
| `POST` | `/api/v1/stripe/webhook` | Webhook | Stripe event handler (checkout.session.completed → upgrade plan + add credits) |

### 4.13 API Response Format

All endpoints return a consistent envelope:

```typescript
// Success:
{ success: true, data: T, meta?: Record<string, unknown> }

// Error:
{ success: false, error: string }
```

Pagination-ready via `meta` object on list endpoints. All POST/PATCH endpoints validate with Zod schemas from `@blueprint/shared`.

---

## 5. Database Schema

### 5.1 Entity Overview

9 tables in `apps/api/src/db/schema/`:

```
users
├── id (uuid, PK)
├── email (varchar 255, unique)
├── name (varchar 255, nullable)
├── avatar_url (varchar 512, nullable)
├── hashed_password (varchar 255, nullable — null for OAuth-only users)
├── plan_tier (varchar 20, default 'free')
├── credits_remaining (integer, default 50)
├── created_at (timestamp)
└── updated_at (timestamp)

projects
├── id (uuid, PK)
├── user_id (uuid, FK → users, cascade delete)
├── name (varchar 255)
├── description (text, nullable)
├── status (varchar 20, default 'active')
├── current_phase (integer, default 1)
├── created_at (timestamp)
└── updated_at (timestamp)

project_briefs
├── id (uuid, PK)
├── project_id (uuid, FK → projects, cascade delete, unique)
├── project_name (varchar 255)
├── one_line_description (text)
├── problem_statement (text)
├── target_users (text)
├── core_value_proposition (text)
├── out_of_scope (jsonb, default [])
├── success_metrics (jsonb, default [])
├── version (integer, default 1)
├── created_at (timestamp)
└── updated_at (timestamp)

requirements
├── id (uuid, PK)
├── project_id (uuid, FK → projects, cascade delete)
├── user_story (text)
├── actor (varchar 255)
├── action (text)
├── benefit (text)
├── priority (varchar 20: must/should/could/wont)
├── status (varchar 20, default 'draft')
├── dependencies (jsonb, default [])
├── created_at (timestamp)
└── updated_at (timestamp)

security_checklists
├── id (uuid, PK)
├── project_id (uuid, FK → projects, cascade delete, unique)
├── threats (jsonb, default []) — array of { category, description, severity, mitigation }
├── checklist (jsonb, default []) — array of { id, category, title, description, required, passed, notes }
├── signed_off_at (timestamp, nullable)
├── signed_off_by (uuid, nullable)
├── created_at (timestamp)
└── updated_at (timestamp)

implementation_tasks
├── id (uuid, PK)
├── project_id (uuid, FK → projects, cascade delete)
├── requirement_id (uuid, FK → requirements, cascade delete)
├── sequence_order (integer)
├── title (varchar 255)
├── objective (text)
├── prompt_text (text, nullable)
├── acceptance_criteria (jsonb, default [])
├── status (varchar 20: pending/ready/generated/accepted/rejected)
├── review_status (varchar 20: pending/passed/failed)
├── created_at (timestamp)
└── updated_at (timestamp)

credit_ledger
├── id (uuid, PK)
├── user_id (uuid, FK → users, cascade delete)
├── operation (varchar 50 — e.g., 'chat_message', 'purchase')
├── amount (integer — negative for debits, positive for credits)
├── description (text, nullable)
└── created_at (timestamp)

architecture_designs
├── id (uuid, PK)
├── project_id (uuid, FK → projects, cascade delete, unique)
├── overview (text, nullable)
├── tech_stack (jsonb, default '[]') — array of { layer, name, description }
├── architectural_patterns (jsonb, default '[]') — array of { pattern, description }
├── key_decisions (jsonb, default '[]') — array of { title, context, decision, consequences }
├── constraints (jsonb, default '[]') — array of { constraint, description }
├── quality_attributes (jsonb, default '[]') — array of { attribute, description, category }
├── mermaid_diagrams (jsonb, default '[]') — array of { title, code }
├── created_at (timestamp)
└── updated_at (timestamp)

data_models
├── id (uuid, PK)
├── project_id (uuid, FK → projects, cascade delete, unique)
├── entities (jsonb, default '[]') — array of { id, name, description, attributes[], relationships[], indexes[], notes }
├── created_at (timestamp)
└── updated_at (timestamp)

chat_messages
├── id (uuid, PK)
├── project_id (uuid, FK → projects, cascade delete)
├── role (varchar 20 — 'user' or 'assistant')
├── content (text)
└── created_at (timestamp)
```

### 5.2 Indexes

- `users_email_idx` — on `users.email`
- `projects_user_id_idx` — on `projects.user_id`
- `brief_project_id_idx` — on `project_briefs.project_id`
- `requirements_project_id_idx` — on `requirements.project_id`
- `security_project_id_idx` — on `security_checklists.project_id`
- `tasks_project_id_idx` — on `implementation_tasks.project_id`
- `tasks_requirement_id_idx` — on `implementation_tasks.requirement_id`
- `credits_user_id_idx` — on `credit_ledger.user_id`
- `arch_project_id_idx` — on `architecture_designs.project_id`
- `data_project_id_idx` — on `data_models.project_id`
- `chat_project_id_idx` — on `chat_messages.project_id`

---

## 6. Environment Variables

### 6.1 Reference Table

| Variable | Required | Used By | Default / Example |
|----------|----------|---------|-------------------|
| `DATABASE_URL` | Yes | API | `postgresql://blueprint:blueprint@localhost:5433/blueprint` |
| `AUTH_SECRET` | Yes | Web | Auto-generated via `openssl rand -base64 32` |
| `AUTH_URL` | Yes | Web | `http://localhost:3000` |
| `AUTH_GOOGLE_ID` | For Google OAuth | Web | From Google Cloud Console |
| `AUTH_GOOGLE_SECRET` | For Google OAuth | Web | From Google Cloud Console |
| `AUTH_GITHUB_ID` | For GitHub OAuth | Web | From GitHub OAuth App settings |
| `AUTH_GITHUB_SECRET` | For GitHub OAuth | Web | From GitHub OAuth App settings |
| `JWT_ACCESS_SECRET` | Yes | API | Any secure random string (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes | API | Any secure random string (min 32 chars) |
| `GEMINI_API_KEY` | Yes | API, ai-engine | From Google AI Studio |
| `GEMINI_MODEL` | No | API, ai-engine | `gemma-4-26b-a4b-it` (default — switched from Gemini after quota exhaustion) |
| `STRIPE_SECRET_KEY` | For payments | API | `sk_test_...` from Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | For payments | API | `whsec_...` from Stripe webhook settings |
| `STRIPE_PUBLISHABLE_KEY` | For payments | Web | `pk_test_...` from Stripe dashboard |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | For payments | Web | Same as `STRIPE_PUBLISHABLE_KEY` |
| `NEXT_PUBLIC_API_URL` | Yes | Web | `http://localhost:4000` |
| `API_PORT` | No | API | `4000` (default) |
| `NODE_ENV` | No | Both | `development` (default) |
| `NEXT_IGNORE_INCORRECT_LOCKFILE` | Windows only | Web | `1` — suppresses Next.js SWC lockfile patcher bug |

### 6.2 Where Env Files Live

- **Root `.env`:** Reference template only. Next.js does NOT load `.env` from workspace root.
- **`apps/web/.env.local`:** Loaded by Next.js. Must contain all `AUTH_*`, `NEXT_PUBLIC_*`, and `NEXT_IGNORE_INCORRECT_LOCKFILE` vars.
- **`apps/api/.env`:** Loaded by the API via `dotenv` at startup.

---

## 7. Getting Started for New Developers

### 7.1 Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **Docker Desktop** (for PostgreSQL — or use a remote DB)
- **Git**

### 7.2 Setup

```bash
# Clone the repository
git clone <repo-url> blueprint
cd blueprint

# Install all workspace dependencies
npm install

# Copy environment template and fill in your API keys
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local with your keys (see §6.1)

# Create apps/api/.env with the same values
cp .env.example apps/api/.env

# Start PostgreSQL
docker-compose up -d postgres

# Push database schema
npm run db:push

# Start development servers (web:3000 + api:4000)
npm run dev
```

### 7.3 Common Workflows

```bash
# Run only the API
npm run dev --workspace=@blueprint/api

# Run only the web app
npm run dev --workspace=@blueprint/web

# Generate new Drizzle migration after schema changes
cd apps/api
npx drizzle-kit generate

# Push schema changes to local DB
npm run db:push

# Open Drizzle Studio (GUI database browser)
npm run db:studio

# Type-check all packages
npm run typecheck

# Format all files
npm run format
```

### 7.4 First-Time User Flow

After setup, navigate to `http://localhost:3000`:

1. Register an account → redirected to welcome screen
2. Select a persona (Graduate Builder / Technical Founder / Adjacent Professional)
3. Name your project → redirected to Phase 1 (Intake)
4. Chat with Blueprint Assistant to describe your idea
5. Click "Generate Project Brief" after 5+ messages
6. Edit the brief, then proceed to Phase 2 (Requirements)
7. Generate requirements from brief or add manually
8. Proceed through Phase 5 (Security) — mark items, sign off
9. Phase 6 (Implementation) — generate tasks, copy prompts to your AI tool

---

## 8. Common Issues & Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| API returns 500 on signup/login/project creation | PostgreSQL not running | `docker-compose up -d postgres` + wait 5s for health check |
| API won't start — `EADDRINUSE` | Previous process still on port 4000 | Kill Node processes: `Get-Process -Name "node" \| Stop-Process -Force` (Windows) |
| Next.js SWC patcher error on startup | Next.js 14.2 Windows bug | `.env.local` must contain `NEXT_IGNORE_INCORRECT_LOCKFILE=1` |
| Auth callback returns error | `AUTH_SECRET` mismatch between `.env.local` and runtime | Use same `AUTH_SECRET` everywhere. Regenerate with `openssl rand -base64 32` |
| GitHub OAuth fails | Missing or incorrect GitHub App credentials | Check `AUTH_GITHUB_ID` + `AUTH_GITHUB_SECRET` in `.env.local`. Homepage URL must match |
| Gemini API returns 403/429 | Invalid or exhausted API key | Verify `GEMINI_API_KEY` in `.env`. Check Google AI Studio quota |
| "Failed to create project" toast | API returns 500 (DB down or validation error) | Check API terminal logs for the specific error. Ensure DB is running |
| SSE chat returns no tokens | Gemini API key not set or model unavailable | Check `GEMINI_API_KEY` in `apps/api/.env`. Verify `GEMINI_MODEL` is correct |
| Chat responses contain bullet-point analysis/reasoning | Gemma 4 chain-of-thought leak | The `stripReasoning()` function in `chat.ts` buffers all tokens and filters CoT before sending. If reasoning still appears, the API may be running old code — restart it |
| Brief synthesis returns malformed JSON | Gemma 4 appends text after closing brace | Brace-depth balancing in `synthesizeBrief` handler tracks `{`/`}` depth to find the first complete JSON object, discarding trailing text |
| Gemma 4 returns 429 quota exhausted | All Gemini models also exhausted | Only `gemma-4-26b-a4b-it` has remaining quota on current API key. If it starts failing, a new API key or model rotation is needed |
| Cannot advance past Phase 1 | Brief not saved | Ensure brief is synthesized and saved (auto-saves on "Generate Project Brief") |
| Turborepo errors about `packageManager` | Missing field in root `package.json` | Root `package.json` must contain `"packageManager": "npm@10.8.0"` |

---

## 9. Code Conventions

### 9.1 TypeScript

- **Strict mode** enabled in all `tsconfig.json` files
- **No `any` types** without explicit suppression comment and justification: `// eslint-disable-next-line @typescript-eslint/no-explicit-any — <reason>`
- **No unchecked index access**: `noUncheckedIndexedAccess: true` in tsconfig
- All files use `.ts` or `.tsx` extensions. No `.js` in source (`.js` extensions in imports are for ESM compatibility with Node.js)

### 9.2 Git & Commits

- **Conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:` prefixes
- **Trunk-based development**: Short-lived feature branches (max 3 days), merged via PR
- **Protected main branch**: No direct pushes, CI must pass before merge

### 9.3 Backend (Fastify)

- Each route group is a Fastify **plugin** (async function receiving `FastifyInstance`)
- Auth middleware applied via `fastify.addHook('onRequest', fastify.authenticate)` per route file
- All request bodies validated with **Zod schemas** from `@blueprint/shared`
- Responses follow consistent envelope: `{ success, data, error, meta }`
- Error handler in `apps/api/src/index.ts` catches all unhandled errors

### 9.4 Database (Drizzle)

- Schema files organized by **domain** (one file per entity) in `apps/api/src/db/schema/`
- All tables use **UUID primary keys** with `gen_random_uuid()` default
- **JSONB** for dynamic/array fields (never stringified JSON in text columns)
- Foreign keys use **cascade delete** (deleting a project removes all related data)
- Indexes created for all foreign key columns

### 9.5 Frontend (Next.js + React)

- **App Router** with file-based routing under `src/app/`
- All pages are **client components** (`'use client'`) — no server components currently
- **shadcn/ui** components in `src/components/ui/` — don't edit these directly, re-run `npx shadcn` to upgrade
- **Feature components** in `src/components/` — one file per component
- **React Query** for all server data (fetch, cache, refetch)
- **Zustand** for transient UI state (chat messages streaming, panel open/close)
- **No comments** in production code unless explaining a non-obvious decision

### 9.6 AI Engine

- Each **agent** is a class receiving a `GeminiClient` instance
- Agents are stateless (conversation state managed by the caller/orchestrator)
- System prompts stored as **`.txt` files** in `packages/ai-engine/src/prompts/` — edit these to tune LLM behavior
- **Fallback system prompts** hardcoded in each agent constructor for when file read fails
- Token budget management in `utils/token-counter.ts` — always call `truncateToBudget()` before passing content to LLM

---

## 10. Roadmap — What Comes Next

### 10.1 Phase 3: Full Pipeline (Highest Priority)

These modules complete the remaining phases from the PDD, making all 6 phases functional.

| Module | PDD Ref | Description | Depends On | Estimated Effort |
|--------|---------|-------------|------------|------------------|
| ~~**3. Architecture Engine**~~ | ~~§5.3~~ | ~~AI recommends architecture pattern...~~ | ~~Phase 2 (Requirements) data~~ | **DONE** |
| ~~**3a. Technology Decision Record**~~ | ~~§5.3.2~~ | ~~Document chosen technologies...~~ | ~~Architecture Engine~~ | **DONE** (included in architecture_designs table) |
| ~~**3b. Architecture Diagram**~~ | ~~§5.3.3~~ | ~~Generate Mermaid DSL via ArchitectureAgent...~~ | ~~Architecture Engine~~ | **DONE** (Mermaid DSL editor in architecture-designer component) |
| ~~**4. Data Modelling**~~ | ~~§5.4~~ | ~~Entity extraction from requirements...~~ | ~~Requirements data~~ | **DONE** |
| **5. Full Threat Modelling** | §5.5.1 | STRIDE-based wizard (Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation of Privilege). Prioritised threat register. High-severity unmitigated threats block Phase 6 progression | Brief + Requirements | 2 weeks |
| **5a. Compliance Mapping** | §5.5.3 | GDPR/NDPR/CCPA flagging by user geography. PCI-DSS for payment data. HIPAA for health data. Compliance flags add specific implementation requirements to Phase 6 queue | Threat model | 1-2 weeks |
| **6. Full Implementation Sequencer** | §5.6 | Regenerate individual task blocks without losing state. Project ledger showing requirement coverage %. Task dependency ordering. Regeneration with review gate | All prior phases | 2-3 weeks |
| **Pro Plan features** | §11 | Team sharing (up to 3 members). Priority AI queue. Usage dashboard | Credit system | 2 weeks |

**Technical notes for Phase 2**
- ~~Architecture diagrams: Use `mermaid` npm package for rendering. ArchitectureAgent generates Mermaid DSL as text, client parses and renders. No need for an image-generation service.~~ **DONE — Mermaid DSL editor built directly into architecture-designer component.**
- ~~Entity extraction: Reuse the RequirementsAgent pattern — feed requirements text into a dedicated DataModellingAgent with a JSON-output system prompt. Post-process with Zod validation.~~ **DONE — data-modeller component with entity/attribute/relationship editors.**
- Compliance mapping: Hybrid approach — rule-based for jurisdiction detection (from user's IP/billing address), LLM for data classification (identifying PII, health data, payment data in the data model).
- The existing `SemanticCache` class in `packages/ai-engine/src/utils/cache.ts` can be extended for Phase 2 to cache architecture recommendations and schema generations.

### 10.2 Phase 4: Growth & Quality (Weeks 23-32 of original roadmap)

| Module | Description | Dependencies | Estimated Effort |
|--------|-------------|--------------|------------------|
| **Semantic caching** | Cache LLM responses for semantically similar queries. Extend `SemanticCache` with embedding-based comparison | ai-engine utils | 2 weeks |
| **Template marketplace** | User-submitted starter templates (e.g., "SaaS Boilerplate", "E-commerce API"). Browse, install, fork | Project creation flow | 3-4 weeks |
| **GitHub integration** | Push generated code to user's GitHub repo. Create PRs from implementation tasks. Requires GitHub OAuth token with `repo` scope | Existing GitHub OAuth | 3 weeks |
| **Vercel/Railway deploy** | One-click deployment from Blueprint. Integrate with Vercel API or Railway API for automatic deployment | GitHub integration | 2-3 weeks |
| **Mobile-responsive UI** | Responsive layout for tablet and mobile. Collapsible sidebar, stacked Kanban, full-width chat | None | 2 weeks |
| **Team Plan** | SSO, 10 members, 8000 credits, advanced permissions, audit log | User/credit system | 3-4 weeks |
| **Observability dashboards** | Token spend trends per project/user, phase completion rates, project health composite score | Credit ledger, analytics | 2-3 weeks |

### 10.3 Things That Need Attention Before Phase 2

1. **Database connectivity**: The API has no connection pooling or retry logic at startup. If PostgreSQL isn't available when the server starts, all DB routes fail. Recommend adding `pgBouncer` or a retry wrapper in `apps/api/src/db/index.ts`.
2. **Error messaging**: The current error handler returns a generic "Internal server error" for all 500s. Add more specific error messages for common failures (DB unavailable, Gemini quota exhausted, etc.).
3. **No tests yet**: The repo has no test infrastructure. Add Jest/Vitest for unit tests on `ai-engine` and `shared` packages. Add Playwright for E2E on critical flows (signup → project creation → intake).
4. **Missing Docker configuration for Windows**: The Dockerfile paths assume Linux/macOS. The `rm -rf` commands in package.json scripts won't work on Windows (`del /s` or `Remove-Item` needed).
5. **Gemma 4 reliability**: The model outputs chain-of-thought reasoning before every response. Current `stripReasoning()` approach works but is heuristic-based. A more robust solution would switch to a model that doesn't leak CoT (e.g., if new Gemini quota becomes available).
6. **Gemma 4 is slow**: Synthesize endpoint takes ~17-38 seconds (much longer than Gemini Flash). The chat streaming is affected too — user sees a delay while the full response is buffered, stripped, then re-chunked. Consider non-streaming fallback for speed.

---

## 11. Architecture Diagrams

### 11.1 Data Flow (Current)

```
┌─────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│ Browser │────▶│  Next.js 14  │────▶│  Fastify API │────▶│PostgreSQL│
│ (React) │     │  (SSR + CSR) │     │  (REST)      │     │(Drizzle) │
└─────────┘     └──────────────┘     └──────┬───────┘     └──────────┘
       │                                     │
       │  SSE stream                         │  Google Generative AI SDK
       ▼                                     ▼
┌──────────────┐                   ┌──────────────────┐
│  Zustand     │                   │  Gemma 4 (LLM)   │
│  (chat UI)   │                   │  via Google AI   │
└──────────────┘                   └──────────────────┘
```

### 11.2 AI Engine Flow

```
User Message
      │
      ▼
┌──────────────┐     ┌──────────────────┐
│  Orchestrator │────▶│  Phase Router    │
│  (routes to   │     │  (determines     │
│   agent)      │     │   active agent)  │
└──────────────┘     └────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  IntakeAgent      │
                    │  RequirementsAgent│
                    │  SecurityAgent    │
                    │  (per active      │
                    │   phase)          │
                    └─────────┬─────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │  GeminiClient    │
                     │  (streaming +    │
                     │   reasoning      │
                     │   stripping)     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Token Counter   │
                    │  Context Budget  │
                    │  (pre-checks     │
                    │   before call)   │
                    └──────────────────┘
```

---

## Appendix A: Package Dependencies

### Workspace Dependency Graph

```
@blueprint/web ──▶ @blueprint/shared
               
@blueprint/api ──▶ @blueprint/shared
               ──▶ @blueprint/ai-engine

@blueprint/ai-engine ──▶ @blueprint/shared
                      ──▶ @google/generative-ai
```

No circular dependencies. The dependency chain is unidirectional: `web/api → ai-engine → shared`.

### Key External Dependencies

| Package | Version | Used By | Purpose |
|---------|---------|---------|---------|
| `next` | ^14.2.0 | web | React framework with SSR |
| `next-auth` | 5.0.0-beta.25 | web | Authentication (credentials + OAuth) |
| `fastify` | ^5.1.0 | api | HTTP server |
| `drizzle-orm` | ^0.38.0 | api | PostgreSQL ORM |
| `@google/generative-ai` | ^0.21.0 | ai-engine | Google Generative AI API client (Gemma 4, formerly Gemini) |
| `zod` | ^3.23.0 | shared, api | Schema validation |
| `zustand` | ^5.0.0 | web | Client state management |
| `@tanstack/react-query` | ^5.60.0 | web | Server state management |
| `stripe` | ^17.0.0 | api | Payment processing |
| `bcryptjs` | ^2.4.3 | api | Password hashing |

---

## Appendix B: File Inventory

```
blueprint/
├── .env.example
├── .gitignore
├── .prettierrc
├── BLUEPRINT-DEV-HANDOFF.md          ← This file
├── docker-compose.yml
├── package.json
├── tsconfig.base.json
├── turbo.json
├── apps/
│   ├── api/
│   │   ├── Dockerfile
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── config.ts
│   │       ├── index.ts
│   │       ├── db/
│   │       │   ├── index.ts
│   │       │   └── schema/
│   │       │       ├── architecture.ts     ← NEW
│   │       │       ├── chat-messages.ts    ← NEW
│   │       │       ├── credits.ts
│   │       │       ├── data.ts             ← NEW
│   │       │       ├── index.ts
│   │       │       ├── projects.ts
│   │       │       ├── requirements.ts
│   │       │       ├── security.ts
│   │       │       ├── tasks.ts
│   │       │       └── users.ts
│   │       ├── middleware/
│   │       │   └── auth-guard.ts
│   │       ├── plugins/
│   │       │   └── auth.ts
│   │       ├── routes/
│   │       │   ├── architecture.ts          ← NEW
│   │       │   ├── auth.ts
│   │       │   ├── chat-messages.ts         ← NEW
│   │       │   ├── chat.ts
│   │       │   ├── credits.ts
│   │       │   ├── data.ts                  ← NEW
│   │       │   ├── health.ts
│   │       │   ├── intake.ts
│   │       │   ├── phases.ts
│   │       │   ├── projects.ts
│   │       │   ├── requirements.ts
│   │       │   ├── security.ts
│   │       │   ├── stripe.ts
│   │       │   └── tasks.ts
│   │       └── services/
│   │           ├── auth-service.ts
│   │           ├── credit-service.ts
│   │           └── intake-service.ts
│   └── web/
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
│           │   ├── page.tsx
│           │   ├── api/auth/[...nextauth]/route.ts
│           │   ├── auth/
│           │   │   ├── login/page.tsx
│           │   │   └── register/page.tsx
│           │   └── projects/
│           │       ├── page.tsx
│           │   └── [id]/
│           │       ├── architecture/page.tsx  ← NEW
│           │       ├── data/page.tsx          ← NEW
│           │       ├── implement/page.tsx
│           │       ├── intake/page.tsx
│           │       ├── requirements/page.tsx
│           │       └── security/page.tsx
│           ├── components/
│           │   ├── architecture-designer.tsx ← NEW
│           │   ├── brief-viewer.tsx
│           │   ├── checklist-viewer.tsx
│           │   ├── data-modeller.tsx        ← NEW
│           │   ├── providers.tsx
│           │   ├── requirements-board.tsx
│           │   ├── story-card.tsx
│           │   ├── task-queue.tsx
│           │   ├── welcome-screen.tsx
│           │   ├── layout/
│           │   │   ├── app-shell.tsx
│           │   │   ├── chat-panel.tsx
│           │   │   └── phase-sidebar.tsx
│           │   └── ui/
│           │       ├── alert.tsx
│           │       ├── avatar.tsx
│           │       ├── badge.tsx
│           │       ├── button.tsx
│           │       ├── card.tsx
│           │       ├── checkbox.tsx
│           │       ├── collapsible.tsx
│           │       ├── dialog.tsx
│           │       ├── dropdown-menu.tsx
│           │       ├── form.tsx
│           │       ├── input.tsx
│           │       ├── label.tsx
│           │       ├── progress.tsx
│           │       ├── scroll-area.tsx
│           │       ├── select.tsx
│           │       ├── separator.tsx
│           │       ├── sheet.tsx
│           │       ├── skeleton.tsx
│           │       ├── tabs.tsx
│           │       ├── textarea.tsx
│           │       └── tooltip.tsx
│           ├── hooks/
│           │   ├── use-chat.ts
│           │   └── use-project.ts
│           ├── lib/
│           │   ├── api-client.ts
│           │   ├── auth.ts
│           │   └── utils.ts
│           └── stores/
│               ├── chat-store.ts
│               └── project-store.ts
├── packages/
│   ├── ai-engine/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── orchestrator.ts
│   │       ├── agents/
│   │       │   ├── intake-agent.ts
│   │       │   ├── requirements-agent.ts
│   │       │   └── security-agent.ts
│   │       ├── llm/
│   │       │   └── gemini-client.ts
│   │       ├── prompts/
│   │       │   ├── intake-system.txt
│   │       │   ├── requirements-system.txt
│   │       │   └── security-system.txt
│   │       ├── templates/
│   │       │   └── code-prompt.ts
│   │       └── utils/
│   │           ├── cache.ts
│   │           ├── context-compressor.ts
│   │           └── token-counter.ts
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── schemas/
│   │       │   ├── architecture.ts    ← NEW
│   │       │   ├── auth.ts
│   │       │   ├── data.ts            ← NEW
│   │       │   ├── index.ts
│   │       │   ├── phase.ts
│   │       │   ├── project.ts
│   │       │   ├── requirement.ts
│   │       │   └── security.ts
│   │       └── types/
│   │           ├── index.ts
│   │           ├── phase.ts
│   │           ├── project.ts
│   │           ├── prompt.ts
│   │           ├── requirement.ts
│   │           ├── security.ts
│   │           └── user.ts
│   └── tsconfig/
│       └── package.json
```

---

*End of Document — Blueprint Developer Handoff v0.1.0*
