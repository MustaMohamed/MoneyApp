/**
 * Compile-time migration toggles. No runtime service, no remote override,
 * no segmentation. `as const` = tree-shakeable by bundler.
 *
 * Flag flip process (enforced by [tariq] code review + [sarah] gate):
 * 1. Dev opens a one-line PR flipping the target flag false → true.
 * 2. [tariq] reviews and merges only after that section's code-review gate passes.
 * 3. The flag flip lands in the same commit that promotes the migrated screen
 *    to the active route. Never earlier, never as a separate commit.
 * 4. Cleanup rule: within 5 business days of the flag flip merging, a follow-up
 *    PR deletes old screen files, removes the flag entry, and removes any
 *    conditional in the route index.tsx that read the flag. May not be deferred.
 * 5. Next section's plan is not approved until the current section's cleanup PR
 *    has merged to main. [sarah] enforces.
 */
export const FeatureFlags = {
  newOnboarding: false, // §2 — flip when Onboarding section lands
  newSettings: false, // §4
  newDashboard: true, // §5
  newTransactions: false, // §6
  newAddTransaction: false, // §7 (sheet)
  newCommitments: false, // §8
  newAccounts: false, // §9
} as const;
