# MA-079 — Edit account screen: the card's credit block with currency and % suffixes; the three shared strings
base: 513ee5c8c1dc9da160623d2d4ad71e7dcc13a85b · verify: emulator · flags: money path, user copy · expected diff: ~120 lines outside tests, ~150 in tests

## Steps
### 1. The three shared credit strings read the canvas copy, and APR has a `%` suffix string
- File: `src/constants/strings.ts` (`accountDueDayHelper` :48, `accountInterestHelper` :51, `errDueDayRange` :58)
- Change: `accountDueDayHelper` becomes "Day of the month, 1 to 31.", `errDueDayRange` becomes "Between 1 and 31.", `accountInterestHelper` becomes "Estimate interest from the APR on the revolving balance.". Add `accountAprSuffix: '%'` beside `accountAprPlaceholder`. Every other consumer reads these by key (`credit_fields.schema.ts:80`, `credit_card_fields.tsx:92,115`, the schema suites), so the add form and N2 pick them up with no further edit.
- Test: `__tests__/screens/accounts/edit_account.strings.test.ts`, a new `describe('shared credit copy (D2, D3)')` asserting the three strings and `accountAprSuffix` byte-exact. It fails at base.

### 2. Credit limit and minimum payment pre-fill at two decimals
- File: `src/modules/accounts/screens/accounts/edit_account/edit_account.helpers.ts` (`buildEditAccountDraft` :11-21)
- Change: a module constant `CREDIT_DRAFT_MONEY_DECIMALS = 2`, with a one-line comment tying it to `roundMoney`'s stored precision. `credit_limit` and `min_payment` become `''` for a null column, otherwise `formatAmount(value, CREDIT_DRAFT_MONEY_DECIMALS)` from `@/utils/format_amount`. `apr` keeps `formatStoredMoneyText` and `due_day` keeps `String(day)`.
- Test: `__tests__/screens/accounts/edit_account.helpers.test.ts`. Rewrite :28-38 to `credit_limit: '1,500.50'`, `min_payment: '200.00'`, `apr: '24.5'`, `due_day: '15'`. Rewrite :54-56 to 8450 drafting as `'8,450.00'`. Add a card with `minimum_payment: null` drafting `min_payment: ''`, and a round-trip of an 8450 limit through `createEditAccountFormSchema(...).parse` and `toUpdateAccountInput` back to `credit_limit: 8450`. The existing round-trip at :40-52 and the bank case at :58-70 stay as they are and must pass.

