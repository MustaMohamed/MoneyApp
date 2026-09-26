import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function exists(path: string) {
  return existsSync(resolve(process.cwd(), path));
}

describe('feature screen filter rail usage', () => {
  it('keeps the shared filter rail composed from standalone filters with hooks', () => {
    const rail = source('src/components/ui/filter_rail.tsx');

    expect(rail).toContain('<MonthFilter');
    expect(rail).toContain('<SegmentFilter');
    expect(rail).not.toMatch(/\buse(?:Callback|Effect|Memo|Reducer|State)\b/);
    expect(rail).not.toContain('Sheet');
    expect(rail).not.toContain('SegmentedTabs');
    expect(exists('src/components/ui/month_filter.tsx')).toBe(true);
    expect(exists('src/components/ui/month_filter.hook.ts')).toBe(true);
    expect(exists('src/components/ui/month_filter.state.ts')).toBe(true);
    expect(exists('src/components/ui/segment_filter.tsx')).toBe(true);
    expect(exists('src/components/ui/segment_filter.hook.ts')).toBe(true);

    const month = source('src/components/ui/month_filter.tsx');
    const monthHook = source('src/components/ui/month_filter.hook.ts');
    const segment = source('src/components/ui/segment_filter.tsx');

    expect(month).toContain('useMonthFilter');
    expect(monthHook).toContain('useMonthFilterState');
    expect(monthHook).not.toMatch(/\buseState\b/);
    expect(segment).toContain('useSegmentFilter');
    expect(month).not.toMatch(/\buse(?:Callback|Effect|Memo|Reducer|State)\b/);
    expect(segment).not.toMatch(/\buse(?:Callback|Effect|Memo|Reducer|State)\b/);
  });

  it('transactions uses FilterRail with every transaction filter', () => {
    const text = source('src/modules/transactions/screens/transactions/index.tsx');

    expect(text).toContain('FilterRail');
    expect(text).toContain('TRANSACTION_FILTERS');
    expect(text).toContain('TransactionType.Income');
    expect(text).toContain('TransactionType.Expense');
    expect(text).toContain('TransactionType.Transfer');
    expect(text).toContain('TransactionType.CCPayment');
    expect(text).toContain('view-grid');
    expect(text).toContain('arrow-down-circle-outline');
    expect(text).toContain('arrow-up-circle-outline');
    expect(text).toContain('swap-horizontal');
    expect(text).toContain('credit-card-refund');
    expect(text).not.toContain('select-all');
    expect(text).not.toContain('view-list-outline');
    expect(text).not.toContain('TypeChips');
  });

  it('commitments uses FilterRail with every status filter', () => {
    const text = source('src/modules/commitments/screens/commitments/index.tsx');
    const statusText = source('src/modules/commitments/screens/commitments/commitment_status.ts');

    expect(text).toContain('FilterRail');
    expect(text).toContain('COMMITMENT_FILTERS');
    expect(text).toContain('CommitmentPaymentStatus.Overdue');
    expect(text).toContain('CommitmentPaymentStatus.Due');
    expect(text).toContain('CommitmentPaymentStatus.Upcoming');
    expect(text).toContain('CommitmentPaymentStatus.Paid');
    expect(text).toContain('CommitmentPaymentStatus.Skipped');
    expect(text).toContain('STATUS_COLORS');
    expect(text).toContain('STATUS_ICONS');
    expect(text).toContain('view-grid');
    expect(text).not.toContain('select-all');
    expect(statusText).toContain('alert-circle');
    expect(statusText).toContain('clock-outline');
    expect(statusText).toContain('calendar-clock');
    expect(statusText).toContain('check-circle');
    expect(statusText).toContain('minus-circle');
    expect(text).not.toContain('StatusFilterChips');
  });
});
