import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { roundMoney } from '@/utils/money';

export type TransactionReportingClass =
  | 'expense'
  | 'income'
  | 'card_credit'
  | 'transfer'
  | 'cc_payment';

export interface LedgerAccountSnapshot {
  id: string;
  type: AccountType;
  currency: Currency;
  currentBalance: number;
  revolvingBalance: number | null;
  minimumPayment: number | null;
}

export interface AccountDelta {
  accountId: string;
  currentBalance: number;
  revolvingBalance: number;
}

export interface TransactionPolicyCommand {
  type: TransactionType;
  amount: number;
  egpAmount: number;
  toAmount: number | null;
  minimumPaymentSnapshot: number | null;
  source: LedgerAccountSnapshot;
  destination?: LedgerAccountSnapshot;
}

export type TransactionPolicyIssueCode =
  | 'amount_invalid'
  | 'destination_amount_invalid'
  | 'destination_required'
  | 'destination_not_allowed'
  | 'accounts_must_differ'
  | 'transfer_requires_asset_accounts'
  | 'cc_payment_requires_asset_source'
  | 'cc_payment_requires_card_destination'
  | 'card_credit_exceeds_liability'
  | 'cc_payment_exceeds_liability';

export interface TransactionPolicyIssue {
  code: TransactionPolicyIssueCode;
}

export interface TransactionReportingEffect {
  incomeEgp: number;
  spendingEgp: number;
  budgetSpendingEgp: number;
}

export class TransactionPolicyError extends Error {
  readonly issues: readonly TransactionPolicyIssue[];

  constructor(issues: readonly TransactionPolicyIssue[]) {
    super(issues.map((issue) => issue.code).join(', '));
    this.name = 'TransactionPolicyError';
    this.issues = issues;
  }
}

