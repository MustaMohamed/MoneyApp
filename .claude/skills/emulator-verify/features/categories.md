# Categories

Route `/settings/categories`. Screen `src/modules/categories/screens/settings/categories/index.tsx`, row `components/category_row.tsx`, add and edit sheet `components/add_edit_category_sheet.tsx`. Not redesigned; drawn as it is today. This file carries the colour states MA-103 needs; add the rest when a ticket reaches them.

## Reach it

- User path: Settings, then the `Categories` row (`Strings.settingsCategoriesRow`).
- Deep link: `$MQA open /settings/categories`.
- The `Expense` and `Income` segments (`Strings.categoriesTabExpense`, `categoriesTabIncome`) switch the list; the screen mounts on `Expense`.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| upgraded from 020 | no frame, MA-103 | push the MA-103 seed at schema 020 (§ Seeding and forcing states) before launch, then cold launch | `mqa db "select count(*) from categories where color in ('#1B2B4B','#4A2545','#185FA5')"` reads 0, `where color = '#ABCDEF'` reads 1, `select max(version) from schema_migrations` reads 21 |
| list row, recoloured glyph | no frame, MA-103 | the `Expense` list as it mounts | one shot of the Housing and Subscriptions rows: the glyph in `#5C7FC4` and `#B264A7` on its tint box, readable on the dark screen |
| edit sheet, migrated swatch selected | no frame, MA-103 | `Edit category` on the user category seeded on `#185FA5` (`Walk Blue`); seeded rows are locked and carry no edit button | `mqa bounds '#2381DF'` reads `selected` and it is the only one of the 12 swatch labels that does; one shot of the sheet |
| edit sheet, off-list tone unselected | no frame, MA-103 | `Edit category` on the user category on `#ABCDEF` (`Walk Own`); the seed-only tones (`#3E8F6A`, `#6B7F99`) sit on locked seeded rows, so this is the reachable case of a tone no swatch offers | `mqa bounds` over the 12 swatch labels reads no `selected`; one shot of the sheet |
| add sheet, first swatch default | no frame, MA-103 | `Add Category` (`Strings.categoriesAddBtn`), then `scroll down` inside the sheet | `mqa bounds '#5C7FC4'` reads `selected` on open, and no other swatch does; one shot of the swatch row |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| `Edit category` on a row | the edit sheet over this screen | this screen |
| `Add Category` | the add sheet over this screen | this screen |
| `Delete category` on a custom row | the delete dialog, or the reassign sheet when the category is in use | this screen |
| Back | Settings | n/a |

## Gotchas

- Seeded rows (`is_default = 1`) show a lock and no edit or delete button; only custom rows open the edit sheet.
- Every custom row's buttons carry the same labels, `Edit category` and `Delete category`; take the match whose `y` sits on the row's name from `mqa bounds 'label="Edit category"'` and `tapxy` its centre. `bounds` prints dp and `tapxy` presses device pixels, so multiply by 2.625.
- Close a sheet with `$MQA tap 'id="sheet-close-btn"'`. The swatch row sits below the sheet's fold on the Pixel_2 until the sheet scrolls.
- `open /settings/categories` onto the screen already showing keeps its scroll position; wait on `Expense`, not on a row.
- Each swatch's accessibility label is its hex and its `selected` state is `selectedColor === c`, so `mqa bounds label="<hex>"` is the whole proof of the selection; the ring is only the look.
- A migrated category and a fresh install hold the same tones; the fresh-install side is `__tests__/category_colour_contrast.test.ts`, not a walk.

## Seeding and forcing states

The mechanics are `README.md` § Seeding and forcing states. The MA-103 seed below is the one every MA-103 state in the feature files names; build it on the host with `better-sqlite3` and push it before launch.

Only `upgraded from 020` needs a schema-020 database: every migration up to 20 and `schema_migrations` rows 1 to 20, so the seeded categories still hold the shipped hexes and the launch runs 021 over them. Every other MA-103 state needs only a database holding the rows below, at any schema, because a fresh install holds the same tones.

- `app_settings`: `base_currency = EGP`, `onboarding_complete = true`, `usd_rate = 50`, `usd_rate_manual_override = false`, and `usd_rate_fetched_at` and `usd_rate_updated_at` set to one ISO timestamp. Without `onboarding_complete` the launch lands on N1.
- Account `acc_walk`, `Walk Bank`: a bank in EGP, opening balance 50,000, current balance 36,950 (the opening less the three expenses), colour `#1B2B4B`.
- Two custom expense categories, `is_default = 0`, icon `tag-outline`: `cat_walk_blue`, `Walk Blue`, on `#185FA5`, sort order 100; `cat_walk_own`, `Walk Own`, on `#ABCDEF`, sort order 101.
- Three EGP expenses on `acc_walk`, dated today, `egp_amount` equal to `amount`: `tx_housing` on `cat_housing`, 12,000, note `Rent`, 10:00; `tx_bills` on `cat_bills`, 800, note `Electricity`, 11:00; `tx_subs` on `cat_subscriptions`, 250, note `Netflix`, 12:00.
- Commitment `cmt_rent`, `Walk Rent`: fixed 12,000 EGP on `cat_housing`, every 1 month, starting on the 5th of an earlier month this year, account `acc_walk`. One payment, `cpay_rent_oct`, due the 5th of next month, amount due 12,000 EGP, on `acc_walk`, status `upcoming`. The launch adds the current month's payment, which reads `Overdue` once the 5th has passed.
- Budget `bud_housing` on `cat_housing`, named `Housing`, limit 15,000, `effective_from` the current month as `YYYY-MM`.

The ids open their screens by deep link: `/accounts/acc_walk`, `/transactions/detail/tx_housing`. The commitment detail opens from its list row (`commitment_detail.md` § Gotchas).
