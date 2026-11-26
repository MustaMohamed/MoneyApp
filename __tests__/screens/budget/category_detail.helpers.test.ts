import { HERO_GRADIENT_COLORS } from '@/components/ui/hero_gradient';
import { CURRENCY_CONFIG } from '@/constants/currency';
import { BudgetGroup, CategoryType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { resolveBadgeColors } from '@/modules/accounts/constants/account_badge_color';
import {
  NON_TEXT_MIN_CONTRAST_RATIO,
  contrastRatio,
} from '@/modules/accounts/constants/account_palette';
import { remainingLabel } from '@/modules/budget/screens/budget/budget.helpers';
import {
  BUDGET_CATEGORY_DETAIL_LOAD_ERROR_COPY,
  type CategoryDetailViewState,
  buildCategoryBudgetsCard,
  buildCategoryDetailHero,
  categoryDetailShowsBody,
  resolveCategoryDetailViewState,
} from '@/modules/budget/screens/budget/category_detail/category_detail.helpers';
import { BUDGET_GROUP_OPTIONS } from '@/modules/budget/screens/budget/components/set_budget_sheet.helpers';
import { LIMIT_TAG_FILL_SHARE } from '@/modules/budget/utils/budget_hero';
import { budgetBandColor } from '@/modules/budget/utils/budget_summary';
import { makeTestBudget, makeTestCategory } from '@/test_helpers/transaction';
import { formatAmount, formatDisplayAmountParts } from '@/utils/format_amount';
import { ratioHeldAtTie, wholePercent } from '@/utils/money';
import { fullMonthName } from '@/utils/year_month';

describe('resolveCategoryDetailViewState', () => {
  it.each([
    [{ hasLoaded: false, hasCategory: false, loadError: false }, 'loading'],
    [{ hasLoaded: false, hasCategory: true, loadError: false }, 'loading'],
    [{ hasLoaded: false, hasCategory: false, loadError: true }, 'firstLoadError'],
    [{ hasLoaded: false, hasCategory: true, loadError: true }, 'firstLoadError'],
    [{ hasLoaded: true, hasCategory: false, loadError: false }, 'notFound'],
    [{ hasLoaded: true, hasCategory: false, loadError: true }, 'firstLoadError'],
    [{ hasLoaded: true, hasCategory: true, loadError: true }, 'refreshErrorWithData'],
    [{ hasLoaded: true, hasCategory: true, loadError: false }, 'ready'],
  ] as const)('reads %o as %s', (input, expected) => {
    expect(resolveCategoryDetailViewState(input)).toBe(expected);
  });
});

describe('categoryDetailShowsBody', () => {
  it.each([
    ['loading', false],
    ['notFound', false],
    ['firstLoadError', false],
    ['refreshErrorWithData', true],
    ['ready', true],
  ] as const satisfies ReadonlyArray<readonly [CategoryDetailViewState, boolean]>)(
    'draws the body on %s: %s',
    (viewState, expected) => {
      expect(categoryDetailShowsBody(viewState)).toBe(expected);
    },
  );
});

describe('BUDGET_CATEGORY_DETAIL_LOAD_ERROR_COPY', () => {
  it('titles the first load with its own key, not the tab load string', () => {
    expect(BUDGET_CATEGORY_DETAIL_LOAD_ERROR_COPY.loadTitle).toEqual(expect.any(String));
    expect(BUDGET_CATEGORY_DETAIL_LOAD_ERROR_COPY.loadTitle).not.toBe(Strings.budgetLoadError);
    expect(BUDGET_CATEGORY_DETAIL_LOAD_ERROR_COPY.loadTitle).not.toBe(
      BUDGET_CATEGORY_DETAIL_LOAD_ERROR_COPY.refreshTitle,
    );
  });
});

describe('buildCategoryDetailHero', () => {
  const EGP = CURRENCY_CONFIG[Currency.EGP].code;
  const clothes = makeTestCategory({ id: 'cat-1', name: 'Clothes', color: '#6FA8DC' });
  const tagColors = (tone: string) =>
    resolveBadgeColors({
      tone,
      backdrop: HERO_GRADIENT_COLORS[1],
      fillShare: LIMIT_TAG_FILL_SHARE,
      inkShare: 1,
    });
  const groupLabel = (group: BudgetGroup) =>
    BUDGET_GROUP_OPTIONS.find((option) => option.value === group)?.label;

  function build(overrides: Partial<Parameters<typeof buildCategoryDetailHero>[0]> = {}) {
    return buildCategoryDetailHero({
      category: clothes,
      limit: 3000,
      spent: 1150,
      month: '2026-11',
      today: '2026-11-14',
      group: BudgetGroup.Want,
      ...overrides,
    });
  }

  it('draws frame B1 on the current month: left figure, On track, Want, bar, tick and days left', () => {
    const hero = build();
    const left = formatDisplayAmountParts(1850, Currency.EGP);

    expect(hero.title).toBe(clothes.name);
    expect(hero.amountValue).toBe(left.text);
    expect(hero.amountCode).toBe(EGP);
    expect(hero.amountColor).toBe(CoreTokens.text1);
    expect(hero.amountAccessibilityLabel).toBe(left.withCode);
    expect(hero.overline).toBe(Strings.budgetHeroLeftThisMonth);
    expect(hero.tag?.badgeLabel).toBe(Strings.budgetCategoriesStatusOnTrack);
    expect(hero.tag?.badgeIcon).toBe('check-circle');
    expect(hero.tag?.badgeFill).toBe(tagColors(Colors.dark.positive).fill);
    expect(hero.tag?.badgeForeground).toBe(tagColors(Colors.dark.positive).foreground);
    expect(hero.badgeLabel).toBe(groupLabel(BudgetGroup.Want));
    expect(hero.badgeIcon).toBeUndefined();
    expect(hero.bar?.share).toBe(1150 / 3000);
    expect(hero.bar?.color).toBe(Colors.dark.budgetUnder);
    expect(hero.bar?.tickShare).toBe(14 / 30);
    expect(hero.caption).toBe(
      Strings.budgetCategoryDetailHeroCaption(
        formatAmount(1150),
        formatAmount(3000),
        38,
        Strings.budgetCategoriesDaysLeft(16),
      ),
    );
  });

  it.each([
    ['the last day of a 30-day month', '2026-11', '2026-11-30', 1, 0],
    ['the last day of a 31-day month', '2026-12', '2026-12-31', 1, 0],
    ['a leap February on its last day', '2028-02', '2028-02-29', 1, 0],
    ['a leap February mid-month', '2028-02', '2028-02-14', 14 / 29, 15],
    ['a common February mid-month', '2027-02', '2027-02-14', 14 / 28, 14],
  ] as const)(
    'places the tick and days left on %s',
    (_label, month, today, tickShare, daysLeft) => {
      const hero = build({ month, today });

      expect(hero.bar?.tickShare).toBe(tickShare);
      expect(hero.caption).toBe(
        Strings.budgetCategoryDetailHeroCaption(
          formatAmount(1150),
          formatAmount(3000),
          38,
          Strings.budgetCategoriesDaysLeft(daysLeft),
        ),
      );
    },
  );

  it('reads a past month within its limit as Left unspent and Within limit, with no tick or days', () => {
    const hero = build({ month: '2026-10', spent: 2600 });

    expect(hero.overline).toBe(Strings.budgetHeroLeftUnspent);
    expect(hero.amountValue).toBe(formatDisplayAmountParts(400, Currency.EGP).text);
    expect(hero.tag?.badgeLabel).toBe(Strings.budgetCategoryDetailStatusWithinLimit);
    expect(hero.tag?.badgeIcon).toBe('check-circle');
    expect(hero.bar?.tickShare).toBeUndefined();
    expect(hero.caption).toBe(
      Strings.budgetCategoryDetailHeroCaption(formatAmount(2600), formatAmount(3000), 87),
    );
  });

  it('reads a past month over its limit as Over, with no label line', () => {
    const hero = build({ month: '2026-10', spent: 3300 });

    expect(hero.overline).toBe(false);
    expect(hero.amountValue).toBe(formatDisplayAmountParts(300, Currency.EGP).text);
    expect(hero.amountCode).toBe(Strings.budgetCategoryDetailHeroOverCode(EGP));
    expect(hero.amountColor).toBe(Colors.dark.negative);
    expect(hero.tag?.badgeLabel).toBe(Strings.budgetCategoriesStatusOver);
    expect(hero.tag?.badgeIcon).toBe('alert-circle');
    expect(hero.bar?.tickShare).toBeUndefined();
  });

  it.each([
    [
      'On track',
      1150,
      (): string => Strings.budgetCategoriesStatusOnTrack,
      'check-circle',
      Colors.dark.positive,
    ],
    [
      'Watch at exactly 80%',
      2400,
      (): string => Strings.budgetCategoriesStatusWatch,
      'trending-up',
      Colors.dark.gold,
    ],
    [
      'Over',
      3300,
      (): string => Strings.budgetCategoriesStatusOver,
      'alert-circle',
      Colors.dark.negative,
    ],
  ] as const)(
    'reads a future month %s with no tick and no days left',
    (_label, spent, label, icon, tone) => {
      const hero = build({ month: '2027-01', spent });

      expect(hero.tag?.badgeLabel).toBe(label());
      expect(hero.tag?.badgeIcon).toBe(icon);
      expect(hero.tag?.badgeFill).toBe(tagColors(tone).fill);
      expect(hero.bar?.tickShare).toBeUndefined();
      expect(hero.caption).toBe(
        Strings.budgetCategoryDetailHeroCaption(
          formatAmount(spent),
          formatAmount(3000),
          Math.round((spent / 3000) * 100),
        ),
      );
    },
  );

  it('reads a future month under its limit as Left to spend', () => {
    expect(build({ month: '2027-01' }).overline).toBe(Strings.budgetHeroLeftToSpend);
  });

  it('draws frame S07 over the limit: no label line, over colour, over code and label, over bar', () => {
    const hero = build({ limit: 6000, spent: 6420 });
    const over = formatDisplayAmountParts(420, Currency.EGP);

    expect(hero.overline).toBe(false);
    expect(hero.amountValue).toBe(over.text);
    expect(hero.amountColor).toBe(Colors.dark.negative);
    expect(hero.amountCode).toBe(Strings.budgetCategoryDetailHeroOverCode(EGP));
    expect(hero.amountAccessibilityLabel).toBe(
      Strings.budgetCategoryDetailHeroOverA11y(over.withCode),
    );
    expect(hero.tag?.badgeLabel).toBe(Strings.budgetCategoriesStatusOver);
    expect(hero.bar?.color).toBe(Colors.dark.budgetOver);
    expect(hero.bar?.tickShare).toBe(14 / 30);
    expect(hero.caption).toBe(
      Strings.budgetCategoryDetailHeroCaption(
        formatAmount(6420),
        formatAmount(6000),
        107,
        Strings.budgetCategoriesDaysLeft(16),
      ),
    );
  });

  it('holds a float tie at the limit: not over, Watch, a full bar in the near colour', () => {
    const hero = build({ limit: 0.3, spent: 0.1 + 0.2 });

    expect(hero.overline).toBe(Strings.budgetHeroLeftThisMonth);
    expect(hero.amountColor).toBe(CoreTokens.text1);
    expect(hero.tag?.badgeLabel).toBe(Strings.budgetCategoriesStatusWatch);
    expect(hero.bar?.share).toBe(1);
    expect(hero.bar?.color).toBe(Colors.dark.budgetNear);
  });

  it('fills the bar in the over colour for a zero-limit month with spending', () => {
    const hero = build({ limit: 0, spent: 50 });

    expect(hero.tag?.badgeLabel).toBe(Strings.budgetCategoriesStatusOver);
    expect(hero.bar?.share).toBe(1);
    expect(hero.bar?.color).toBe(Colors.dark.budgetOver);
  });

  it('does not read a spend over the limit by less than a cent as over', () => {
    const hero = build({ limit: 100, spent: 100.004 });

    expect(hero.overline).toBe(Strings.budgetHeroLeftThisMonth);
    expect(hero.amountCode).toBe(EGP);
    expect(hero.amountColor).toBe(CoreTokens.text1);
    expect(hero.tag?.badgeLabel).not.toBe(Strings.budgetCategoriesStatusOver);
  });

  it('reads no budget in the month as the figure line with the spent caption, keeping the badge', () => {
    const hero = build({ limit: undefined });

    expect(hero.amountValue).toBe(Strings.budgetCategoryDetailHeroNoBudget);
    expect(hero.amountCode).toBeUndefined();
    expect(hero.amountColor).toBe(CoreTokens.text1);
    expect(hero.amountAccessibilityLabel).toBe(Strings.budgetCategoryDetailHeroNoBudget);
    expect(hero.overline).toBe(false);
    expect(hero.tag).toBeUndefined();
    expect(hero.bar).toBeUndefined();
    expect(hero.caption).toBe(Strings.budgetCategoryDetailHeroSpent(formatAmount(1150)));
    expect(hero.badgeLabel).toBe(groupLabel(BudgetGroup.Want));
  });

  it('reads an ungrouped category as Not grouped', () => {
    expect(build({ group: undefined }).badgeLabel).toBe(Strings.budget5030NotGroupedTitle);
  });

  it.each([
    ['a light', '#F2D06B'],
    ['a dark', '#2E3A4D'],
  ])('clears 3:1 for the glyph on %s category colour', (_label, color) => {
    const hero = build({ category: { ...clothes, color } });

    expect(hero.tileColor).toBe(color);
    if (hero.tileGlyphColor === undefined) throw new Error('expected a glyph tile');
    expect(contrastRatio(hero.tileGlyphColor, hero.tileColor)).toBeGreaterThanOrEqual(
      NON_TEXT_MIN_CONTRAST_RATIO,
    );
  });
});

describe('buildCategoryBudgetsCard', () => {
  const EGP = CURRENCY_CONFIG[Currency.EGP].code;
  const MONTH = '2026-05';
  const clothesCategory = makeTestCategory({ id: 'cat-1', name: 'Clothes' });
  const limitTagColors = (tone: string) =>
    resolveBadgeColors({
      tone,
      backdrop: CoreTokens.surface,
      fillShare: LIMIT_TAG_FILL_SHARE,
      inkShare: 1,
    });
  const watchTag = () => ({
    label: Strings.budgetCategoriesStatusWatch,
    icon: 'trending-up',
    ...limitTagColors(Colors.dark.gold),
  });
  const overTag = () => ({
    label: Strings.budgetCategoriesStatusOver,
    icon: 'alert-circle',
    ...limitTagColors(Colors.dark.negative),
  });
  const lifecycles = [
    ['the current month', MONTH],
    ['a future month', '2026-04'],
    ['a completed month', '2026-06'],
  ] as const;

  function oneBudget(limit: number, spent: number, effectiveFrom = MONTH) {
    return {
      budgets: [
        makeTestBudget({
          id: 'b1',
          category_id: 'cat-1',
          name: 'Clothes',
          limit_amount: limit,
          effective_from: effectiveFrom,
        }),
      ],
      spendByMonth: { 'cat-1': { [effectiveFrom]: spent } },
      spendByBudgetId: { b1: spent },
    };
  }

  function build(overrides: Partial<Parameters<typeof buildCategoryBudgetsCard>[0]> = {}) {
    return buildCategoryBudgetsCard({
      category: clothesCategory,
      budgets: [],
      spendByMonth: {},
      spendByBudgetId: {},
      month: MONTH,
      currentMonth: MONTH,
      ...overrides,
    });
  }

  it("keeps the store's order, not a sort by name or id, and counts the rows", () => {
    const card = build({
      budgets: [
        makeTestBudget({ id: 'b2', category_id: 'cat-1', name: 'Home', effective_from: MONTH }),
        makeTestBudget({ id: 'b1', category_id: 'cat-1', name: 'Clothes', effective_from: MONTH }),
      ],
    });

    expect(card.rows.map((r) => r.id)).toEqual(['b2', 'b1']);
    expect(card.count).toBe(2);
    expect(card.emptyLine).toBeUndefined();
  });

  it('draws an on-track row with no tag, the band colour, the left word and the a11y label', () => {
    const [row] = build(oneBudget(2000, 900)).rows;

    expect(row.id).toBe('b1');
    expect(row.name).toBe('Clothes');
    expect(row.tag).toBeUndefined();
    expect(row.ringShare).toBe(ratioHeldAtTie(900, 2000));
    expect(row.ringColor).toBe(budgetBandColor(900, 2000));
    expect(row.usedLabel).toBe(`${wholePercent(900, 2000)}%`);
    expect(row.caption).toBe(
      Strings.budgetCategoryDetailBudgetSpentOf(formatAmount(900), formatAmount(2000)),
    );
    expect(row.amountLabel).toBe(formatAmount(1100));
    expect(row.amountCode).toBe(EGP);
    expect(row.amountWord).toBe(Strings.budgetCategoryDetailBudgetLeft);
    expect(row.amountWordColor).toBe(Colors.dark.text2);
    expect(row.accessibilityLabel).toBe(
      Strings.budgetCategoriesBudgetA11y(
        'Clothes',
        formatAmount(900),
        formatAmount(2000),
        wholePercent(900, 2000),
        formatAmount(1100),
        remainingLabel(1100).label,
      ),
    );
  });

  it.each([
    ['the current month', MONTH],
    ['a future month', '2026-04'],
  ] as const)('tags a row at 80%% and within its limit Watch in %s', (_name, currentMonth) => {
    const [row] = build({ ...oneBudget(5000, 4000), currentMonth }).rows;

    expect(row.tag).toEqual(watchTag());
    expect(row.amountWord).toBe(Strings.budgetCategoryDetailBudgetLeft);
  });

  it('gives a watch-level row no tag in a completed month', () => {
    const [row] = build({ ...oneBudget(5000, 4000), currentMonth: '2026-06' }).rows;

    expect(row.tag).toBeUndefined();
  });

  it.each(lifecycles)(
    'tags a row over its limit Over with a full ring and the real percent in %s',
    (_name, currentMonth) => {
      const [row] = build({ ...oneBudget(5000, 5200), currentMonth }).rows;

      expect(row.tag).toEqual(overTag());
      expect(row.ringShare).toBe(ratioHeldAtTie(5200, 5000));
      expect(row.ringColor).toBe(Colors.dark.budgetOver);
      expect(row.usedLabel).toBe(`${wholePercent(5200, 5000)}%`);
      expect(row.amountLabel).toBe(formatAmount(200));
      expect(row.amountWord).toBe(Strings.budgetCategoryDetailBudgetOver);
      expect(row.amountWordColor).toBe(Colors.dark.negative);
    },
  );

  it('decides over to the cent: 0.1 + 0.2 against 0.3 is Watch, not over', () => {
    const [row] = build(oneBudget(0.3, 0.1 + 0.2)).rows;

    expect(row.tag).toEqual(watchTag());
    expect(row.amountWord).toBe(Strings.budgetCategoryDetailBudgetLeft);
    expect(row.amountWordColor).toBe(Colors.dark.text2);
  });

  it.each([
    ['budgets only in another month', () => build(oneBudget(2000, 900, '2026-04'))],
    [
      'an income category with a budget row',
      () =>
        build({
          ...oneBudget(2000, 900),
          category: { ...clothesCategory, type: CategoryType.Income },
        }),
    ],
  ] as const)('gives the empty card for %s', (_name, make) => {
    const card = make();

    expect(card.count).toBe(0);
    expect(card.rows).toEqual([]);
    expect(card.emptyLine).toBe(Strings.budgetCategoryDetailNoBudgets(fullMonthName(MONTH)));
  });
});
