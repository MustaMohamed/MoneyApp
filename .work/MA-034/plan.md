# MA-034 — Transaction row: a clipped note and an overlapping transfer amount

base: 73da991b · verify: emulator · flags: none · expected diff: ~37 lines outside tests

One cause, three files: both optional tracks are `TRANSACTION_ROW_OPTIONAL_TRACK_HEIGHT = ms(8)`
(`transaction_row.helpers.ts:27`), shorter than the line box each holds —
`lineHeightFor(Type.chip)` for the note (`transaction_row.tsx:113,118`) and
`lineHeightFor(Type.overline)` for the secondary amount (`:142,147`). The short track is also what
makes `adjustsFontSizeToFit` fire on the secondary amount (`:149-150`): Android autosizes against
the measured box, and an 8pt box shrinks `→ 5,000 EGP` to the `minimumFontScale={0.75}` floor
while its line height stays put. Give each track its own paired line height and the shrink has
nothing left to do.

Growing the tracks to their full line box costs the value column 6pt and the content column 4pt at
the baseline, and on a small screen the row has neither, so step 1 also scales the row's padding.
`TRANSACTION_ROW_HEIGHT = ms(60)` scales with `SCALE` but the `py-1.5` className
(`transaction_row.tsx:65`) is a fixed 12pt, so the inner box shrinks faster than the content. The
row's 1pt `border-b` sits on that same View (`:64-65`), and Yoga subtracts a border from the
content box exactly as it subtracts padding, so the inner box is `ms(60)` less the padding less 1 —
the term the first draft of this table omitted. Replaying `ms`/`msFont`/`lineHeightFor`
(`responsive.ts:10,13-20`, `theme.ts:111`) at 3× density — the AVD row at its own 2.625× — value
column `lineHeightFor(Type.body)` + 2 × `lineHeightFor(Type.overline)`, content column
`max(lineHeightFor(Type.meta), TypeBadge)` + `ms(2)` + `lineHeightFor(Type.overline)` +
`lineHeightFor(Type.chip)`:

