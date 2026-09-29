# MA-137 — The shared CTA footer and keyboard lift drop their onboarding leftovers
base: de64f0f1 · verify: none · flags: none · expected diff: ~10 lines

## Steps
### 1. The onboarding shell's track table holds only `header` and `progressRail`
- File: `src/modules/onboarding/components/onboarding_shell/onboarding_shell.geometry.ts` (`ONBOARDING_SHELL_TRACKS`, `:11-12`)
- Change: delete the `statusTrack` and `cta` entries. The readers left are `onboarding_header.tsx:22` (`.header`) and `onboarding_progress_rail.tsx:24` (`.progressRail`); the `Size` import stays.
- Test: `first` · `__tests__/screens/onboarding_shell.geometry.test.ts`, case `binds every track to its named token`: delete the assertions at `:16-17`, keep `:14-15`. No case is added. Deleted in the same commit as the entries, or `typecheck` fails on the missing keys.

### 2. `Size.onboardingCtaTrack` becomes `Size.ctaFooterTrack` at the same value
- File: `src/constants/theme.ts` (`Size`, `:146`), `src/components/ui/cta_footer.tsx:23`, `src/modules/onboarding/screens/onboarding/more_accounts/index.tsx:163`
- Change: rename the key to `ctaFooterTrack`, value raw `48`, the comment at `theme.ts:145` unchanged. Both readers take the new key. No `onboardingCtaTrack` alias remains in `Size`.
- Test: `first` · `__tests__/components/ui/button.geometry.test.ts:32-36`: the case reads `Size.ctaFooterTrack` and its title names the CTA footer track instead of the onboarding CTA track. The bound stays `resolveButtonLabelStyle('md', 2)?.lineHeight <= 48`. Same commit as the rename.

### 3. The records name the token the footer reads
- File: `docs/adr/2026-09-28-shared-helpers-leave-screen-folders.md:16`, `.claude/skills/emulator-verify/features/onboarding.md:34`
- Change: in the ADR, the sentence on the 48 track cites `Size.ctaFooterTrack`, and the sentence that `ONBOARDING_SHELL_TRACKS.cta` is pending on MA-137 becomes a statement that MA-137 (#625) removed it and renamed the token. In `onboarding.md`, the gotcha cites `Size.ctaFooterTrack`.
- Test: `none` · markdown only; `npm run lint` covers the banned phrases in `.claude/skills/`.

## Non-goals
- No second token. `more_accounts/index.tsx:163` reads the renamed token and gets no onboarding-only track of its own.
- No change to `Size.statusTrack` or to `StatusTrack`; only the table entry `ONBOARDING_SHELL_TRACKS.statusTrack` goes.
- No edit to the JSDoc at `cta_footer.tsx:14` or the comment at `more_accounts/index.tsx:160`; neither names the token.
- No edit under `docs/scopes/` or `docs/superpowers/`.
- The footer above a keyboard open at mount, and `keyboard_lift.anim.ts`: a new task.
- Pieces leaving the transactions screens: MA-128 (#610).

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- After step 3: `grep -rn "onboardingCtaTrack" src __tests__ docs/adr .claude/skills` prints nothing and exits 1. At de64f0f1 it prints 8 lines.
- After step 3: `grep -rn "ONBOARDING_SHELL_TRACKS\.\(cta\|statusTrack\)" src __tests__ docs/adr` prints only the ADR's past-tense mention. At de64f0f1 it prints 3 lines.
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- The ticket does not fix the token's name. `ctaFooterTrack` is the planner's pick, under `CLAUDE.md` § When to stop, naming is decided without an ask. A different name changes step 2 and step 3 by the identifier only.
- One token still serves the footer and the N3 `Add another` track, so a retune of `ctaFooterTrack` resizes both. The ticket's Rules ask for a rename, and its `Size:` line lists `more_accounts/index.tsx` as a follower. A ruling for two tokens adds one line in `theme.ts` and drops `more_accounts/index.tsx` from step 2.
- A branch that adds a reader of `Size.onboardingCtaTrack` and merges first fails `typecheck` after rebase; the fix is the new key at that reader.

## Self-assessment
Step 2 is the one I am least sure about. Acceptance asks for "a token named for the footer" and the Goal says an onboarding retune must not resize the edit account footer, which a rename satisfies only because no onboarding-named track is left to retune. The N3 screen's `Add another` track is not the footer, yet after the rename it reads a footer-named token. I followed the Rules line, "a token is renamed at the same value", and the `Size:` list, which counts `more_accounts/index.tsx` as changed. If the intent was two tokens, the change is one added line and is recorded under Risks.
