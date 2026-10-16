import { Strings } from '@/constants/strings';

describe('Spoken labels: the add button and its menu, the category row and tabs, the commitments filter and the dashboard settings button', () => {
  it.each([
    ['fabAddAccessibility', 'Add'],
    ['fabMenuAddTransaction', 'Add Transaction'],
    ['fabMenuAddAccount', 'Add Account'],
    ['fabMenuAddCommitment', 'Add Commitment'],
    ['categoriesEditAccessibility', 'Edit category'],
    ['categoriesDeleteAccessibility', 'Delete category'],
    ['categoriesTypeAccessibility', 'Category type'],
    ['commitmentStatusFilterAccessibility', 'Commitment status filter'],
    ['dashboardSettingsAccessibility', 'Settings'],
  ] as const)('%s reads %j', (key, words) => {
    expect(Strings[key]).toBe(words);
  });
});