function isCreditCard(type: AccountType): boolean {
  return type === AccountType.CreditCard;
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function normalizeMoney(value: number): number {
  return roundMoney(value) || 0;
}

function requiresDestination(type: TransactionType): boolean {
  return type === TransactionType.Transfer || type === TransactionType.CCPayment;
}

export function resolveReportingClass(
  type: TransactionType,
  sourceAccountType: AccountType,
): TransactionReportingClass {
  if (type === TransactionType.Income) {
    return isCreditCard(sourceAccountType) ? 'card_credit' : 'income';
  }
  if (type === TransactionType.Expense) return 'expense';
  if (type === TransactionType.Transfer) return 'transfer';
  return 'cc_payment';
}

export function resolvePrimaryBalanceDelta(input: {
  type: TransactionType;
  sourceAccountType: AccountType;
  amount: number;
}): number {
  const amount = normalizeMoney(input.amount);
  if (input.type === TransactionType.Income) {
    return isCreditCard(input.sourceAccountType) ? -amount : amount;
  }
  if (input.type === TransactionType.Expense && isCreditCard(input.sourceAccountType)) {
    return amount;
  }
  return -amount;
}

export function validateTransactionPolicy(
  command: TransactionPolicyCommand,
): TransactionPolicyIssue[] {
  const issues: TransactionPolicyIssue[] = [];

  if (!isPositiveFinite(command.amount) || !isPositiveFinite(command.egpAmount)) {
    issues.push({ code: 'amount_invalid' });
  }

  if (requiresDestination(command.type)) {
    if (!isPositiveFinite(command.toAmount ?? Number.NaN)) {
      issues.push({ code: 'destination_amount_invalid' });
    }
    if (!command.destination) {
      issues.push({ code: 'destination_required' });
    }
  } else if (command.destination) {
    issues.push({ code: 'destination_not_allowed' });
  }

  if (command.destination?.id === command.source.id) {
    issues.push({ code: 'accounts_must_differ' });
  }

  if (
    command.type === TransactionType.Transfer &&
    (isCreditCard(command.source.type) ||
      (command.destination !== undefined && isCreditCard(command.destination.type)))
  ) {
    issues.push({ code: 'transfer_requires_asset_accounts' });
  }

  if (command.type === TransactionType.CCPayment) {
    if (isCreditCard(command.source.type)) {
      issues.push({ code: 'cc_payment_requires_asset_source' });
    }
    if (command.destination !== undefined && !isCreditCard(command.destination.type)) {
      issues.push({ code: 'cc_payment_requires_card_destination' });
    }
    if (
      command.destination !== undefined &&
      isPositiveFinite(command.toAmount ?? Number.NaN) &&
      roundMoney(command.toAmount ?? 0) > roundMoney(command.destination.currentBalance)
    ) {
      issues.push({ code: 'cc_payment_exceeds_liability' });
    }
  }

  if (
    resolveReportingClass(command.type, command.source.type) === 'card_credit' &&
    isPositiveFinite(command.amount) &&
    roundMoney(command.amount) > roundMoney(command.source.currentBalance)
  ) {
    issues.push({ code: 'card_credit_exceeds_liability' });
  }

  return issues;
}

function resolveUncheckedCreateDeltas(command: TransactionPolicyCommand): AccountDelta[] {
  const deltas: AccountDelta[] = [
    {
      accountId: command.source.id,
      currentBalance: resolvePrimaryBalanceDelta({
        type: command.type,
        sourceAccountType: command.source.type,
        amount: command.amount,
      }),
      revolvingBalance: 0,
    },
  ];

  if (command.type === TransactionType.Transfer) {
    deltas.push({
      accountId: command.destination!.id,
      currentBalance: normalizeMoney(command.toAmount!),
      revolvingBalance: 0,
    });
  } else if (command.type === TransactionType.CCPayment) {
    const destination = command.destination!;
    const destinationAmount = normalizeMoney(command.toAmount!);
    const minimumPayment = normalizeMoney(command.minimumPaymentSnapshot ?? 0);
    const revolvingReduction = Math.max(0, destinationAmount - minimumPayment);
    const availableRevolving = Math.max(0, destination.revolvingBalance ?? 0);

    deltas.push({
      accountId: destination.id,
      currentBalance: -destinationAmount,
      revolvingBalance: normalizeMoney(-Math.min(revolvingReduction, availableRevolving)),
    });
  }

  return mergeAccountDeltas(deltas);
}

export function resolveCreateDeltas(command: TransactionPolicyCommand): AccountDelta[] {
  const issues = validateTransactionPolicy(command);
  if (issues.length > 0) throw new TransactionPolicyError(issues);
  return resolveUncheckedCreateDeltas(command);
}

export function invertAccountDeltas(deltas: readonly AccountDelta[]): AccountDelta[] {
  return deltas.map((delta) => ({
    accountId: delta.accountId,
    currentBalance: normalizeMoney(-delta.currentBalance),
    revolvingBalance: normalizeMoney(-delta.revolvingBalance),
  }));
}

export function mergeAccountDeltas(...groups: readonly AccountDelta[][]): AccountDelta[] {
  const merged = new Map<string, AccountDelta>();

  for (const delta of groups.flat()) {
    const current = merged.get(delta.accountId);
    merged.set(delta.accountId, {
      accountId: delta.accountId,
      currentBalance: normalizeMoney((current?.currentBalance ?? 0) + delta.currentBalance),
      revolvingBalance: normalizeMoney((current?.revolvingBalance ?? 0) + delta.revolvingBalance),
    });
  }

  return [...merged.values()].filter(
    (delta) => delta.currentBalance !== 0 || delta.revolvingBalance !== 0,
  );
}

function applyDeltasToSnapshot(
  snapshot: LedgerAccountSnapshot,
  deltas: readonly AccountDelta[],
): LedgerAccountSnapshot {
  const delta = deltas.find((candidate) => candidate.accountId === snapshot.id);
  if (!delta) return snapshot;
  return {
    ...snapshot,
    currentBalance: normalizeMoney(snapshot.currentBalance + delta.currentBalance),
    revolvingBalance:
      snapshot.revolvingBalance === null
        ? null
        : normalizeMoney(snapshot.revolvingBalance + delta.revolvingBalance),
  };
}

export function resolveDeleteDeltas(command: TransactionPolicyCommand): AccountDelta[] {
  return invertAccountDeltas(resolveUncheckedCreateDeltas(command));
}

export function resolveUpdateDeltas(
  oldCommand: TransactionPolicyCommand,
  newCommand: TransactionPolicyCommand,
): AccountDelta[] {
  const reversal = resolveDeleteDeltas(oldCommand);
  const restoredCommand: TransactionPolicyCommand = {
    ...newCommand,
    source: applyDeltasToSnapshot(newCommand.source, reversal),
    destination:
      newCommand.destination === undefined
        ? undefined
        : applyDeltasToSnapshot(newCommand.destination, reversal),
  };
  return mergeAccountDeltas(reversal, resolveCreateDeltas(restoredCommand));
}

export function resolveReportingEffect(
  command: TransactionPolicyCommand,
): TransactionReportingEffect {
  const reportingClass = resolveReportingClass(command.type, command.source.type);
  const egpAmount = normalizeMoney(command.egpAmount);

  if (reportingClass === 'income') {
    return { incomeEgp: egpAmount, spendingEgp: 0, budgetSpendingEgp: 0 };
  }
  if (reportingClass === 'expense') {
    return { incomeEgp: 0, spendingEgp: egpAmount, budgetSpendingEgp: egpAmount };
  }
  if (reportingClass === 'card_credit') {
    return { incomeEgp: 0, spendingEgp: -egpAmount, budgetSpendingEgp: -egpAmount };
  }
  return { incomeEgp: 0, spendingEgp: 0, budgetSpendingEgp: 0 };
}
