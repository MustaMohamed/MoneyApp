import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('feature screen filter rail usage', () => {
  it('transactions uses FilterRail with every transaction filter', () => {
    const text = source('src/modules/transactions/screens/transactions/index.tsx');

    expect(text).toContain('FilterRail');
    expect(text).toContain('TRANSACTION_FILTERS');
    expect(text).toContain('TransactionType.Income');
    expect(text).toContain('TransactionType.Expense');
    expect(text).toContain('TransactionType.Transfer');
    expect(text).toContain('TransactionType.CCPayment');
    expect(text).not.toContain('TypeChips');
  });

  it('commitments uses FilterRail with every status filter', () => {
    const text = source('src/modules/commitments/screens/commitments/index.tsx');

    expect(text).toContain('FilterRail');
    expect(text).toContain('COMMITMENT_FILTERS');
    expect(text).toContain('CommitmentPaymentStatus.Overdue');
    expect(text).toContain('CommitmentPaymentStatus.Due');
    expect(text).toContain('CommitmentPaymentStatus.Upcoming');
    expect(text).toContain('CommitmentPaymentStatus.Paid');
    expect(text).toContain('CommitmentPaymentStatus.Skipped');
    expect(text).not.toContain('StatusFilterChips');
  });
});
