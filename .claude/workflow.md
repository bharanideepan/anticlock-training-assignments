## How to Work in This Project

### Starting work

```text
/start-task
```

Default entry point. Primes the agent with relevant knowledge, guides scoping, picks the right process level.

### For complex features (multi-file, spec-driven)

```text
I want you to build [description]. [DoD items, file scope.]
Use the full metaswarm orchestration workflow.
```

Triggers: Research → Plan → Design Review Gate → Work Unit Decomposition → Orchestrated Execution (4-phase loop) → Final Review → PR.

### Available Commands

| Command | Purpose |
|---|---|
| `/start-task` | Begin tracked work on a task |
| `/prime` | Load relevant knowledge before starting |
| `/review-design` | Trigger parallel design review gate (5 agents) |
| `/pr-shepherd <pr>` | Monitor a PR through to merge |
| `/self-reflect` | Extract learnings after a PR merge |
| `/handle-pr-comments` | Handle PR review comments |
| `/brainstorm` | Refine an idea before implementation |
| `/create-issue` | Create a well-structured GitHub Issue |
| `/setup` | Interactive guided setup |
| `/status` | Run diagnostic checks on your installation |

---

## Workflow Enforcement (MANDATORY)

### After Brainstorming
1. **STOP** — do NOT proceed directly to planning or implementation
2. **RUN the Design Review Gate** — invoke `/review-design`
3. **WAIT** for all 5 review agents (PM, Architect, Designer, Security, CTO) to approve
4. **ONLY THEN** proceed to planning

### After Any Plan Is Created
1. **STOP** — do NOT present the plan or begin implementation
2. **RUN the Plan Review Gate** — invoke the `plan-review-gate` skill
3. **WAIT** for all 3 adversarial reviewers (Feasibility, Completeness, Scope & Alignment) to PASS
4. **ONLY THEN** present the plan to the user for approval

### Execution Method Choice
When a plan is ready, always ask the user which execution approach they want:
1. **Metaswarm orchestrated execution** — 4-phase loop (IMPLEMENT → VALIDATE → ADVERSARIAL REVIEW → COMMIT)
2. **Subagent-driven development** — parallel subagents with code review between tasks
3. **Parallel session** — isolated session with batch checkpoints

### Before Finishing a Branch
1. **STOP** before presenting merge/PR options
2. **RUN `/self-reflect`** to capture learnings
3. **COMMIT** knowledge base updates
4. **THEN** proceed to PR creation

### Use `/start-task` Instead of EnterPlanMode
For tasks touching 3+ files, always use `/start-task`. `EnterPlanMode` skips all quality gates.

### Subagent Discipline
- **NEVER** use `--no-verify` on git commits
- **NEVER** use `git push --force` without explicit user approval
- **ALWAYS** follow TDD — tests first, watch fail, then implement
- **NEVER** self-certify — orchestrator validates independently
- **STAY** within declared file scope
- **ALWAYS** `cd crm-app-metaswarm/` before running build/test/migration commands
