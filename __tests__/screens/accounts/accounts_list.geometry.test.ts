import { Spacing, Type, lineHeightFor } from '@/constants/theme';
import {
  ACCOUNTS_LIST_CARD_STYLE,
  ACCOUNTS_LIST_ROW_CAPTION_STYLE,
  ACCOUNTS_LIST_ROW_STYLE,
} from '@/modules/accounts/screens/accounts/list/accounts_list.geometry';
import { ms, msFont } from '@/utils/responsive';

describe('accounts list row geometry (B1)', () => {
  it('is 64dp, the B1 row with its caption, as a minimum', () => {
    expect(ACCOUNTS_LIST_ROW_STYLE.minHeight).toBe(ms(64));
  });

  it('carries exactly these keys — nothing added, nothing dropped', () => {
    // `style` beats `className` in RN, so a dropped key half-overrides `.list-group__item`.
    expect(Object.keys(ACCOUNTS_LIST_ROW_STYLE).sort()).toEqual([
      'alignItems',
      'flexDirection',
      'gap',
      'minHeight',
      'paddingLeft',
      'paddingRight',
      'paddingVertical',
    ]);
  });

  it('is frozen, so one stray assignment cannot move every row at once', () => {
    expect(Object.isFrozen(ACCOUNTS_LIST_ROW_STYLE)).toBe(true);
  });
});

describe('accounts list row caption geometry (B1)', () => {
  it('is 11 over 14, the same size as the currency code under the balance', () => {
    expect(Type.micro).toBe(msFont(11));
    expect(ACCOUNTS_LIST_ROW_CAPTION_STYLE.fontSize).toBe(Type.micro);
    expect(ACCOUNTS_LIST_ROW_CAPTION_STYLE.lineHeight).toBe(lineHeightFor(Type.micro));
  });

  it('keeps the 2dp gap under the name', () => {
    expect(ACCOUNTS_LIST_ROW_CAPTION_STYLE.marginTop).toBe(Spacing.xxxs);
  });

  it('carries exactly these keys — a bare fontSize would keep the className line-height', () => {
    expect(Object.keys(ACCOUNTS_LIST_ROW_CAPTION_STYLE).sort()).toEqual([
      'fontSize',
      'lineHeight',
      'marginTop',
    ]);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(ACCOUNTS_LIST_ROW_CAPTION_STYLE)).toBe(true);
  });
});

describe('accounts list card geometry (B1)', () => {
  it('sits 16 from both screen edges, the gutter SectionHeader already takes', () => {
    expect(ACCOUNTS_LIST_CARD_STYLE.marginHorizontal).toBe(Spacing.md);
  });

  it('carries exactly one key — the shared wrapper owns everything else', () => {
    expect(Object.keys(ACCOUNTS_LIST_CARD_STYLE)).toEqual(['marginHorizontal']);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(ACCOUNTS_LIST_CARD_STYLE)).toBe(true);
  });
});
