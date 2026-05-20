# Blueprint 🚀

**Blueprint** is a web-based, AI-powered software development companion that guides developers and product managers from a raw idea to a production-ready software specification. It enforces a structured, stage-gated intake and design process, ultimately outputting hyper-optimized, context-aware prompt tasks that can be pasted directly into LLMs (like Claude, Cursor, ChatGPT, or Copilot) to build self-contained modules.

---

## 🗺️ The Stage-Gated Intake Pipeline

Blueprint ensures high-quality design documentation by requiring projects to advance sequentially through **six defined phases**. By resolving design decisions upfront, it prevents prompt drift, scope creep, and architectural misalignment.

```mermaid
graph TD
    P1[Phase 1: Conversational Intake] -->|Extract project brief| P2[Phase 2: MoSCoW User Stories]
    P2 -->|Requirements board| P3[Phase 3: System Architecture]
    P3 -->|Tech stack & Mermaid diagrams| P4{Database Required?}
    P4 -->|Yes| P5[Phase 4: Data Modeling]
    P4 -->|No: Skip| P6[Phase 5: Threat & Security Assessment]
    P5 --> P6
    P6 -->|Mandatory Sign-off Gate| P7[Phase 6: Prompts & Implementation Tasks]
    
    style P6 fill:#f96,stroke:#333,stroke-width:2px
    style P7 fill:#bbf,stroke:#333,stroke-width:2px
```

---

## ✨ Features

- **🗣️ Conversational Brief Extraction**: Natural dialogue flows that gather problem statements, target users, value propositions, and success metrics.
- **🏗️ MoSCoW Requirements Builder**: Automatically generates prioritized User Stories classified into *Must Have*, *Should Have*, *Could Have*, and *Won't Have*.
- **📊 Architecture Designer**: Prepares standard system architectures complete with tech stacks, patterns, architectural decisions, and visual Mermaid diagrams.
- **💾 Entity-Relationship Modeler**: Automatically skipped for stateless applications. Otherwise, creates complete schemas detailing tables, fields, relationships, and indices.
- **🔒 STRIDE-Aligned Threat Assessment**: Prepares comprehensive security checklists. Requires manual developer review and sign-off before entering code generation.
- **⚡ Prompt Generator**: Aggregates all structural decisions, DB schemas, threat mitigations, and tech stack details into hyper-specific prompt instructions for developers.
- **⚖️ Failover Engine**: Resilient multi-LLM setup utilizing Groq Llama 3.3 for high-speed architecture design and Google Gemini/Gemma models as a hot-fallback for maximum reliability.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 15 (App Router) + React 18 | High-performance Server & Client rendering |
| **Backend** | Fastify 5 + TypeScript | Blazing fast REST API and server-sent events |
| **Database** | PostgreSQL 16 + Drizzle ORM | Schema migrations and type-safe database queries |
| **Auth** | Auth.js v5 (NextAuth) | Custom credentials + Google & GitHub OAuth |
| **LLMs** | Groq API (Llama 3.3 70B) + Gemini Client | Smart orchestrator with automatic token optimization |
| **Client State** | Zustand 5 | Synchronous SSE chat streaming and project store |
| **Server State** | TanStack React Query 5 | Robust caching and data fetching |
| **Dev Tools** | Turborepo 2 + Docker Compose | High-speed monorepo management and containerization |

---

## 📂 Project Structure

```
blueprint/
├── apps/
│   ├── api/                   # Fastify 5 backend server
│   └── web/                   # Next.js 15 app router frontend
├── packages/
│   ├── ai-engine/             # Multi-agent AI core & LLM clients
│   ├── shared/                # Zod schemas, TypeScript types, and validation helpers
│   └── tsconfig/              # Shared TypeScript configurations
├── docker-compose.yml         # Containerized PostgreSQL service
├── package.json               # Root monorepo workspace configuration
└── turbo.json                 # Turborepo task pipeline execution graph
```

---

## 🚀 Getting Started

### 📋 Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v20.0.0 or higher)
- **npm** (v10.8.0 or higher)
- **Docker** and **Docker Compose**

### 🔑 Environment Configuration

Create a `.env` file in the **root** folder and in `apps/api/.env` (you can copy [.env.example](file:///.env.example)):

```env
# Database
DATABASE_URL=postgresql://blueprint:blueprint@localhost:5432/blueprint

# Authentication (NextAuth)
AUTH_SECRET=generate-with-openssl-rand-base64-32
AUTH_URL=http://localhost:3000

# Google OAuth (Optional)
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# GitHub OAuth (Optional)
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

# LLM Providers
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile
```

### ⚡ Installation and Run

1. **Clone the repository** and install dependencies:
   ```bash
   npm install
   ```

2. **Spin up the database container**:
   ```bash
   docker compose up -d
   ```

3. **Push the database schema**:
   ```bash
   npm run db:push
   ```

4. **Start the development servers** (runs API on `4000` and Web on `3000` simultaneously):
   ```bash
   npm run dev
   ```

### 🛠️ Developer Scripts

- **`npm run build`**: Build all applications.
- **`npm run typecheck`**: Run TypeScript compilation checks across the workspace.
- **`npm run lint`**: Execute ESLint rules.
- **`npm run format`**: Apply Prettier styling constraints.
- **`npm run db:studio`**: Launch Drizzle Studio graphical interface.

---

## 🛡️ License

Private / Proprietary. All rights reserved.
