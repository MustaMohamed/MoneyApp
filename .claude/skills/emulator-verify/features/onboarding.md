# Onboarding

Routes `/welcome` (N1), `/add_account` (N2), `/more_accounts` (N3), `/ready` (N4), under `src/app/(onboarding)/`. The footer is the shared `src/components/ui/cta_footer.tsx`; the status track above it is the onboarding shell's. The `(onboarding)` layout redirects to `/dashboard` once onboarding is complete, so a deep link reaches none of these steps on a finished install.

## Reach it

- User path: a fresh install opens on N1 (`accounts_list.md`'s `no accounts at all`).
- Script: `$MQA reset`, then a cold launch; the app lands on N1. N1 `Continue` → N2; on N2 fill the name (placeholder `e.g. CIB Current`) and the balance (placeholder `0.00`), `Save and continue` → N3; `Review setup` → N4; `Open My Dashboard` completes onboarding (business rule 1).
- N3 with no account shows `Add your first account` as its CTA: on a fresh install, before N2 saves, `$MQA open /more_accounts` (the layout redirects only once onboarding is complete).

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| N1 footer, large font | no frame, MA-130 | a fresh install; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on `Continue` (`md`, 48 at both); its top at or below the bottom of the status track's text box; one crop of the footer at 2.0 |
| N2 footer, large font | no frame, MA-130 | N1 `Continue`; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on `Save and continue`; its top at or below the bottom of the status track's text box; one crop at 2.0 |
| N3 empty footer, large font | no frame, MA-130 | a fresh install, then `$MQA open /more_accounts` before N2 saves (§ Reach it); the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on `Add your first account`; its top at or below the bottom of the status track's text box; one crop at 2.0 |
| N3 add another and footer, large font | no frame, MA-130 | N2 with one account saved; at 2.0 `Add another account` sits below the fold, so `$MQA scroll down --until 'label="Add another account"'` before its bounds; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on `Add another account` (`md` flat secondary with a plus glyph) and `Review setup`; neither is cut at the top or bottom nor drawn over the message above it; one crop at 2.0 |
| N4 footer, large font | no frame, MA-130 | N3 `Review setup`; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on `Open My Dashboard`; its top at or below the bottom of the status track's text box; one crop at 2.0 |
| N3 row, overdrawn account | no frame, MA-156 | `$MQA reset`, then the developer-menu intro (Gotchas): `$MQA up --ready 'label="Continue"'`, `$MQA tap 'label="Continue"'` on the intro, `$MQA key 4`, `$MQA open /welcome` and `$MQA park`. N1 `Continue`, save one EGP bank on N2, then on N3 `$MQA seed --save <file.db>`, set that row's `current_balance` to `-1900` on the host (`better-sqlite3`, `PRAGMA journal_mode=DELETE`), and `$MQA up --seed <file.db> --ready 'label="Review setup"'`, which pushes the file and reopens the app in one call. `mqa seed <file.db>` exits 1 on N3, since it waits for the tab bar (`mqa.sh:607`). The step is in SecureStore (`onboarding.repository.ts:27-28`), so the app reopens on N3 | the row's label reads `<name>, Bank, −1,900 EGP` and its value text `−1,900`, the sign U+2212 in both; `grep -c -- '-1,900'` over `mqa read` is 0; one shot of the row |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| N1 `Continue` | N2 | N1 |
| N2 `Save and continue` | N3 | N2 |
| N3 `Review setup` | N4 | N3 |
| N4 `Open My Dashboard` | `/dashboard`, onboarding complete | exits the app |

## Gotchas

- After `mqa reset` the dev client's developer-menu intro covers the first launch, and `mqa up` alone stalls on it: at font scale 1.0 run `$MQA up --ready 'label="Continue"'`, tap that `Continue`, `$MQA key 4` to close the menu, `$MQA open /welcome`, then turn the Tools button off. `mqa park` (and the same step inside `mqa up`) presses `label="Tools"`, which after a reset can match two nodes (an image and a text) and fail, leaving the gear over the header's top right; then do park's steps by hand: `tapxy` the first match from `mqa bounds 'label="Tools"'`, `$MQA wait 'label="Close"'`, `$MQA scroll down --until 'label="Toggle Dev Menu"'`, `$MQA tap 'label="Toggle Dev Menu"'`, `$MQA tap 'label="Close"'`. Do all of it at 1.0, then set a larger scale and `mqa up` again, since at 2.0 the menu's `Close` sits off screen.
- `mqa reset` clears the app's data, the seeded database included; push the seed back with `mqa seed` after the walk, and finish N4 first so the pushed database opens on the tabs.
- The shared CTA footer's track and N3's `Add another` track are both 48 (`Size.ctaFooterTrack`), the `md` button's fixed height, so a button taller than 48 would overflow them; `button.geometry.test.ts` guards the `md` label line box against that track.
