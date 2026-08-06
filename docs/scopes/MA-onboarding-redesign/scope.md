# MA-onboarding-redesign — Onboarding Redesign & App Logo

## What this is

The four onboarding screens a new user walks through on first launch — welcome, add your first account, add more accounts, ready to start — get rebuilt as one coherent Cairo Nights experience. The app also picks up its real logo: the "Cross Fan" mark, three fanned account cards behind the folded MoneyApp symbol.

You designed and locked a version of this on 23 July, under the old workflow that has since been replaced. **The visual design is being restarted from scratch** — neither the July look nor the three directions explored since are carried forward. What survives from July is the functional detail: which fields exist, what validates, what the numbers must do. The new design works inside MoneyApp's existing design system — the same tokens, type, and component library the rest of the app already uses — so this stays contained to onboarding rather than becoming a re-skin of the whole app.

## Why now

Three things are wrong with onboarding today.

- **It looks nothing like the rest of the app.** These screens were built before the design system settled. They use hand-rolled controls where the app now has proper ones — including a plain grey system toggle for interest tracking that appears nowhere else in MoneyApp.
- **The account form exists twice.** Onboarding has its own copy of "add an account", and Settings has another. They drifted apart already: the same twelve colour swatches are declared in two separate files, and the swatch row itself is written three different ways across the app. Every future fix to account creation has to be made two or three times, and one of them will get missed.
- **The app has no logo.** It still ships the Expo placeholder icon.

There is also a real bug waiting on the last screen. The "Ready" summary adds up your account balances by simply summing the numbers — it ignores currency entirely, so an EGP account and a USD account get added together as if they were the same thing, and a credit card's debt gets added to your net worth instead of subtracted from it. The first number MoneyApp ever shows you is currently wrong for anyone with a credit card or a foreign-currency account.

## What we're building

- **All four onboarding screens rebuilt** on the app's real component library, with the layout holding still — no jumping when an error appears, a keyboard opens, or a button starts loading.
- **One shared account form** used by both onboarding and Settings, so account creation behaves identically wherever you reach it.
- **A richer colour picker** — the current twelve colours become sixteen colour families, each with a rich and a soft tone, opened in a proper bottom sheet instead of a cramped wrapping row. The same thirty-two colours everywhere an account colour can be chosen.
- **A corrected "Ready" summary** that converts currencies properly, subtracts credit-card debt, and refuses to show a number at all when it would have to guess an exchange rate.
- **The Cross Fan logo** applied to the launcher icon, the Android adaptive icon, the splash screen, and the onboarding header.
- **Credit-card accounts handled properly** in the form — amount owed, credit limit, minimum payment, due day, and optional interest tracking, with the balance field relabelled to "Amount currently owed".

## What we're not building

- No change to the flow itself — still the same four steps in the same order, and the same rules about when onboarding counts as finished.
- No change to how onboarding resumes after a force-close.
- No editing or deleting accounts during onboarding.
- No dashboard changes, no new screens, no new tabs.
- No database changes. Colours are stored as plain values, so a bigger palette needs no migration.
- No new libraries and no native code.
- No sign-in, PIN, biometrics, cloud sync, or bank connections.

## Status

**Gate 1 passed — design approved 2026-08-06** (round 5, mockup `assets/mockup.html`, commit `1b422269`). Step 2 in progress.

## Decisions resolved at gate 1

You approved every screen without separately answering the three open questions. Each follows from what the approved screens actually show, so they are recorded here as settled rather than left hanging. **Say so if any of these is not what you meant — reversing them is cheap now and expensive once tasks exist.**

**1. USD promises display, not architecture.** The approved welcome screen asks *"Which currency do you think in?"* and each option states a display consequence. That is the cheap answer, and it is honest under the current architecture where EGP is the storage currency. **The expensive answer — base currency meaning the same thing in every module — is explicitly NOT in this scope** and would be its own piece of work.

**2. The secondary-text colour — RE-OPENED 2026-08-06. This one still needs you.**

I recorded this as settled. That was wrong, and a reviewer caught it. The question offered "leave it and live with the rule" versus "lighten the token as separate work" — and **both options produce identical approved screens**, so approving the frames could not possibly have chosen between them. I read silence as an answer.

