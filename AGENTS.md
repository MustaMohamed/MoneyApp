# MoneyApp agent instructions

The project instructions are in [CLAUDE.md](CLAUDE.md). Any coding agent can apply its When to stop section and critical triggers, Commands, Project Structure, Conventions and gotchas, and the rule files in `.claude/rules/` (each one's `paths:` frontmatter names the files it covers).

The workflow skills (`/prep`, `/ship` and the rest), hooks and path-scoped loading are Claude Code features. Another tool can read them under `.claude/`, but they won't run for it.

The one dispatchable agent is `.claude/agents/layla.md`. The other four personas live in the `moneyapp-expert-panel` skill. Project skills are in `.claude/skills/`.
