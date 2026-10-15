import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions } from 'react-native';

import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { AccountType, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Type } from '@/constants/theme';
import { resolveDetailHeroGeometry } from '@/modules/transactions/screens/transactions/detail/components/detail.geometry';
import { DetailHero } from '@/modules/transactions/screens/transactions/detail/components/detail_hero';
import { buildTransactionDetailPresentation } from '@/modules/transactions/screens/transactions/detail/detail.helpers';
import { makeTestAccount, makeTestCategory, makeTestTransaction } from '@/test_helpers/transaction';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@/components/ui/hero_shell', () => {
  const ReactLocal = jest.requireActual<typeof import('react')>('react');
  const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HeroShell: ({ children, glowColor }: { children: ReactNode; glowColor: string }) =>
      ReactLocal.createElement(
        RNView,
        { testID: 'detail-hero-shell', accessibilityLabel: glowColor },
        children,
      ),
  };
});

describe('DetailHero', () => {
  it('draws card credit as title and badge at app-scaled sizes inside the geometry height', async () => {
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(1);
    const geometry = resolveDetailHeroGeometry(fontScale);
    const { hero } = buildTransactionDetailPresentation({
      tx: makeTestTransaction({ type: TransactionType.Income, category_id: null }),
      account: makeTestAccount({ type: AccountType.CreditCard }),
    });

    const screen = await render(<DetailHero hero={hero} />);

    // Tree order: the title, then the badge label.
    const cardCredit = screen.getAllByText(Strings.cardCreditTitle);
    expect(cardCredit).toHaveLength(2);
    const [title, badgeLabel] = cardCredit;
    expect(screen.queryByText(Strings.typeBadgeIncome)).toBeNull();
    expect(screen.getByText(Strings.detailAmountOverline)).toBeTruthy();
    expect(screen.getByText(hero.caption)).toBeTruthy();

    expect(screen.getByTestId('transaction-detail-hero')).toHaveStyle({ height: geometry.height });

    const value = screen.getByText(hero.amountValue);
    expect(value).toHaveProp('allowFontScaling', false);
    expect(value).toHaveStyle({ fontSize: geometry.amountFontSize });

    expect(badgeLabel).toHaveProp('allowFontScaling', false);
    expect(badgeLabel).toHaveStyle(scaledTextStyle(Type.micro, fontScale));

    const scaledTexts = [
      [title, geometry.titleFontSize],
      [screen.getByText(Strings.detailAmountOverline), geometry.overlineFontSize],
      [screen.getByText(hero.caption), geometry.captionFontSize],
      [screen.getByText(hero.amountCode), geometry.codeFontSize],
    ] as const;
    for (const [text, fontSize] of scaledTexts) {
      expect(text).toHaveProp('allowFontScaling', false);
      expect(text).toHaveStyle({ fontSize });
    }
  });

  it('frame C1: the glow takes the category colour, not the type colour', async () => {
    const { hero } = buildTransactionDetailPresentation({
      tx: makeTestTransaction({ type: TransactionType.Expense }),
      account: makeTestAccount(),
      category: makeTestCategory({ color: '#5C7FC4', icon: 'cart' }),
    });

    const screen = await render(<DetailHero hero={hero} />);

    const shell = screen.getByTestId('detail-hero-shell');
    expect(shell).toHaveProp('accessibilityLabel', '#5C7FC4');
  });
});