Worse, the approved frames **contradict the rule that made "leave it" acceptable**. The rule was that the muted colour is confined to genuinely redundant labels. In the mockup it also carries: an error-recovery instruction, the N3 explanation of what skipping means, the helper text under the APR toggle, and — most awkwardly — **the two currency sentences that decision 1 above rests on**. None of those is redundant; they are all text a user has to read.

The contrast figures are not in question: 4.33:1 on the background, 3.77:1 on cards, against a 4.5:1 floor for text under ~19px. **What is in question is whether onboarding can honestly claim to handle it by rule when the design puts load-bearing copy in that colour.**

**Your call, and it's a real one:**
- **Lighten the token** — one line, fixes it everywhere, touches every screen in the app. Its own piece of work.
- **Keep the token, change onboarding** — move the four offending strings to full-strength copy. Contained to this scope, but the screens get visually flatter, which is what you rejected in round 3.
- **Accept it as-is** — a deliberate, recorded AA miss on first-run copy. Legitimate if chosen knowingly; not legitimate as something I decided for you.

**3. The logo accent keeps the nudge.** Every approved frame shows the teal dot on the card corner rather than over the stem, so it no longer reads as "Mi" at launcher size.

Team decisions from gate 1 also stand: 32 colours (not 24), the credit-card hint row stays, and the separate "revolving balance" field is dropped.

## Carried into the build

One thing in the approved design is **not yet proven to work**: the gradient-filled "Finally clear." headline needs a technique nothing in the app uses today. It gets checked early, and if it doesn't hold up, flat gold replaces it with no change to layout or spacing. Nothing else depends on the outcome.

## Original open questions (for the record)

**1. What does choosing USD on the first screen actually promise?** The welcome screen offers EGP and USD as equal choices. But the rest of the app is built with EGP as its home currency — transactions store an EGP amount alongside the original, and the saved exchange rate is specifically a USD rate. So "base currency = USD" is a promise the summary screen can display but the rest of the app may not keep: a budget or dashboard total elsewhere could quietly assume EGP.

Marcus has designed for the cheap answer: the screen asks **"Which currency do you think in?"** and each option states a *display* consequence — "Every total in the app is shown in EGP" / "Totals convert to USD using the rate you save." That is honest under the current architecture. The expensive answer — making base currency mean the same thing in every module — reaches well outside onboarding and would be its own scope. **Take the cheap answer, or open the expensive one?**

**2. Secondary text is 4% under the accessibility floor, app-wide.** The muted text colour (`--content-secondary`) computes 4.33:1 on the app background and 3.77:1 on cards. The AA standard for text below ~19px is 4.5:1, so both miss — narrowly, but they miss. *(Verified independently, not taken on the designer's word.)*

Inside onboarding this is handled by rule: anything you must actually read is full-strength, and the muted colour is confined to genuinely redundant labels. The side effect is that the screens read flatter than the July version — hierarchy is carried by size and weight instead of colour. Lightening the token fixes it everywhere in one line, but that line touches every screen in the app. **Leave it and live with the rule, or lighten it as a separate piece of work?**

**3. The logo accent — confirm or revert.** The teal dot originally sat on the vertical stroke of the folded mark; dot over stem is the anatomy of a lowercase "i", so at launcher size it read as "Mi". Marcus has **already drawn it nudged** onto the card's corner instead. It's a one-line change to the artwork, not a redesign. **Confirm the nudge, or revert to the mark exactly as locked in July?**

### Decided by the team (revertible — say so if you disagree)

- **32 colours, not 24.** Sixteen families needs four new colour entries; twelve families would fit the same grid with none. Marcus prefers 32 because at 24 the picker stops reading as a complete chart. No migration either way.
- **The credit-card hint row stays.** It costs about 60pt of permanent space on the four account types that never use it, and buys the thing this scope exists to fix: the card fields open exactly where the placeholder was, instead of the page growing under your thumb.
- **The separate "revolving balance" field is dropped.** Two "how much do you owe" boxes on a first-ever screen is a comprehension trap. If the database column needs a value at creation, Layla derives it rather than asking a fifth question.
