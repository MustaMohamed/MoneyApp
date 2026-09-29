---
name: queue
description: "Use when parked questions wait on the user: '/queue asks', 'answer the parked questions', 'what is waiting on me', or a board row whose command is /queue asks. Lists every open question record, asks one per message with its visual, writes each answer into its ticket, and moves the ticket when its last record is answered. Not for reviewing a ticket (issue-review) or planning one (prep)."
argument-hint: "asks"
---

# Queue

An unattended `/issue-review` or `/prep` run parks each question it cannot answer as a question record, [question-record.md](../issue-review/references/question-record.md), and ends. This skill is where the user answers them, from a session that never saw the run. The `unslop` skill binds every message.

## Subcommands

- `asks`: every open record on the board, one per message, by [references/asks.md](references/asks.md).

Any other argument: print this list and stop.

## Rules

- A question is never decided for the user. The recommendation goes first; the user chooses or defers.
- A record the code has already answered is closed without reaching the user.
- A deferred question stays open, and its ticket stays parked.
- Ready For Development stays one-way: only a ticket at Blocked returns there.
