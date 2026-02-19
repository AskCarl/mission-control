# Mission Control v1 (Next.js + Convex)

Mission Control is a modular operations dashboard for Sean + Carl, built from the provided specs:
- Content Pipeline
- Calendar / Scheduled Work
- Memory Screen + Search
- Team Structure
- Digital Office

## Tech Stack
- Next.js (App Router, TypeScript)
- Tailwind CSS v4
- Convex (schema + server functions scaffolded)
- Mock/seed fallback data for safe local iteration

## Project Structure

```txt
app/
  page.tsx                 # Dashboard
  pipeline/page.tsx        # Content pipeline module
  calendar/page.tsx        # Scheduled tasks calendar/agenda
  memory/page.tsx          # Memory feed + search
  team/page.tsx            # Team structure
  office/page.tsx          # Digital office
  review/page.tsx          # Weekly review module
  research/page.tsx        # Autonomous Research Analyst module
components/
  layout/app-shell.tsx     # Unified nav + shell
  modules/*                # Module UI blocks
  ui/primitives.tsx        # Shared design system primitives
convex/
  schema.ts                # Data model for all modules
  content.ts               # Content queries/mutations
  calendar.ts              # Scheduled task queries/mutations
  memory.ts                # Memory search + quality control
  team.ts                  # Team/assignment functions
  office.ts                # Presence functions
  seed.ts                  # Seed mutation
lib/
  mock-data.ts             # v1 mock data
  types.ts                 # shared types
```

## What's Implemented (v1.1 optimization pass)

### New in v1.1
✅ Focus 3 widget (daily top priorities)
✅ Project Progress module with milestone tracking
✅ WIP limit warnings panel
✅ Blocked >24h escalation alert
✅ AM/PM workflow cards
✅ Agent utilization panel
✅ Global Quick Add bar (mock action)
✅ Weekly Review page
✅ Autonomous Research Analyst module

### Autonomous Research Analyst (v1 scaffold)
✅ Dedicated `/research` screen with:
- What Changed (since prior run)
- Top Opportunities
- Top Risks
- Sector/Asset Sentiment
- Action Checklist
- Sources + Confidence
- Outside Core Focus
- Run History scaffold

✅ Model routing service layer (adapter pattern):
- Grok adapter: social pulse/sentiment/catalyst chatter (mock)
- Perplexity adapter: sourced research/citations (mock)
- DeepSeek adapter: deep analysis/scenario framing (mock)
- Local synthesizer combines outputs into one concise brief

✅ Portfolio-aware hook:
- Reads `/Users/carlbot/.openclaw/workspace/memory/sean-portfolio.md` when available
- Falls back to mock context when file is unavailable

⚠️ Placeholder/TODO:
- Live API wiring for Grok/Perplexity/DeepSeek
- Optional dedicated synthesis model adapter
- Persistent run-history storage (currently in-memory mock scaffold)

### 1) Content Pipeline
✅ Kanban-style stage columns (Idea → Published)
✅ Card metadata (owner, priority, tags, due date)
✅ Today attention panel with Carl automation hints
✅ Convex table + create/update stage functions

⚠️ Placeholder for v2/full integration:
- Real drag/drop persistence
- Rich-text editor + file upload pipeline
- Automated stale >48h alerts as background jobs

### 2) Mission Calendar
✅ Agenda with source/owner/status/run-time visibility
✅ Health metrics (attention/on-schedule summary)
✅ Convex scheduled tasks model + upsert function

⚠️ Placeholder:
- Full day/week/month visual calendar grid
- External cron/job sync adapter

### 3) Memory Screen
✅ Memory feed UI with source metadata
✅ Instant search + `/` keyboard focus
✅ Pin/status model in Convex schema

⚠️ Placeholder:
- File watcher indexer from MEMORY.md + memory/*.md
- Conversation snippet linkage + dedupe workflows

### 4) Team Structure
✅ Team cards for Carl/Codezer/Scribe/Forge
✅ Responsibilities panel + current assignment visibility
✅ Convex agents + assignments schema

⚠️ Placeholder:
- Real subagent runtime sync
- Spawn/retire/pause controls wired to orchestration backend

### 5) Digital Office
✅ Office stations with real-time style statuses (mock)
✅ Efficiency strip (active/idle/blocked)
✅ Quick action buttons (UI scaffold)
✅ Convex office presence schema/functions

⚠️ Placeholder:
- Live presence stream subscriptions
- Animated office states


## Quick Start (60 seconds)

```bash
cd /Users/carlbot/projects/mission-control
npm install
npm run dev
```

Then open: `http://localhost:3000`

## Screenshots Checklist (for GitHub polish)

Add screenshots to `docs/screenshots/`:
- `dashboard.png`
- `pipeline.png`
- `calendar.png`
- `memory.png`
- `team.png`
- `office.png`
- `weekly-review.png`
- `research.png`

Tip: Use these in the README so skeptics can scan value in <30s.

## Setup

### Prerequisites
- Node.js 20+
- npm
- Convex account/project (for live backend mode)

### Install
```bash
cd /Users/carlbot/projects/mission-control
npm install
```

### Run UI (mock-backed)
```bash
npm run dev
```
Open http://localhost:3000

### Optional model keys (for future live wiring)
```bash
# TODO wiring in lib/research/adapters.ts
export XAI_API_KEY=...
export PERPLEXITY_API_KEY=...
export DEEPSEEK_API_KEY=...
```
If keys are missing, research module remains fully local/mock-backed by design.

### Run Convex (optional live backend wiring)
```bash
npm run convex:dev
```

### Build + lint
```bash
npm run lint
npm run build
```

## Notes
- Current UI is intentionally safe/local and does not deploy.
- Convex schema/functions are production-oriented scaffolding; UI is currently bound to mock data to keep v1 deterministic.
- `convex/seed.ts` provides starter records once Convex runtime is connected.

## Demo Walkthrough

- Open dashboard: `http://localhost:3000`
- Review Focus 3, Project Progress, Flow Alerts, AM/PM cards, and Agent Utilization.
- Use Global Quick Add from any screen to capture tasks/ideas/memory.
- Open Weekly Review: `http://localhost:3000/review`

## Built For

Mission Control for OpenClaw operations with modular views for tasks, calendar, memory, team, office, and productivity optimization.
