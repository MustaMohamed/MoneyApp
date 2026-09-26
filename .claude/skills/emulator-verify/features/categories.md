# Categories

Route `/settings/categories`. Screen `src/modules/categories/screens/settings/categories/index.tsx`, row `components/category_row.tsx`, add and edit sheet `components/add_edit_category_sheet.tsx`. Not redesigned; drawn as it is today. This file carries the colour states MA-103 needs; add the rest when a ticket reaches them.

## Reach it

- User path: Settings, then the `Categories` row (`Strings.settingsCategoriesRow`).
- Deep link: `$MQA open /settings/categories`.
- The `Expense` and `Income` segments (`Strings.categoriesTabExpense`, `categoriesTabIncome`) switch the list; the screen mounts on `Expense`.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| upgraded from 020 | no frame, MA-103 | push the 020 upgrade seed (Gotchas) before launch, then cold launch | `mqa db "select count(*) from categories where color in ('#1B2B4B','#4A2545','#185FA5')"` reads 0, `where color = '#ABCDEF'` reads 1, `select max(version) from schema_migrations` reads 21 |
| list row, recoloured glyph | no frame, MA-103 | the `Expense` list as it mounts | one shot of the Housing and Subscriptions rows: the glyph in `#5C7FC4` and `#B264A7` on its tint box, readable on the dark screen |
| edit sheet, migrated swatch selected | no frame, MA-103 | `Edit category` on the Housing row; then on the `#185FA5` user category | `mqa bounds label="#5C7FC4"` reads `selected` and no other swatch does; on the user category `#2381DF` reads `selected`; one shot of the swatch row |
| edit sheet, seed-only tone unselected | no frame, MA-103 | the `Income` segment, `Edit category` on Salary (`#3E8F6A`, no swatch carries it) | `mqa bounds` over the 12 swatch labels reads no `selected` |
| add sheet, first swatch default | no frame, MA-103 | `Add Category` (`Strings.categoriesAddBtn`) | `mqa bounds label="#5C7FC4"` reads `selected` on open; one shot of the swatch row |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| `Edit category` on a row | the edit sheet over this screen | this screen |
| `Add Category` | the add sheet over this screen | this screen |
| `Delete category` on a custom row | the delete dialog, or the reassign sheet when the category is in use | this screen |
| Back | Settings | n/a |

## Gotchas

- Every row's edit and delete buttons carry the same labels, `Edit category` and `Delete category`; pick the match by `mqa bounds`, the one whose `y` sits on the row's name, and `tapxy` its centre.
- Each swatch's accessibility label is its hex and its `selected` state is `selectedColor === c`, so `mqa bounds label="<hex>"` is the whole proof of the selection; the ring is only the look.
- Upgrade seed: build it on the host from `MIGRATIONS.filter(version <= 20)` with `PRAGMA journal_mode=DELETE` and `schema_migrations` rows 1 to 20, add one user category on `#185FA5` and one on `#ABCDEF`, and push it before launch (`README.md` § Seeding and forcing states). MA-103's builder is `~/.ship/MoneyApp/MA-103/findings/render/build_seed_020.mjs`. Leave it on the device for the render lens.
- A migrated category and a fresh install hold the same tones; the fresh-install side is `__tests__/category_colour_contrast.test.ts`, not a walk.

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
