# HeroUI Tab Screen Headers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify top-level tab screen headers with HeroUI Native built-in primitives.

**Architecture:** Do not introduce a custom header wrapper. Each tab screen composes a small header locally from HeroUI Native `Surface`, `Text`, `Button`, and `Separator`; existing HeroUI `Tabs` and screen-specific filters stay below the header.

**Tech Stack:** Expo Router, React Native, TypeScript, HeroUI Native, Jest.

---

### Task 1: Add Header Primitive Regression Tests

**Files:**
- Modify: `__tests__/screens/commitments.screen.test.tsx`
- Create: `__tests__/screens/tab_screen_headers.test.ts`

- [x] Add a static regression test covering Dashboard, Budget, Transactions, Commitments, and Goals.
- [x] Assert each screen composes the top-level header from HeroUI `Surface`, `Text`, and `Separator`.
- [x] Assert Dashboard and Budget header actions use HeroUI `Button` rather than raw text or `PressableFeedback`.
- [x] Run `npm test -- __tests__/screens/tab_screen_headers.test.ts --runInBand` and confirm the new tests fail before implementation.

### Task 2: Convert Tab Screen Headers

**Files:**
- Modify: `src/modules/dashboard/screens/dashboard/index.tsx`
- Modify: `src/modules/budget/screens/budget/index.tsx`
- Modify: `src/modules/transactions/screens/transactions/index.tsx`
- Modify: `src/modules/commitments/screens/commitments/index.tsx`
- Modify: `src/modules/goals/screens/goals/index.tsx`

- [x] Replace custom tab-level header rows with local HeroUI composition.
- [x] Use `Surface variant="transparent"` for the header area and `Separator` for the bottom rule.
- [x] Use HeroUI `Text.Heading type="h3"` for tab titles.
- [x] Use HeroUI `Button variant="ghost" size="sm" isIconOnly` for icon actions.
- [x] Use HeroUI `Button variant="ghost" size="sm"` with `Button.Label` for Budget's add-category action.
- [x] Keep month filters directly below the header on Transactions and Commitments.
- [x] Run the focused test command and make sure the tests pass.

### Task 3: Verify

**Files:** No additional files.

- [x] Run `npm run format:check`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.
- [x] Run the targeted Jest command from Task 1 plus existing commitment month-filter tests.
- [x] Summarize remaining manual device QA: visual comparison across tab screens and tap targets.
