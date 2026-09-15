# MA-070 — An account stored with a name of only invisible characters renders blank wherever it is named
base: 2a8c89e7 · verify: emulator · flags: none · expected diff: ~3 lines

## Steps
### 1. The label and the name checks read one definition of blank
- File: `src/utils/account_name.ts` (`resolveAccountName`, `src/utils/account_name.ts:8`)
- Change: replace `account.name.trim() === ''` with `isBlankName(account.name)`, imported from `@/utils/strip_format_chars`. The undefined and `is_deleted` branches stay above it, byte-identical. The non-blank return stays `account.name`, unstripped and untrimmed. No consumer changes; the signature does not change (13 consumer files, `git grep -l resolveAccountName -- src`). No import cycle: `strip_format_chars.ts` imports nothing.
- Test: `__tests__/account_name.test.ts`, written first, four cases next to the blank cases at `:37` and `:42`, characters as `\uXXXX` constants the way `__tests__/strip_format_chars.test.ts` declares them. Only `'‏'` reads `Strings.unnamedAccount`; only `'​'` reads `Strings.unnamedAccount`; `' ‏ ​ '` reads `Strings.unnamedAccount`; `'Ca‍sh'` reads `'Ca‍sh'` (stored value, mark kept). Also `{ name: '‏', is_deleted: 1, is_archived: 1 }` reads `Strings.deletedAccount`, so MA-059's order is asserted on this input. The first three fail at base (`trim()` keeps Cf characters); the last two pass at base and stand as guards, not gates.

## Screens
- Account detail, `/accounts/[id]`, one active account seeded by SQL with `name = char(8207)` (a lone RLM): the header title (`accounts/detail/index.tsx:135`) and the hero name (`balance_hero.tsx:61`) read "Unnamed account" on device. Seed by the push recipe, since `mqa db` writes a copy on the Mac (`.claude/skills/emulator-verify/mqa.sh:438-461`): `am force-stop`, remove `-wal`/`-shm`, `base64` the seeded file through `run-as`, relaunch. One screen, one state; the resolver's other inputs are the test's.

## Non-goals
- Refusing such a name when typed, or widening blank past category Cf (U+3164 and the like): MA-064.
- Stripping or trimming the stored name anywhere: the rename field, duplicate check, restore, search and sort keep reading the stored value.
- The archived card row title, names summary and restored toast: MA-068.
- Touching any resolver consumer; the fix is the one line, and no screen adds a check.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- A consumer that pre-checks `name.trim()` itself before calling the resolver would keep showing blank; `git grep -n "name.trim()" -- src` at HEAD hits only the two save paths (`account_form.helpers.ts:65`, `account_detail.hook.ts:222`) and budget, no label site, so the risk is a rebase onto MA-060/062/063/068 adding one.
- The seeded device DB is shared across sessions; back the triple up before the push and restore it after, or the next lens reads this ticket's row.

## Self-assessment
The step itself is not in doubt: `isBlankName` already carries MA-064's definition and its own suite covers the character table, so the resolver line is the whole change. The least sure part is the emulator walk, not for the render but for the seed: the push recipe lives in a memory note and MA-064's run, not in the `emulator-verify` skill, so the implementer may reach for `mqa db` first and shoot an unchanged screen. The Screens bullet names the recipe and the `mqa.sh` lines to keep that from happening.