### 3. A helperless message rail can reserve one or two error lines
- File: `src/modules/accounts/components/account_form/account_form.geometry.ts`; `src/modules/accounts/components/account_form/field_message_rail.tsx` (`FieldMessageTrackProps`, `FieldMessageRailProps`, the track's `style` at :37)
- Change: in the geometry file, add `fieldMessageRailStyle(reserveErrorLines?: 1 | 2)`.
  - Omitted, it returns `FIELD_MESSAGE_RAIL_STYLE` itself.
  - Given `n`, it returns `{ ...FIELD_MESSAGE_RAIL_STYLE, minHeight: Math.max(Size.fieldMessageTrack, Size.fieldRailTextInset + n * FIELD_MESSAGE_TEXT_LINE_HEIGHT) }`. With `n = 1` this is the formula `edit_account/index.tsx:32-35` uses for the name rail.
  - Add optional `reserveErrorLines?: 1 | 2` to both props. `FieldMessageRail` forwards it, and `FieldMessageTrack` sets `style={fieldMessageRailStyle(reserveErrorLines)}`.
  - An empty rail at `Size.fieldMessageTrack` is shorter than a one-line error, and a wrapped error is two lines, so without the reserve the row grows when an error lands.
  - Omitted, the track gets the same style object as today, so the add form and N2 render as before.
- Test: `__tests__/account_form.geometry.test.ts`, three cases written first:
  - `fieldMessageRailStyle()` is `toBe(FIELD_MESSAGE_RAIL_STYLE)`.
  - `fieldMessageRailStyle(1)` has `minHeight` equal to `Math.max(Size.fieldMessageTrack, Size.fieldRailTextInset + FIELD_MESSAGE_TEXT_LINE_HEIGHT)`, `paddingTop` equal to `Size.fieldRailTextInset`, and no `height` key.
  - `fieldMessageRailStyle(2)` has `minHeight` equal to `Size.fieldRailTextInset + 2 * FIELD_MESSAGE_TEXT_LINE_HEIGHT`, greater than the one-line value, and no `height` key.

  That the track calls the helper is render wiring with no test; the D3 shots cover it.

### 4. The credit rows take suffixes and a helperless mode, both optional
- File: `src/modules/accounts/components/account_form/credit_card_fields.tsx` (`CreditCardFieldsProps` :14-16, the `Input`s at :32-39, :54-61, :130-138, the rails at :42-46, :64-68, :141)
- Change: add `currency?: Currency` and `hideHelpers?: boolean`. With `currency`, credit limit and minimum payment pass `suffix` with `CURRENCY_CONFIG[currency].code`, and APR passes `suffix` with `Strings.accountAprSuffix`. The suffix is a `Typography` in the `balance_currency_suffix.tsx:18-23` shape, font-sora, `text-content-secondary`, `Type.meta` with `lineHeightFor`, as a local component in this file, because `InputGroup.Suffix` crashes on a bare string. With `hideHelpers`, the credit limit, minimum payment and APR rails pass no `helper`. The credit limit and minimum payment rails pass `reserveErrorLines={hideHelpers ? 2 : undefined}`, because "Credit limit is required for credit cards" and "Enter a limit greater than zero." wrap in the half-width cell. The full-width APR rail passes `reserveErrorLines={hideHelpers ? 1 : undefined}`. Without `hideHelpers` every rail keeps today's helper and geometry. Ruled 2026-09-16 on review. The due-day rail keeps its helper in both modes, as D2 draws it. Neither prop is passed by `credit_card_slot.tsx:84`, so `Input` keeps its no-suffix branch there and the add form is unchanged.
- Test: none. A component render test is forbidden by `.claude/rules/tests.md`, and the D2 shot covers the pixels.

### 5. A card's edit screen renders the credit block, and the hook's credit paths are pinned
- File: `src/modules/accounts/screens/accounts/edit_account/index.tsx` (after the Type and Currency row, :103-119)
- Change: when `isCreditCard`, render `<Box className="pt-1"><CreditCardFields form={form} currency={account.currency} hideHelpers /></Box>`. The wrapper has no `gap`. `pt-1` puts the step MA-078 puts before each group between the Type row and the block. Inside, the fragment's rows sit flush and their rails carry the spacing, as D2's `.form` draws them: a flex column with no gap. Leave out the add slot's border, header and chip; D2 draws none. `form` is `UseFormReturn<EditAccountFormData>` and `EditAccountFormData` spreads `creditFieldsShape`, so the generic resolves with no cast. The hook, the schema, the mapper and the save flow are untouched: the form already holds the five fields, validates them through `addCreditFieldIssues` and writes them through `toUpdateAccountInput`.
- Test: `__tests__/screens/accounts/edit_account.hook.test.ts`. Widen `edit()` (:93-98) to set any `EditAccountFormData` field. Add these cases on `card` (`current_balance: 900`), each asserting the `mockUpdateAccount` payload or its absence:
  - Edited values: limit `'12,000.00'`, minimum `'300'`, due day `'5'`, APR `'19.9'` send `credit_limit: 12000`, `minimum_payment: 300`, `statement_due_day: 5`, `interest_tracking: 1`, `apr: 19.9`, with name and colour unchanged, then `dismissTo('/accounts/card-1')`.
  - A limit of `'500'`, below the 900 owed, saves with `credit_limit: 500`.
  - Tracking turned off sends `interest_tracking: 0` and `apr: null`.
  - A card stored with tracking off, turned on with an empty APR, gets no write, `errors.apr.message === Strings.errAprRequired`, and the count "Fix the 1 fields marked above.". It runs on a new module fixture, `untrackedCard`: id `card-3`, a unique name, EGP, limit 20000, minimum 200, `current_balance: 900`, `interest_tracking: 0`, `apr: null`. `setup()` adds it to `accounts`, because `card` is stored with tracking on (`:43`) and `paidDownCard` raises its own minimum fault (`:51-59`).
  - Due day `'45'` gets `errors.due_day.message === 'Between 1 and 31.'` and no write.
  - Minimum `'950'` gets `errors.min_payment.message === 'More than you owe.'` and no write.
  - D3 is due day `'45'` plus an empty name: `statusMessage` reads "Fix the 2 fields marked above.".
  
  These cases pass once step 1 lands, because the behaviour is MA-074's and MA-078's; they pin it under the rendered block.

### 6. The decision record covers the 2dp pre-fill and the credit block
- File: `docs/adr/2026-09-16-account-edit-draft-precision.md`
- Change: amend §1. `credit_limit` and `minimum_payment` draft through `formatAmount` at `CREDIT_DRAFT_MONEY_DECIMALS` (2), "8,450.00" and "1,500.50". The text re-parses to the stored number because `DECIMAL_PATTERN` (`parse_decimal.ts:3`) admits grouping and the only two writers, `toNewAccountInput` and `toUpdateAccountInput`, round to 2dp in `optionalAmount`. APR keeps `formatStoredMoneyText` and due day `String(day)`. The cost, accepted 2026-09-16 in /prep, is that the credit inputs are unmasked, so deleting one digit of "8,450.00" leaves "8,40.00", which reads "Numbers only." on save. Delete the "until MA-079 renders the fields" sentence. Rewrite §3 to say what the credit block edits:
  - the five columns through the §2 save
  - the suffixes: `CURRENCY_CONFIG` code on the two money fields, `%` on APR
  - the D2 helperless rails: two error lines under limit and minimum, one under APR, so no field moves when an error appears
  - the three shared strings, which the add form and N2 now read
  - no balance column, since the `UPDATE` names none

  It also says what shows after a save. The detail hero, the facts and the list caption's limit and available figures read the store row that `writeThenReload` reloads. The dashboard card and the net-worth breakdown read the snapshot, which reloads on the dashboard's next focus because its blur calls `invalidate()` (`dashboard.hook.ts:95`). Add the files from steps 1 to 5 to "Applies to".
- Test: none, a record.

## Screens
The walk runs on an EGP card seeded with limit 8,450, current balance 2,000, minimum 500, due day 15, tracking on at APR 24.5, so the minimum sits at or below the balance.
- Card detail, Edit (D2), filled:
  - "8,450.00" and "500.00" with the EGP suffix, due day "15" with its helper
  - the switch with its new helper, APR "24.5" with `%`
  - no helper under limit, minimum or APR
- After a save with limit 10,000 and due day 20: the detail hero's available credit and the facts rows, then the dashboard account card's limit, available and due date.
- Error (D3): name cleared and due day 45, then Save.
  - The name and due-day rails show their lines, and the footer reads "Fix the 2 fields marked above.".
  - Rows below the due day sit at the y they had in the D2 shot.
- Credit limit cleared, then Save: "Credit limit is required for credit cards" sits on two lines inside the reserved rail, and the due-day row keeps its D2 y.
- Add account with Credit Card selected: the due-day helper and the interest helper in the slot. This is the one shot beyond the ticket's walk, because a wrap in the narrower slot cell is visible nowhere else.

## Decision record
- `docs/adr/2026-09-16-account-edit-draft-precision.md`: §1 amended to the 2dp pre-fill of the two money fields, §3 extended with the credit block and what shows after a save. Step 6 edits the file.

## Non-goals
- The route, the name and colour fields, the locked fields, the footer and the save flow, which are MA-078's. That includes folding `NAME_RAIL_MIN_HEIGHT` (`index.tsx:32`) into `fieldMessageRailStyle`.
- APR and due-day pre-fill.
- Any change to `credit_fields.schema.ts`, `edit_account.schema.ts`, `toUpdateAccountInput` or SQL.
- Removing the detail's inline edit, MA-080.
- An input mask on the credit fields.
- Moving `BalanceCurrencySuffix` onto the new suffix component.
- Suffixes or helperless rails on the add form.
- The due-day helper's colour. D2 paints it `content-secondary`, and `FieldMessageTrack` keeps `text-foreground` on purpose (`field_message_rail.tsx:62`).
- Clamping `nextDueDate` to month end, audit M20.
- Reserving error lines on the add form's rails.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- The emulator pass runs after the parity chain, and `mqa needs-build` decides the build. The diff is JS-only.

## Risks
- `errCreditLimitRequired`, "Credit limit is required for credit cards" (`strings.ts:166`), and `errCreditLimitPositive` wrap to two lines in a half-width cell. The add form keeps its geometry, so its due-day row moves on those faults. That is known and out of scope.
- The two-line reserve leaves about 23pt more space under the limit and minimum row than D2 draws, and a wrap past two lines at a large font scale still moves the rows below.
- The new due-day helper may wrap in the add slot's cell (`credit_card_slot.tsx:83` padding), growing that row. The add-form shot decides whether this needs a ruling.
- A stored limit or minimum with more than two decimals, possible only in a hand-seeded database, rounds in the pre-fill, and a colour-only save would rewrite it.
- If `formatAmount`'s `en-US` grouping ever changes, the pre-fill stops matching `DECIMAL_PATTERN` and every card save refuses with "Numbers only.". The step 2 round-trip test catches it.
- Amended on review, 2026-09-16:
  - Steps 3 and 4: a pure `fieldMessageRailStyle` with both branches tested, plus two reserved lines under limit and minimum on the edit screen, because Acceptance 5 is locked.
  - Step 5: names the wrapper, flush rows as D2 draws.
  - Step 6's rails bullet, Screens, Non-goals and this section follow those changes.

## Self-assessment
Step 4 is the least certain. Its helperless mode comes from D2 and D3, which draw no helper under limit, minimum or APR. The Acceptance names only the due-day and switch helpers, so the removal of the other three rests on the canvas-copy rule, and a reviewer reading only the Acceptance may expect "Required." to stay. Once a helper is gone, the reserve has to cover the error that replaces it. The two-line figure assumes both limit faults wrap to exactly two lines at the device's font scale, and that RN counts `paddingTop` inside `minHeight` as MA-078's name rail does. A unit test can pin the style the helper returns. Whether the track applies it and no row moves shows only in the D3 and cleared-limit shots.
