# MA-onboarding-redesign — Onboarding Redesign & App Logo

## What this is

The four onboarding screens a new user walks through on first launch — welcome, add your first account, add more accounts, ready to start — get rebuilt as one coherent Cairo Nights experience. The app also picks up its real logo: the "Cross Fan" mark, three fanned account cards behind the folded MoneyApp symbol.

You already designed and locked all of this on 23 July, under the old workflow that has since been replaced. That work survived; the process around it did not. This scope carries the design forward into the current nine-step flow.

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

## Open questions

**1. The logo reads "Mi", not "M".** The teal accent dot sits directly on top of the vertical stroke at the right of the folded mark — dot over stem is the anatomy of a lowercase "i". At launcher size, where the fine detail drops out first, Marcus expects it to read as "Mi", which also collides with an existing phone brand. His recommendation is to keep the accent but shift it up and to the right so it sits over the card's corner rather than the stroke — a one-line change to the artwork, not a redesign. **Do you want that nudge, or ship the mark exactly as locked?**

**2. What does choosing USD on the first screen actually promise?** The welcome screen offers EGP and USD as equal choices. But the rest of the app is built with EGP as its home currency — transactions store an EGP amount alongside the original, and the saved exchange rate is specifically a USD rate. So "base currency = USD" is a promise the summary screen can display but the rest of the app may not keep: a budget or dashboard total elsewhere could quietly assume EGP. Two ways out — reword the welcome screen so the choice reads as "which currency do you think in" rather than "which currency the app runs on", or commit to making base currency mean the same thing everywhere. The second is considerably more work and reaches outside onboarding. **Which way?**

**3. Your original mockup is gone, so the one attached is a rebuild.** The approved HTML from July lived in a scratch folder that was never committed and no longer exists. Marcus reconstructed the screens from the written design, which is detailed enough to do that faithfully — but you are reviewing a reconstruction, not the file you signed off. **Worth checking it still matches what you remember approving.**
