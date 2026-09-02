---
name: epic
description: "Use when the user states a new feature or goal for MoneyApp and wants it on the board: 'I want to do X', 'new epic for Y', 'start a milestone', or /epic. Phase 1 of the define workflow: picks or creates the milestone and opens the epic issue at Todo. Not for brainstorming the details (boundaries) or cutting tasks (tickets)."
argument-hint: "<goal in a sentence> [--milestone MA-<module>-<goal>]"
---

# Epic

Phase 1 of the define workflow. Turns a goal the user just stated into an epic issue on a milestone, at Todo. Writes nothing to disk. The `unslop` skill binds the body you write.

## Steps

1. **Take the goal as said.** If it is one sentence with no wants, ask one question: "What should be true when this is done?" Then stop asking; detail is `/boundaries`' job.
2. **Milestone.** List the open ones:

   ```bash
   gh api "repos/MustaMohamed/MoneyApp/milestones?state=open" --jq '.[] | "\(.title): \(.description)"'
   ```

   Pick the one whose description the goal serves, or the `--milestone` given. None fits: create one. Name it `MA-<module>-<goal>` when the goal lives in one module (`accounts`, `dashboard`, `settings`, `transactions`, `commitments`, `budget`, `goals`) and `MA-<goal>` when it crosses modules. The description is one line, the milestone's goal.

   ```bash
   gh api repos/MustaMohamed/MoneyApp/milestones -f title="MA-<module>-<goal>" -f description="<one line>"
   ```

3. **Module label.** `module:<x>` for a one-module goal. Create it if missing: `gh label create "module:<x>" --color 0E8A16 --description "<X> module"`. A cross-module goal gets no module label.
4. **Body.** Goal and Building only, per [references/epic-body.md](references/epic-body.md). Goal is one paragraph in the user's words; Building is one bullet per want. No lock line, no other sections.
5. **Create.**

   ```bash
   gh issue create --title "Epic: <feature name>" --label epic --label "module:<x>" --milestone "<milestone title>" --body "$BODY"
   ```

6. **Board.** `bash scripts/board.sh status <n> Todo` adds it to Project #2 and sets the column.
7. **Reply** with the issue URL and `Next: /boundaries <n>`.

## Resume

An epic that already exists for this goal is not recreated: `gh issue list --label epic --state open --search "<feature words>"`. Report its number and `bash scripts/board.sh get <n>` instead.
