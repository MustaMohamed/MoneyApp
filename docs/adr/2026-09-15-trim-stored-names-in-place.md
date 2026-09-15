# ADR: Stored category and commitment names are stripped in place

- **Date:** 2026-09-15
- **Status:** accepted
- **Ticket:** #463 (MA-058)
- **Applies to:** `src/database/migrations/020_trim_category_and_commitment_names.ts`, `src/modules/categories/screens/settings/categories/components/add_edit_category_sheet.schema.ts`, `src/modules/commitments/screens/commitments/commitment_form.shared.ts`, `src/modules/categories/repositories/category.repository.ts`, `src/utils/strip_name_edges.ts`

Migration 020 removes leading and trailing whitespace from every stored category and commitment name. It rewrites `name` and nothing else, keeps every row, and leaves a name that strips to `''` empty.

## 1. Whitespace is four ASCII characters

A name's edge whitespace is a space, tab, carriage return or newline. `stripNameEdges` spells the set once in TypeScript and both name schemas and the category repository call it. The migration spells the same four in SQL: `TRIM(name, ' ' || char(9) || char(10) || char(13))`.

`String.prototype.trim` and Zod's `.trim()` are not used. They also strip NBSP and the other Unicode spaces, so a name the schema accepted could differ from the one SQLite's `TRIM` produced. A name of only Unicode spaces is not blank under this rule and saves as typed.

## 2. Only `name` changes, and rows that collide stay

Each `UPDATE` sets `name` alone, under `WHERE name <> TRIM(...)`, so a clean row is not written and `updated_at` does not move on any row.

Two categories of the same type can strip to the same name, `Rent` and ` Rent `. Both stay. Deleting one, or renaming it with an invented suffix, would lose or alter what the user entered, and that is the data loss the migration exists to avoid. The app already tolerates same-name rows: no UNIQUE constraint or index exists on `categories.name` or `commitments.name`, and the duplicate check runs only when a name is saved.

## 3. Blank names stay blank

A name that strips to `''` is stored as `''`. The migration does not invent a replacement. The display fallback for a blank category or commitment name is the category and commitment twin of MA-057 (#462), unfiled.
