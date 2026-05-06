# M1.5 — Dashboard + Account Management: Plan Index

> **Spec:** `docs/superpowers/specs/2026-05-01-m1.5-tech-spec-design.md`

## Phases

| Phase | File | Scope | Tasks |
|---|---|---|---|
| 1 | [phase-1-foundation.md](./phase-1-foundation.md) | Branch, schema extraction, strings, database, repo, stores | 1–6 |
| 2 | [phase-2-navigation.md](./phase-2-navigation.md) | Navigation scaffold, dashboard helpers (TDD) | 7–8 |
| 3 | [phase-3-dashboard.md](./phase-3-dashboard.md) | Dashboard screen U2 | 9 |
| 4 | [phase-4-account-detail.md](./phase-4-account-detail.md) | Account Detail screen U3 (store TDD + screen) | 10–11 |
| 5 | [phase-5-add-account.md](./phase-5-add-account.md) | Add Account U4 + global Empty States | 12–13 |
| 6 | [phase-6-settings.md](./phase-6-settings.md) | Settings Main U23 + Settings Currency U26 | 14 |
| 7 | [phase-7-finish.md](./phase-7-finish.md) | Coverage config, full test run, PR | 15 |

## Execution Order

Execute phases in order. Each phase produces working, committed code. Do not start Phase N+1 until all tests in Phase N pass.

## Key Decisions (from spec)

- Navigation: `(app)` group + nested `(tabs)` — Expo Router v3
- Currency store: DI factory `createCurrencyStore(repo: IAppSettingsRepository)` — keys `usd_rate`, `usd_rate_fetched_at`, `usd_rate_manual_override`
- Net worth: Assets − Liabilities; CC accounts are liabilities; USD converted via `balance × rate`
- Shared schema: `utils/schemas/add_account.schema.ts` — used by both O4 and U4
- Exchange Rate API: `https://open.er-api.com/v6/latest/USD` → `response.rates.EGP`
- Unique name check in edit mode excludes current account by ID
- Old `app/dashboard/index.tsx` conflicts with `(app)/(tabs)/dashboard/index.tsx` — must be deleted in Phase 2
