type CommitmentsListStatus = 'coldLoading' | 'coldError' | 'content' | 'contentWithError';

type CommitmentsEmptyVariant = 'none' | 'noCommitments' | 'emptyMonth' | 'noResults';

type CommitmentsFloatingAlert = 'list' | 'accounts';

export interface CommitmentsPresentationInput {
  listReady: boolean;
  loadError: boolean;
  /** The commitments the list reads: active, holding a row in the month, or filtered to. */
  commitmentCount: number;
  /** The list's rows before the status tab, search and filters. */
  rowCount: number;
  /** The sections left after the status tab, search and filters. */
  matchCount: number;
  filtersActive: boolean;
  showAccountLookupError: boolean;
}

export interface CommitmentsPresentation {
  status: CommitmentsListStatus;
  emptyVariant: CommitmentsEmptyVariant;
  floatingAlert: CommitmentsFloatingAlert | undefined;
}

function resolveStatus({
  listReady,
  loadError,
}: CommitmentsPresentationInput): CommitmentsListStatus {
  if (!listReady) return loadError ? 'coldError' : 'coldLoading';
  return loadError ? 'contentWithError' : 'content';
}

function resolveEmptyVariant(input: CommitmentsPresentationInput): CommitmentsEmptyVariant {
  if (!input.listReady || input.matchCount > 0) return 'none';
  if (input.commitmentCount === 0 && input.rowCount === 0) return 'noCommitments';
  if (input.filtersActive) return 'noResults';
  // The frame where a deferred status tab lags the rows stays `none`.
  return input.rowCount === 0 ? 'emptyMonth' : 'none';
}

/** The list's own load error takes the account alert's place. */
function resolveFloatingAlert(
  status: CommitmentsListStatus,
  showAccountLookupError: boolean,
): CommitmentsFloatingAlert | undefined {
  if (status === 'contentWithError') return 'list';
  if (status === 'content' && showAccountLookupError) return 'accounts';
  return undefined;
}

export function buildCommitmentsPresentation(
  input: CommitmentsPresentationInput,
): CommitmentsPresentation {
  const status = resolveStatus(input);
  return {
    status,
    emptyVariant: resolveEmptyVariant(input),
    floatingAlert: resolveFloatingAlert(status, input.showAccountLookupError),
  };
}
