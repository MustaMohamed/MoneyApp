import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Typography } from 'heroui-native';
import React from 'react';
import { Text, View } from 'react-native';

import { HeroPill } from '@/components/ui/chip';
import { CURRENCY_CONFIG } from '@/constants/currency';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, Size } from '@/constants/theme';
import { SemanticTokens } from '@/constants/theme_tokens';
import type {
  ReadyFrame,
  ReadyPill,
  ReadySummaryState,
} from '@/modules/onboarding/domain/ready_summary_state';
import { formatCurrencyAmount, formatExchangeRate } from '@/utils/format_amount';

import {
  N4_HERO_AMOUNT_DECIMALS,
  N4_HERO_CAPTION_SLOT_STYLE,
  N4_HERO_CAPTION_TEXT_STYLE,
  N4_HERO_CHIP_GLYPH,
  N4_HERO_CHIP_SIZE,
  N4_HERO_CONTENT_STYLE,
  N4_HERO_CURRENCY_TEXT_STYLE,
  N4_HERO_HEAD_STYLE,
  N4_HERO_LABEL_TEXT_STYLE,
  N4_HERO_PILL_ROW_STYLE,
  N4_HERO_REFUSAL_TEXT_STYLE,
  N4_HERO_VALUE_SLOT_STYLE,
  resolveHeroAmountParts,
  resolveHeroValueA11yLabel,
  resolveHeroValueTextStyle,
} from '../ready.geometry';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * The frame decides the caption and nothing else — the pills are composed by
 * the domain gate (`selectReadySummaryState`) and this layer must not
 * second-guess that array.
 *
 * F1 and F2 carry the only parameterised captions. Both take a currency CODE
 * rather than hard-coding EGP: a USD-base user whose accounts are all USD
 * lands on F1 too, and "in EGP" would simply be false there.
 */
function resolveCaption(
  frame: ReadyFrame,
  accountCount: number,
  foreignCount: number,
  baseCode: string,
  foreignCode: string,
): string {
  switch (frame) {
    case 'F1':
      return Strings.n4CaptionAllBase(accountCount, baseCode);
    case 'F2':
      return Strings.n4CaptionConverted(foreignCount, foreignCode);
    case 'F3':
      return Strings.n4CaptionRateNeeded;
    case 'F4':
      return Strings.n4CaptionNegative;
    case 'F5':
      return Strings.n4CaptionZero;
    case 'F6':
      return Strings.n4CaptionSingle;
    case 'F7':
      return Strings.n4CaptionCreditOnly;
  }
}

/**
 * Descriptor to copy — mockup.html:2337-2338, :2385-2386, :2433, :2620.
 *
 * `needs-rate` renders the descriptor's own `count`, which the domain sets to
 * `foreignCount`; substituting `accountCount` here would read "3 need a rate"
 * for one USD account among three.
 */
function resolvePill(pill: ReadyPill): { label: string; glyph: IconName } {
  switch (pill.kind) {
    case 'accounts':
      return { label: Strings.n4PillAccounts(pill.count), glyph: pill.glyph };
    case 'opening-balances':
      return { label: Strings.n4PillOpeningBal(pill.count), glyph: 'information-outline' };
    case 'needs-rate':
      return { label: Strings.n4PillNeedsRate(pill.count), glyph: 'swap-horizontal' };
    case 'rate':
      return { label: formatExchangeRate(pill.rate), glyph: 'swap-horizontal' };
    case 'approx':
      return {
        // Two decimals, against the mockup's rounded `2,169 USD` — Marcus's
        // 2026-08-06 ruling, recorded in the PR body as a declared deviation.
        label: formatCurrencyAmount(pill.value, pill.currency, N4_HERO_AMOUNT_DECIMALS),
        glyph: 'approximately-equal',
      };
  }
}

export interface ReadyHeroCardProps {
  summary: ReadySummaryState;
  baseCurrency: Currency;
}

/**
 * N4's hero card — mockup.html:2332-2341, `.hero`. Four stacked slots with
 * FIXED heights, which is the whole zero-shift contract: the value slot holds
 * a 40px number in five states and a 22px refusal line in another, the caption
 * slot holds one or two lines, and the card is the same height in all nine.
 *
 * The gradient, the grid texture and the corner glow are `HeroShell`'s; this
 * component draws only what sits on top of them.
 *
 * No red, anywhere. The value is `text-accent` in every state including the
 * negative and zero frames — this screen deliberately does not adopt
 * `stat_cards.tsx`'s sign colouring, and it does not import the dashboard hero.
 */
