# Project Context — Mission Control

## Stack
- Framework: Next.js 16 (App Router, server components)
- Language: TypeScript 5 (strict mode)
- Package manager: npm
- Runtime: Node.js 20+
- DB/ORM: Convex (real-time database + server functions)
- Auth: None yet (scaffold-ready). Do not add auth scaffolding unless explicitly asked.
- Hosting/Deploy: Vercel-ready (not yet configured)
- Styling/UI: Tailwind CSS v4 + clsx + Lucide React icons

## Source of Truth
- API schema docs: `convex/schema.ts` — all 7 tables with indexes
- DB schema location: `convex/schema.ts`
- Design system/components: `components/ui/primitives.tsx` (Panel, Badge)
- Env var reference: `.env.local` (CONVEX_URL, model API keys)
- Product requirements: Internal — AI operations dashboard for portfolio research

## Conventions (MANDATORY)
- Naming conventions: PascalCase components, camelCase functions, UPPER_SNAKE_CASE constants
- File/folder structure: Pages in `app/[feature]/page.tsx`, modules in `components/modules/`, shared UI in `components/ui/`, business logic in `lib/`
- Error handling pattern: try/catch in API routes with NextResponse status codes; Convex throws on validation; research worker uses retry + state guard
- Logging pattern: `console.log/error` with `[prefix]` tags (e.g. `[ara-worker]`)
- Validation approach: Convex `v.` schema validators on mutations/queries
- Types strategy: Strict mode, shared types in `lib/types.ts` and `lib/research/types.ts`. No `any`.
- Testing framework: None configured yet. If no tests exist, explicitly say "No tests configured" in output.

## Commands
- Install: `npm install`
- Dev: `npm run dev` (Next.js) + `npm run convex:dev` (Convex backend)
- Build: `npm run build`
- Test: N/A (no test framework yet)
- Lint: `npm run lint`
- Typecheck: `npx tsc --noEmit`
- Format: N/A (no Prettier configured)
- Deploy Convex: `npm run convex:deploy`

## Definition of Done
- [ ] Builds locally (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] Typecheck passes (`npx tsc --noEmit`)
- [ ] No secrets in code/logs
- [ ] Minimal diff (only touched necessary files)
- [ ] Short changelog of what/why

## Guardrails
- Do not change:
  - `convex/schema.ts` unless asked (schema migrations affect prod data)
  - `convex/_generated/` (auto-generated, never edit)
  - Auth flows unless asked
- Ask before:
  - Adding npm dependencies
  - Large refactors across multiple modules
  - Destructive Convex mutations (deleting tables/indexes)

## Project-Specific Patterns
- Preferred data fetching: Convex `useQuery`/`useMutation` hooks (client), direct `await` in async server components
- State management: React Query v5 via `@convex-dev/react-query` for server state; local `useState` for UI state
- API route conventions: `app/api/[feature]/[action]/route.ts` with NextResponse
- Convex function conventions: `mutation({ args: { ... }, handler: async (ctx, args) => { ... } })`
- Research adapters: Multi-model pattern in `lib/research/adapters.ts` — each adapter implements `ResearchModelAdapter` interface
- Shadow adapters: Gemini + Claude run in parallel for eval, excluded from brief synthesis until validated
- Mock data fallback: `lib/mock-data.ts` provides deterministic data for UI development
- Common utilities: `clsx` for classnames, `date-fns` for dates

## Key Architecture
- **ARA (Autonomous Research Analyst)**: Multi-model research pipeline
  - Adapters: Grok, Perplexity, DeepSeek (primary) + Gemini, Claude (shadow/eval)
  - Task queue: Convex-backed with JSON file fallback (`lib/research/json-file-queue.ts`)
  - Worker: Sequential primary adapters, parallel shadow adapters
  - Brief synthesis: Top-N by confidence across all adapter outputs
  - Portfolio context: Reads from local memory file, strips rawExcerpt before Convex persistence
- **Dashboard modules**: 8 feature pages, each with a dedicated panel component
- **Convex tables**: contentCards, scheduledTasks, memoryEntries, teamAgents, agentAssignments, officePresence, researchTasks

## Output Style
- First give a short plan (3-6 bullets)
- Then implement
- Then return:
  1. Files changed
  2. Why
  3. Test commands run (or "No tests configured")
  4. Verification evidence (log lines or output snippets when relevant)
  5. Follow-up risks
