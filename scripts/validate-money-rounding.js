// Check 1 of docs/adr/2026-08-22-money-rounding-layer.md §6; one entry is one helper with one path.
const fs = require('fs');
const path = require('path');
const { listSrcFiles } = require('./lib/list-src-files');
const { stripComments } = require('./lib/strip-comments');

const root = path.join(__dirname, '..');
const errors = [];

const SELF = 'scripts/validate-money-rounding.js';
const RECORD = 'docs/adr/2026-08-22-money-rounding-layer.md';
const MONEY = 'src/utils/money.ts';

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

// Exports of `src/utils/money.ts` that round no money and so carry no list.
const EXEMPT = ['snapToZero'];

// No `g` flag (`test` carries `lastIndex`); both keep `wholePercent` apart from `wholePercentOf`.
const HELPERS = Object.keys(PERMITTED).map((helper) => ({
  helper,
  mention: new RegExp(`(?<![\\w$])${helper}(?![\\w$])`),
  call: new RegExp(`(?<![\\w$])${helper}\\s*\\(`),
}));
const EXPORTED_FUNCTION = /(?<![\w$])export\s+function\s+([\w$]+)/;

const files = listSrcFiles(root);
const fileSet = new Set(files);
const calledPairs = new Set();

function pairKey(helper, file) {
  return `${helper} ${file}`;
}

function isOnDisk(file) {
  return fs.existsSync(path.join(root, file));
}

function strippedLines(file) {
  return stripComments(fs.readFileSync(path.join(root, file), 'utf8').split('\n'));
}

for (const file of files) {
  // A tracked file deleted from the working tree is still in `ls-files`.
  if (!isOnDisk(file)) continue;
  strippedLines(file).forEach((line, index) => {
    for (const { helper, mention, call } of HELPERS) {
      if (PERMITTED[helper].includes(file)) {
        if (call.test(line)) calledPairs.add(pairKey(helper, file));
      } else if (mention.test(line)) {
        errors.push(
          `${file}:${index + 1}: names \`${helper}\` and is not listed for \`${helper}(\` in PERMITTED in ${SELF}; read the figure from a file that is listed, or add this path under \`${helper}\` in PERMITTED in the change that adds the call`,
        );
      }
    }
  });
}

for (const [helper, paths] of Object.entries(PERMITTED)) {
  const seen = new Set();
  for (const entry of paths) {
    if (seen.has(entry)) {
      errors.push(
        `${entry}: listed twice for \`${helper}(\`; delete one of its entries under \`${helper}\` in PERMITTED in ${SELF}`,
      );
      continue;
    }
    seen.add(entry);
    if (!fileSet.has(entry) || !isOnDisk(entry)) {
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

if (fileSet.has(MONEY) && isOnDisk(MONEY)) {
  const exported = new Set();
  strippedLines(MONEY).forEach((line, index) => {
    const name = EXPORTED_FUNCTION.exec(line)?.[1];
    if (name === undefined || exported.has(name)) return;
    exported.add(name);
    if (Object.hasOwn(PERMITTED, name) || EXEMPT.includes(name)) return;
    errors.push(
      `${MONEY}:${index + 1}: exports \`${name}\`, which has no list; give it a key in PERMITTED in ${SELF} with the files that call it, or name it in EXEMPT when it rounds no money (${RECORD} §6 check 1)`,
    );
  });
  for (const name of EXEMPT) {
    if (exported.has(name)) continue;
    errors.push(
      `${MONEY}: no longer exports \`${name}\` as a function; delete it from EXEMPT in ${SELF}`,
    );
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