| width | SCALE | value column | content column | inner box, `py-1.5` | inner box, `ms(5)` |
|---|---|---|---|---|---|
| 320 (clamped, `responsive.ts:10`) | 0.85 | 40 | 42 | 38 | 42 |
| 360 | 0.923 | 43 | 44 | 42 | 44 |
| 390 (token baseline) | 1.0 | 46 | 46 | 47 | 49 |
| 411 (the project's AVD, 2.625×) | 1.054 | 47 | 46 | 50 | 52 |

The overflow is below 390pt only, which is why the emulator cannot be the check for it: the AVD
runs at 411pt and always fits. Hoisting the padding to `ms(5)` — 5pt at the baseline, one point
less per side than today's fixed 6 — makes the inner box scale with the height and clears every
width. `ms(6)` does not: it leaves the value column 1pt over at 360pt and zero slack at 320pt once
the border is counted. The content column is the tighter of the two below 390pt, because the title
row is `alignItems: 'center'` over the title and either the `TypeBadge` or the ownership label
(`:84-101`) and `TypeBadge` is unscaled — `py-[2px]` + `border` + a 10pt icon beside a
`text-[9.5px]` label (`type_badge.tsx:19,27,43,75-80`), about 18pt whatever `SCALE` is, against a
`lineHeightFor(Type.meta)` of 14 at 320pt. That 18 is an estimate of a Tailwind box this plan
cannot execute, and at 320 and 360pt it leaves the column exactly zero slack, so the commitment row
carrying a note is a Screens shot below and not an arithmetic claim.

## Steps

### 1. Each optional track is sized to the line box it holds, and the row's padding scales with its height

- File: `src/modules/transactions/screens/transactions/components/transaction_row.helpers.ts`
  (`:24-27`)
- Change: export the two optional slots' font sizes as the single source both the `Text` and its
  track read — `TRANSACTION_ROW_NOTE_FONT_SIZE = Type.chip`,
  `TRANSACTION_ROW_SECONDARY_AMOUNT_FONT_SIZE = Type.overline` — then
  `TRANSACTION_ROW_NOTE_TRACK_HEIGHT = lineHeightFor(TRANSACTION_ROW_NOTE_FONT_SIZE)` and
  `TRANSACTION_ROW_SECONDARY_AMOUNT_TRACK_HEIGHT =
  lineHeightFor(TRANSACTION_ROW_SECONDARY_AMOUNT_FONT_SIZE)`. A track can then only be wrong if
  someone writes a literal `fontSize` back into the row. Also export
  `TRANSACTION_ROW_VERTICAL_PADDING = ms(5)`, the scaled replacement for the row's fixed `py-1.5`,
  `TRANSACTION_ROW_CONTEXT_GAP = ms(2)` for the context line's `mt-0.5`, and
  `TRANSACTION_ROW_TITLE_BADGE_HEIGHT = 18`, the unscaled `TypeBadge` box the title row is measured
  against, with the one line the code cannot state: it mirrors `type_badge.tsx`'s `sm` variant
  (`:27,43,75-80`) and the render pass is what catches drift. Import `Type` and
  `lineHeightFor` from `@/constants/theme` (`theme.ts:86,111`); `theme.ts` reaches only
  `@/utils/responsive`, so no cycle. `TRANSACTION_ROW_OPTIONAL_TRACK_HEIGHT` (`:27`) stays for now
  and step 3 deletes it, once its last three readers have moved — the row (`transaction_row.tsx:22,
  113,142`), the skeleton (`transaction_rows_skeleton.tsx:9,54,68`) and the skeleton suite
  (`transaction_rows_skeleton.test.tsx:6,40`) are the whole reference set, so the branch typechecks
  after every commit.
- Test: `__tests__/screens/transactions/transaction_row.helpers.test.ts`, a new
  `describe('transaction row track geometry')`, written first, two assertions:
  1. Each track height is `lineHeightFor` of its own exported font size. Reds at base on the
     absent names; at head it is the coupling the `.tsx` now honours rather than an arithmetic
     claim, which is why the font sizes are exported at all.
  2. Neither column's line boxes exceed `TRANSACTION_ROW_HEIGHT − 2 ×
     TRANSACTION_ROW_VERTICAL_PADDING − 1`, the last term the row's own `border-b`, which Yoga
     takes out of the content box alongside the padding: value is `lineHeightFor(Type.body)` +
     `TRANSACTION_ROW_SECONDARY_AMOUNT_TRACK_HEIGHT` + `lineHeightFor(Type.overline)`, content is
     `Math.max(lineHeightFor(Type.meta), TRANSACTION_ROW_TITLE_BADGE_HEIGHT)` +
     `TRANSACTION_ROW_CONTEXT_GAP` + `lineHeightFor(Type.overline)` +
     `TRANSACTION_ROW_NOTE_TRACK_HEIGHT` — the max because the title row is a centred row over the
     title and the badge, so it is as tall as whichever is taller. This is the assertion that reds
     on the regression the ticket is about — a later bump to `Type.body`, to either track's font
     size, or a reversion of the padding to a fixed 12. It passes at base and at head (jest renders
     at `SCALE` 1.15 and `PixelRatio` 2, not the 3× density the table above replays, so
     `lineHeightFor(Type.chip)` is 14 and the slack is 3-4pt — content 52 and value 53 against a
     56pt box); the sum is the guard, assertion 1 is the proof of
     this commit.

### 2. The row body reserves both tracks in full and stops scaling the secondary amount down

- File: `src/modules/transactions/screens/transactions/components/transaction_row.tsx`
  (`TransactionRowBody`, row box `:62-66`, note track `:110-124`, secondary track `:139-158`)
- Change: the note track's `height` takes `TRANSACTION_ROW_NOTE_TRACK_HEIGHT` and its `Text`'s
  `fontSize` takes `TRANSACTION_ROW_NOTE_FONT_SIZE` (`:118`, `lineHeightFor` of it unchanged in
  form); the secondary track's `height` takes `TRANSACTION_ROW_SECONDARY_AMOUNT_TRACK_HEIGHT` and
  its `Text`'s `fontSize` takes `TRANSACTION_ROW_SECONDARY_AMOUNT_FONT_SIZE` (`:147`) — the same
  values as today's `Type.chip` and `Type.overline`, now read from where the track height reads
  them. Move the row's vertical padding out of the className (`:65`) into the style array (`:64`)
  as `paddingVertical: TRANSACTION_ROW_VERTICAL_PADDING`, leaving `px-4`; move the context line's
  `mt-0.5` (`:104`) to `marginTop: TRANSACTION_ROW_CONTEXT_GAP`. Update the import block
  (`:18-25`). Drop `adjustsFontSizeToFit` and `minimumFontScale={0.75}` from the secondary `Text`
  (`:149-150`) so it renders at its full declared size; the existing `numberOfLines={1}` keeps it
  to one line and truncates on width, the same contract the title (`:88`) and context (`:106`)
  already have. The nested rate chip (`:153-155`) carries no `fontSize` of its own, so it inherits
  the same line box and needs no change. Untouched: `TRANSACTION_ROW_HEIGHT` on the row (`:64`) and
  the `border-b` beside it, the primary amount's own `adjustsFontSizeToFit` /
  `minimumFontScale={0.72}` (`:134-135`), the icon and value tracks' dimensions, `timeText`
  (`:159-164`), and `presentation.accessibilityLabel` (`:60`) — nothing here reaches
  `buildTransactionRowPresentation`.
- Test: `__tests__/screens/transactions/transaction_row.test.tsx` — retarget the two existing
  track assertions (`:138-139`), today bare `toBeTruthy()` calls, to
  `toHaveStyle({ height: TRANSACTION_ROW_NOTE_TRACK_HEIGHT })` and
  `toHaveStyle({ height: TRANSACTION_ROW_SECONDARY_AMOUNT_TRACK_HEIGHT })`. Changed assertions, not
  added ones, so `tests.md:19` still holds — and the constant-bound style assertion is the shape
  `tests.md:23` names as the guard to keep. Without them nothing binds the row's own tracks to the
  new constants and a literal `height` written back into the row is caught by nothing. The
  remaining pins stay green unchanged: `:128,140` (row height still `ms(60)`), `:137` (value width
  still `ms(120)`), `:186` (`→ 4,850 EGP` still rendered).

### 3. The skeleton's placeholders follow the tracks they stand in for

- File: `src/modules/transactions/screens/transactions/components/transaction_rows_skeleton.tsx`
  (`:6-11` import, row box `:37-38`, content column `:46-56`, value column `:57-71`)
- Change: swap each `TRANSACTION_ROW_OPTIONAL_TRACK_HEIGHT` for the constant of the track it
  mirrors — note placeholder (`:54`) to `TRANSACTION_ROW_NOTE_TRACK_HEIGHT`, secondary placeholder
  (`:68`) to `TRANSACTION_ROW_SECONDARY_AMOUNT_TRACK_HEIGHT` — then give the four remaining
  placeholders the line box each stands in for instead of a fixed Tailwind height, since those
  heights are what would now overflow: title (`:47-49`) `lineHeightFor(Type.meta)`, context
  (`:50`) `lineHeightFor(Type.overline)`, primary amount (`:62-64`) `lineHeightFor(Type.body)`,
  time (`:70`) `lineHeightFor(Type.overline)`; the `w-*` widths and the alternating title and
  amount widths stay. Drop `gap-0.5` from both columns (`:46`, `:60`) and give the context
  placeholder `marginTop: TRANSACTION_ROW_CONTEXT_GAP`, so the skeleton's stack is the row's stack
  and not the row's plus four loose points. Row padding moves as it did on the row: `py-1.5` off
  the className (`:37`), `paddingVertical: TRANSACTION_ROW_VERTICAL_PADDING` into the style
  (`:38`). `TRANSACTION_ROW_HEIGHT`, `TRANSACTION_ROW_ICON_SIZE` (`:44`) and
  `TRANSACTION_ROW_VALUE_WIDTH` (`:59`) are unchanged, so the skeleton and the loaded row still
  share the same row box. With its last reader gone, delete
  `TRANSACTION_ROW_OPTIONAL_TRACK_HEIGHT` from `transaction_row.helpers.ts:27` in this step.
- Test: `__tests__/screens/transactions/transaction_rows_skeleton.test.tsx` — retarget the import
  (`:6`) and the existing note assertion (`:39-41`) to `TRANSACTION_ROW_NOTE_TRACK_HEIGHT`, and
  bind `transaction-row-skeleton-secondary-amount` (already fetched at `:38`) to
  `TRANSACTION_ROW_SECONDARY_AMOUNT_TRACK_HEIGHT`. Retargets of what the suite already fetches, the
  same reading of `tests.md:19` step 2 applies, and Acceptance requires the skeleton's
  shared-geometry tests to still hold. The four other placeholders get no new assertion: the
  skeleton is the surface no user reads, and step 1's column sum already guards the geometry they
  copy. Add one only if the skeleton's own column is what overflows, and say which.

## Screens

- Transactions list, `src/app/(app)/(tabs)/transactions/index.tsx` — three loaded rows in one shot
  where possible: a row whose note runs to the track's bottom edge (the reported `Weekly top-up`
  case), a transfer row showing `→ … EGP` above its time, and a non-EGP expense showing
  `≈ … EGP @ …`. Read the note's descenders and the gap between the secondary amount and the time.
- Account detail, `src/app/(app)/accounts/[id]/index.tsx`, the activity card — the same three row
  shapes, rendered through `DetailRowsCard` (`account_activity_card.tsx:46,62`) whose
  `overflow-hidden` (`detail_rows_card.tsx:12`) clips at the card edge rather than at the row's.
  The time slot here is the day label (`account_activity.helpers.ts:29-37`), the longer of the two
  strings that share the track.
- Commitment row carrying a note, on either screen: the title row's `TypeBadge` is an unscaled box
  taller than the title's own line, so it and not `Type.meta` sets the content column's height, and
  step 1's guard measures it through an 18pt estimate with zero slack at 320 and 360pt. This is the
  shot that decides whether the estimate holds. Read the note's last line against the row's bottom
  border.
- Width edge, on either screen: a seven-figure non-EGP row with a rate, `≈ 1,234,567 EGP @ 48.50`,
  against `TRANSACTION_ROW_VALUE_WIDTH`. This is the state the removed `adjustsFontSizeToFit` used
  to absorb, and it truncates now. Shoot it to confirm the tail ellipsises on one line at the full
  `Type.overline` size and clears the time below it — not to decide the width; the width is decided
  under Non-goals.
- Shoot base and head for the note row and the transfer row. The defect is a few points of
  overlap; a head-only screenshot does not show it moved.

## Non-goals

- The activity card, its states and its navigation — MA-028 (#402).
- `contextFor` in `transaction_row.helpers.ts:65-79` — MA-036 (#425) owns it.
- The transactions screen's layout, filters, grouping, and `SwipeableRow`.
- Widening `TRANSACTION_ROW_VALUE_WIDTH` or narrowing the content track to buy the secondary
  amount room. A truncated tail satisfies the Rules line, and no width would: the secondary amount
  is unabbreviated (`format_amount.ts:44-61`, EGP at 0 decimals) and its rate escalates to eight
  (`RATE_DISPLAY_DECIMALS_CEILING`, `:103`), so the string the formatter can emit is unbounded and
  a fixed track cannot "fit any magnitude" by being wider. The Rules line is met by a slot that
  special-cases no currency, renders at the declared size, and never overlaps — one line
  ellipsised, the contract the title and context already carry. Widening would also move where the
  title and context truncate on every row, which Acceptance bullet 5 forbids.
- The primary amount's `adjustsFontSizeToFit` / `minimumFontScale={0.72}` (`transaction_row.tsx:134-135`).
  It fits a full-size line box already; its shrink is a width guard and is out of scope.
- `TRANSACTION_ROW_HEIGHT`. It stays `ms(60)` and its two pinned assertions
  (`transaction_row.test.tsx:128,140`) stay untouched; the slack comes from the padding, which
  drops from a fixed 6 to `ms(5)` — 5pt at the baseline, and scaling from there.
- A new `.tsx` render suite, or a render assertion on the row's `className` strings — `tests.md:19,24`.

## Verification

- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Emulator: `mqa claim` first, then `mqa needs-build` — this diff is JS-only, so expect no Gradle
  build. Run the parity chain before the render pass so it and the battery's render lens share one
  APK.

## Risks

- The content column is the tight one below 390pt and the value column above it, and the table is
  arithmetic over the token functions, not over rendered text: it assumes the fonts honour
  `lineHeightFor`'s 1.3 ratio exactly and that
  no ascender or descender is drawn outside its line box. The content column is exact at 320 and
  360pt, and one of its terms is the badge estimate. If the render pass shows a descender or a
  badge clipped where the table says it fits, the padding constant is the dial — `ms(4)` buys 2pt
  at every width without touching `TRANSACTION_ROW_HEIGHT` — and step 1's sum assertion moves with
  it.
- Removing the auto-shrink turns a too-long secondary amount into a truncation. That is the
  decided behaviour, not an open question (Non-goals); the risk is only that the truncated string
  reads badly enough on the width-edge shot to be worth its own ticket. Do not answer it by
  restoring `adjustsFontSizeToFit`, which Acceptance bullet 2 rules out, or by widening the track
  inside this ticket.
- The ticket reports the note clipped at the row's bottom edge. The short track it names produces
  a collision whichever way the overflow resolves, so the fix stands either way — but if the base
  shot shows the note riding up into the context line rather than off the bottom, say so in the
  render evidence rather than quietly matching the ticket's wording.
- MA-036 (#425) edits `contextFor` in `transaction_row.helpers.ts`; whichever of the two merges
  second rebases, and a rebase invalidates the reviewed head and the render evidence with it.
- Amended after review: the taller tracks overflowed the row below 390pt, where the emulator pass
  cannot look, so step 1 scales the row's padding and step 2 and 3 carry it; the two exported font
  sizes and the column-sum assertion replace a proving test that restated its own definitions; the
  skeleton's fixed placeholder heights move to the same line boxes, since the taller tracks push
  its column past the row box on the same small screens; the secondary amount's width case is
  decided as a truncation under Non-goals rather than left to the render pass; and the shared
  constant now dies in step 3, after its last reader, so every commit typechecks.
- Amended after the second review: the arithmetic omitted the row's 1pt `border-b`, which sits on
  the same View as its height and so comes out of the content box — every inner box in the table
  and step 1's assertion 2 lose that point, and `ms(6)` no longer clears 360pt, so the padding is
  `ms(5)`. The content term takes the unscaled `TypeBadge` into account through
  `TRANSACTION_ROW_TITLE_BADGE_HEIGHT`, since the badge and not `Type.meta` sets the title row's
  height, and a commitment row carrying a note joins Screens because that box cannot be replayed
  here. Step 2 retargets the row's two existing track assertions rather than declining a test,
  and step 3 stops adding four: one reading of `tests.md:19` in both.

## Self-assessment

`TRANSACTION_ROW_TITLE_BADGE_HEIGHT = 18` in step 1 is the part I am least sure about, and the
second review is why it is load-bearing. Every other term is a function of `SCALE` I can execute
here; this one is not. `TypeBadge`'s `sm` variant is `py-[2px]` plus `border` plus the taller of a
10pt icon and a `text-[9.5px]` label, and I read those as 4, 2 and about 12 points from Tailwind's
arbitrary values and a runtime default line height — the same class of guess as the skeleton's
`h-4`, `h-3` and `gap-0.5`, which I read as 16, 12 and 2 from the default 0.25rem scale at a 16pt
rem (`global.css` declares no `--spacing`, so the scale is the default; the rem base is not
something I can execute here). With `ms(5)` the content column has exactly zero slack at 320 and
360pt, so a badge one point taller than 18 clips the note at the widths the emulator cannot show,
and a badge shorter than 18 only makes the guard stricter than the row. The commitment-row shot in
Screens is the check, and `ms(4)` is the dial if it fails. Step 3 remains the widest of the three,
six placeholders for a defect the user sees on none of them, and an implementer who finds the
skeleton's stack already matching the row's should say so and cut it back to the two tracks.
