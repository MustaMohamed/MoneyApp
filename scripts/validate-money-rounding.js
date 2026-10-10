// Check 1 of docs/adr/2026-08-22-money-rounding-layer.md §6; one entry is one helper with one path.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { stripComments } = require('./lib/strip-comments');

const root = path.join(__dirname, '..');
const errors = [];

const SELF = 'scripts/validate-money-rounding.js';
const RECORD = 'docs/adr/2026-08-22-money-rounding-layer.md';

// ASCII ascending by path under each helper, matching `git ls-files` order.
const PERMITTED = {
  roundMoney: [
    'src/modules/accounts/components/account_form/account_form.helpers.ts',
    'src/modules/accounts/domain/account_figures.ts',
    'src/modules/accounts/repositories/account.repository.ts',
    'src/modules/budget/repositories/budget.repository.ts',
    'src/modules/commitments/repositories/commitment.repository.ts',
    'src/modules/dashboard/screens/dashboard/dashboard.helpers.ts',
    'src/modules/onboarding/domain/approximation_pill.ts',
    'src/modules/onboarding/domain/starting_net_position.ts',
    'src/modules/transactions/domain/transaction_amounts.ts',
    'src/modules/transactions/domain/transaction_policy.ts',
    'src/utils/money.ts',
  ],
  toCents: [
    'src/modules/transactions/screens/transactions/transactions.helpers.ts',
    'src/utils/money.ts',
  ],
  sumAllocations: [
    'src/modules/budget/screens/budget/spending_plans.helpers.ts',
    'src/utils/money.ts',
    'src/utils/schemas/budget.schema.ts',
  ],
  exceedsToCent: [
    'src/modules/accounts/domain/is_over_limit.ts',
    'src/modules/budget/screens/budget/budget.helpers.ts',
    'src/modules/budget/screens/budget/spending_plans.helpers.ts',
    'src/modules/budget/utils/budget_summary.ts',
    'src/modules/dashboard/screens/dashboard/dashboard.helpers.ts',
    'src/utils/money.ts',
  ],
  ratioHeldAtTie: [
    'src/modules/budget/screens/budget/budget.helpers.ts',
    'src/modules/budget/screens/budget/spending_plans.helpers.ts',
    'src/utils/money.ts',
  ],
  wholePercent: [
    'src/modules/budget/screens/budget/budget.helpers.ts',
    'src/modules/budget/screens/budget/budget_buckets.helpers.ts',
    'src/modules/budget/screens/budget/spending_plans.helpers.ts',
    'src/modules/budget/screens/budget/spending_plans_summary.helpers.ts',
    'src/modules/dashboard/screens/dashboard/components/budget_card.tsx',
    'src/modules/dashboard/screens/dashboard/dashboard.helpers.ts',
    'src/utils/money.ts',
  ],
  wholePercentOf: [
    'src/modules/budget/screens/budget/spending_plans.helpers.ts',
    'src/modules/commitments/screens/commitments/components/summary_header.tsx',
    'src/modules/dashboard/screens/dashboard/components/commitments_card.tsx',
    'src/modules/transactions/screens/transactions/transactions.helpers.ts',
    'src/utils/money.ts',
  ],
  wholePercentGap: [
    'src/modules/budget/screens/budget/spending_plans.helpers.ts',
    'src/utils/money.ts',
  ],
  compareToPercent: [
    'src/modules/accounts/constants/available_credit_color.ts',
    'src/modules/budget/screens/budget/budget.helpers.ts',
    'src/modules/budget/screens/budget/spending_plans.helpers.ts',
    'src/modules/budget/utils/budget_summary.ts',
    'src/utils/money.ts',
  ],
  compareGapToPoints: [
    'src/modules/budget/screens/budget/spending_plan_timing.helpers.ts',
    'src/utils/money.ts',
  ],
};

// No `g` flag (`test` carries `lastIndex`); the paren keeps an import specifier and a longer name out.
const CALLS = Object.keys(PERMITTED).map((helper) => ({
  helper,
  pattern: new RegExp(`(?<![\\w$])${helper}\\s*\\(`),
}));

const listing = spawnSync(
  'git',
  ['-c', 'core.quotePath=false', 'ls-files', 'src/*.ts', 'src/*.tsx'],
  {
    cwd: root,
    encoding: 'utf8',
  },
);

// `spawnSync` returns `stdout: undefined` on failure, so this must precede the split below.
if (listing.error || listing.status !== 0) {
  console.error(
    `git ls-files failed to run; run from a git checkout of MoneyApp (${listing.error?.message ?? `exit code ${String(listing.status)}`})`,
  );
  process.exit(1);
}

const files = listing.stdout.split('\n').filter(Boolean);

// A broken pathspec would otherwise report every entry as stale, or pass with zero files scanned.
if (files.length === 0) {
  console.error('git ls-files returned no files; run from a git checkout of MoneyApp');
  process.exit(1);
}

const fileSet = new Set(files);
const calledPairs = new Set();

function pairKey(helper, file) {
  return `${helper} ${file}`;
}

for (const file of files) {
  const abs = path.join(root, file);
  // A tracked file deleted from the working tree is still in `ls-files`.
  if (!fs.existsSync(abs)) continue;
  const lines = stripComments(fs.readFileSync(abs, 'utf8').split('\n'));
  lines.forEach((line, index) => {
    for (const { helper, pattern } of CALLS) {
      if (!pattern.test(line)) continue;
      if (PERMITTED[helper].includes(file)) {
        calledPairs.add(pairKey(helper, file));
      } else {
        errors.push(
          `${file}:${index + 1}: calls \`${helper}(\` and is not listed under \`${helper}\` in PERMITTED in ${SELF}; read the figure from a file that is listed, or add this path when ${RECORD} §6 permits the call`,
        );
      }
    }
  });
}

for (const [helper, paths] of Object.entries(PERMITTED)) {
  for (const entry of paths) {
    if (!fileSet.has(entry) || !fs.existsSync(path.join(root, entry))) {
      errors.push(
        `${entry}: listed for \`${helper}(\` but is not a tracked src/ .ts/.tsx file; delete or update its entry under \`${helper}\` in PERMITTED in ${SELF}`,
      );
    } else if (!calledPairs.has(pairKey(helper, entry))) {
      errors.push(
        `${entry}: listed for \`${helper}(\` but calls it nowhere; delete its entry under \`${helper}\` in PERMITTED in ${SELF}`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const pairCount = Object.values(PERMITTED).reduce((total, paths) => total + paths.length, 0);
console.log(
  `Money rounding call sites validated (${files.length} src files, ${pairCount} listed helper and file pairs)`,
);