export function ReadyHeroCard({ summary, baseCurrency }: ReadyHeroCardProps) {
  const { outcome, frame, accountCount, foreignCount, pills } = summary;

  // The app has exactly two currencies, so "the other one" is unambiguous.
  // This is a CODE lookup for a caption, not a money derivation — no amount is
  // computed here; the resolver already produced every number on this card.
  const foreignCurrency = baseCurrency === Currency.EGP ? Currency.USD : Currency.EGP;

  return (
    <View style={N4_HERO_CONTENT_STYLE}>
      <View style={N4_HERO_HEAD_STYLE}>
        <View
          style={{
            width: N4_HERO_CHIP_SIZE,
            height: N4_HERO_CHIP_SIZE,
            borderRadius: N4_HERO_CHIP_SIZE / 2,
            alignItems: 'center',
            justifyContent: 'center',
            // mockup.html:672, `color-mix(in srgb, var(--cairo-gold) 13%)` —
            // the same 13.3% alpha the dashboard hero's 24pt wallet chip uses.
            backgroundColor: Colors.shared.cairoGold + '22',
          }}
        >
          <MaterialCommunityIcons
            name="wallet"
            size={N4_HERO_CHIP_GLYPH}
            color={Colors.shared.cairoGold}
          />
        </View>
        <Typography className="text-foreground font-inter" style={N4_HERO_LABEL_TEXT_STYLE}>
          {Strings.n4HeroLabel}
        </Typography>
      </View>

      {outcome.kind === 'rate-needed' ? (
        <View
          style={N4_HERO_VALUE_SLOT_STYLE}
          accessible
          accessibilityLabel={Strings.n4RateNeededValue}
        >
          {/* Warning, not danger — nothing failed, and the CTA stays enabled.
              No number, no dash-as-number, no partial total, no substituted
              rate: `INITIAL_STATE.rate` is an unverified guess. */}
          <MaterialCommunityIcons
            name="alert-outline"
            size={Size.iconMd}
            color={SemanticTokens.warning}
          />
          <Typography
            className="text-warning font-sora-semibold"
            style={N4_HERO_REFUSAL_TEXT_STYLE}
          >
            {Strings.n4RateNeededValue}
          </Typography>
        </View>
      ) : (
        <HeroValue value={outcome.value} baseCurrency={baseCurrency} />
      )}

      <View style={N4_HERO_CAPTION_SLOT_STYLE}>
        <Typography className="text-foreground font-inter" style={N4_HERO_CAPTION_TEXT_STYLE}>
          {resolveCaption(
            frame,
            accountCount,
            foreignCount,
            CURRENCY_CONFIG[baseCurrency].code,
            CURRENCY_CONFIG[foreignCurrency].code,
          )}
        </Typography>
      </View>

      <View style={N4_HERO_PILL_ROW_STYLE}>
        {pills.map((pill) => {
          const { label, glyph } = resolvePill(pill);
          return <HeroPill key={pill.kind} label={label} glyph={glyph} />;
        })}
      </View>
    </View>
  );
}

/**
 * The amount, as the two nodes `.hero-v .n` and its nested `.cur`
 * (mockup.html:2334). Split rather than routed through `formatCurrencyAmount`
 * because the step-down counts characters EXCLUDING the suffix and the suffix
 * renders at its own size and opacity — the same split `resolveAccountRowAmount`
 * already ships one screen over.
 *
 * `numberOfLines={1}` is `.hero-v`'s `white-space: nowrap` (mockup.html:679),
 * and it is load-bearing: the slot is a fixed height with `overflow: hidden`,
 * so without it a long amount wraps and gets sliced mid-number instead of
 * stepping down to `N4_HERO_VALUE_STEP_TEXT_STYLE`.
 *
 * The a11y label is one string, built by `resolveHeroValueA11yLabel` so that
 * its explicit decimals are assertable without a renderer — the default for EGP
 * is 0, which would announce "148,250 EGP" over a screen reading
 * "148,250.00 EGP".
 *
 * The sign is whatever the resolver and `Intl` produced; no leading minus is
 * written here. (The mockup draws U+2212 MINUS and `Intl` emits U+002D
 * HYPHEN-MINUS — formatter output, not transcribed copy.)
 */
function HeroValue({ value, baseCurrency }: { value: number; baseCurrency: Currency }) {
  const { value: amountString, code } = resolveHeroAmountParts(value, baseCurrency);

  return (
    <View
      style={N4_HERO_VALUE_SLOT_STYLE}
      accessible
      accessibilityLabel={resolveHeroValueA11yLabel(value, baseCurrency)}
    >
      <Text
        className="text-accent font-sora-bold"
        style={resolveHeroValueTextStyle(amountString)}
        numberOfLines={1}
      >
        {amountString}
        {/* mockup.html:687 draws `.cur` at weight 600 inside the value's 700 —
            one class carries family and weight together, so the nested node
            names its own face rather than inheriting the bold one. */}
        <Text className="font-sora-semibold" style={N4_HERO_CURRENCY_TEXT_STYLE}>
          {` ${code}`}
        </Text>
      </Text>
    </View>
  );
}
