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
import type { ReadySummaryState } from '@/modules/onboarding/domain/ready_summary_state';

import {
  N4_HERO_CAPTION_MAX_LINES,
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
} from '../ready.geometry';
import {
  resolveCaption,
  resolveHeroAmountParts,
  resolveHeroValueA11yLabel,
  resolveHeroValueTextStyle,
  resolvePill,
} from '../ready.helpers';

export interface ReadyHeroCardProps {
  summary: ReadySummaryState;
}

/** The value is `text-accent` in every state, including negative and zero; no red anywhere. */
export function ReadyHeroCard({ summary }: ReadyHeroCardProps) {
  const { outcome, frame, accountCount, foreignCount, foreignCurrency, baseCurrency, pills } =
    summary;

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
            backgroundColor: Colors.dark.goldTint,
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
          {/* Warning, not danger: an unverified rate shows no number at all. */}
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
        {/* The slot is fixed-height with `overflow: hidden`, so an uncapped line is sliced. */}
        <Typography
          className="text-foreground font-inter"
          style={N4_HERO_CAPTION_TEXT_STYLE}
          numberOfLines={N4_HERO_CAPTION_MAX_LINES}
        >
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

/** `numberOfLines={1}` is load-bearing: the slot is fixed-height, so a wrapped amount is sliced. */
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
        {/* One class carries family and weight, so the nested node names its own face. */}
        <Text className="font-sora-semibold" style={N4_HERO_CURRENCY_TEXT_STYLE}>
          {` ${code}`}
        </Text>
      </Text>
    </View>
  );
}
