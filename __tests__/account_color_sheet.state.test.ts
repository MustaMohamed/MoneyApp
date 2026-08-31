import { AcctTokens } from '@/constants/theme_tokens';
import { useAccountColorSheetState } from '@/modules/accounts/components/account_form/account_color_sheet.state';

const ADD = 'accounts/add_account';
const DETAIL = 'accounts/detail';

describe('useAccountColorSheetState', () => {
  beforeEach(() => {
    useAccountColorSheetState.getState().reset();
  });

  it('starts closed with no staged colour', () => {
    const s = useAccountColorSheetState.getState();
    expect(s.openOwner).toBeUndefined();
    expect(s.stagedColor).toBeUndefined();
  });

  it('open stages the current colour for exactly one owner', () => {
    useAccountColorSheetState.getState().open(ADD, AcctTokens.nile.rich);
    const s = useAccountColorSheetState.getState();
    expect(s.openOwner).toBe(ADD);
    expect(s.stagedColor).toBe(AcctTokens.nile.rich);
    expect(s.isOpenFor(ADD)).toBe(true);
    expect(s.isOpenFor(DETAIL)).toBe(false);
  });

  it('staging a different colour does not touch the owner', () => {
    useAccountColorSheetState.getState().open(ADD, AcctTokens.nile.rich);
    useAccountColorSheetState.getState().stage(AcctTokens.sand.soft);
    const s = useAccountColorSheetState.getState();
    expect(s.stagedColor).toBe(AcctTokens.sand.soft);
    expect(s.isOpenFor(ADD)).toBe(true);
  });

  it('close discards the staged colour', () => {
    useAccountColorSheetState.getState().open(ADD, AcctTokens.nile.rich);
    useAccountColorSheetState.getState().stage(AcctTokens.sand.soft);
    useAccountColorSheetState.getState().close();
    const s = useAccountColorSheetState.getState();
    expect(s.openOwner).toBeUndefined();
    expect(s.stagedColor).toBeUndefined();
    expect(s.isOpenFor(ADD)).toBe(false);
  });

  it('re-opening seeds from the value passed in, not from the last stage', () => {
    useAccountColorSheetState.getState().open(ADD, AcctTokens.nile.rich);
    useAccountColorSheetState.getState().stage(AcctTokens.sand.soft);
    useAccountColorSheetState.getState().close();
    useAccountColorSheetState.getState().open(ADD, AcctTokens.nile.rich);
    expect(useAccountColorSheetState.getState().stagedColor).toBe(AcctTokens.nile.rich);
  });

  it('a second owner opening replaces the first rather than opening both', () => {
    useAccountColorSheetState.getState().open(ADD, AcctTokens.nile.rich);
    useAccountColorSheetState.getState().open(DETAIL, AcctTokens.gold.rich);
    const s = useAccountColorSheetState.getState();
    expect(s.isOpenFor(ADD)).toBe(false);
    expect(s.isOpenFor(DETAIL)).toBe(true);
    expect(s.stagedColor).toBe(AcctTokens.gold.rich);
  });
});
