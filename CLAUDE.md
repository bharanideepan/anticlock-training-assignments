# Enterprise CRM Platform — Claude Code Instructions

This project uses [metaswarm](https://github.com/dsifry/metaswarm), a multi-agent orchestration framework for Claude Code. It provides 18 specialized agents, a 9-phase development workflow, and quality gates that enforce TDD, coverage thresholds, and spec-driven development.

## Behavioral Guidelines

These apply to all work in this project. Bias toward caution over speed — for trivial tasks, use judgment.

### 1. Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

Touch only what you must. Clean up only your own mess.

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that **your** changes made unused.
- Don't remove pre-existing dead code unless asked.

Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

---

## Project Layout

```
anti-clock-training/              [GIT ROOT]
└── crm-app-metaswarm/            [THE PROJECT — specs + implementation]
    ├── product-specs/            # Read before implementing any feature
    │   ├── 00-overview.md
    │   ├── 01-architecture.md
    │   ├── 02-data-model.md
    │   ├── 03-design-system.md
    │   ├── 04-api-conventions.md
    │   └── modules/              # 14 module specs (01-auth.md … 14-import-export.md)
    ├── backend/                  # NestJS 10, Prisma 5, PostgreSQL 16
    ├── frontend/                 # React 19, Vite 5, MUI v6
    ├── e2e/                      # Playwright E2E tests
    └── docker-compose.yml
```

**All implementation work happens inside `crm-app-metaswarm/`.** Agents working in worktrees must `cd crm-app-metaswarm/` before running any build, test, or migration commands.

**Read specs before implementing any feature.** Order: `00-overview.md` → `01-architecture.md` → `02-data-model.md` → `04-api-conventions.md` → the relevant module spec in `modules/`.

---

## Project Overview

Full-featured enterprise CRM: customers, contacts, sales opportunities, tasks, activities, reporting, and team collaboration. REST API (NestJS) + React SPA + PostgreSQL.

---

@.claude/tech-stack.md
@.claude/workflow.md
@.claude/testing.md
@.claude/architecture.md
@.claude/domain-modules.md
@.claude/environment.md
