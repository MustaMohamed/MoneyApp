import { Skeleton, Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { HeroShell } from '@/components/ui/hero_shell';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';

import type { TransactionsHeroModel } from '../transactions.helpers';

// Each loaded row takes its text's line height, so the skeleton's bars match it to the dp.
export const TRANSACTIONS_HERO_GEOMETRY = {
  header: lineHeightFor(Type.overline),
  amount: lineHeightFor(Type.hero),
  columns: lineHeightFor(Type.micro) + Spacing.xxxs + lineHeightFor(Type.body),
  rail: Size.progressThin,
  caption: lineHeightFor(Type.chip),
} as const;

const HERO_ROW_GAP = Spacing.sm;
const HERO_SHELL_STYLE = { marginTop: Spacing.xs } as const;
const HERO_BODY_STYLE = { gap: HERO_ROW_GAP } as const;

type ColumnAlign = 'left' | 'center' | 'right';

function HeroColumn({
  label,
  value,
  align,
}: {
  label: string;
  value: string;
  align: ColumnAlign;
}): React.ReactElement {
  return (
    <View style={{ flex: 1, gap: Spacing.xxxs }}>
      <Typography
        numberOfLines={1}
        className="font-inter text-foreground/55"
        style={{ textAlign: align, fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
      >
        {label}
      </Typography>
      <Typography
        numberOfLines={1}
        className="font-sora-semibold text-foreground tabular-nums"
        style={{ textAlign: align, fontSize: Type.body, lineHeight: lineHeightFor(Type.body) }}
      >
        {value}
      </Typography>
    </View>
  );
}

function HeroSkeleton(): React.ReactElement {
  return (
    <View testID="transactions-hero-skeleton" className="px-4 py-4" style={HERO_BODY_STYLE}>
      <Skeleton
        className="w-2/5 rounded-md"
        style={{ height: TRANSACTIONS_HERO_GEOMETRY.header }}
      />
      <Skeleton
        className="w-1/2 rounded-md"
        style={{ height: TRANSACTIONS_HERO_GEOMETRY.amount }}
      />
      <Skeleton
        className="w-full rounded-md"
        style={{ height: TRANSACTIONS_HERO_GEOMETRY.columns }}
      />
      <Skeleton
        className="w-full rounded-full"
        style={{ height: TRANSACTIONS_HERO_GEOMETRY.rail }}
      />
      <Skeleton
        className="w-3/5 rounded-md"
        style={{ height: TRANSACTIONS_HERO_GEOMETRY.caption }}
      />
    </View>
  );
}

export function TransactionsHero({ model }: { model: TransactionsHeroModel }): React.ReactElement {
  if (model.mode === 'skeleton') {
    return (
      <HeroShell style={HERO_SHELL_STYLE}>
        <HeroSkeleton />
      </HeroShell>
    );
  }

  return (
    <HeroShell style={HERO_SHELL_STYLE}>
      <View testID="transactions-hero" className="px-4 py-4" style={HERO_BODY_STYLE}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.xs,
            height: TRANSACTIONS_HERO_GEOMETRY.header,
          }}
        >
          <Typography
            numberOfLines={1}
            className="font-sora-semibold text-foreground/70"
            style={{
              flex: 1,
              fontSize: Type.overline,
              lineHeight: lineHeightFor(Type.overline),
            }}
          >
            {model.title}
          </Typography>
          <Typography
            numberOfLines={1}
            className="font-sora-semibold text-foreground/70"
            style={{ fontSize: Type.overline, lineHeight: lineHeightFor(Type.overline) }}
          >
            {model.monthLabel}
          </Typography>
        </View>

        {/* A container `gap`, not a `marginLeft` on a nested Text: RN Android drops margins on inline text. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: Spacing.xs,
            height: TRANSACTIONS_HERO_GEOMETRY.amount,
          }}
        >
          <Typography
            numberOfLines={1}
            className="font-sora-bold text-foreground tabular-nums"
            style={{ flexShrink: 1, fontSize: Type.hero, lineHeight: lineHeightFor(Type.hero) }}
          >
            {model.out}
          </Typography>
          <Typography
            className="font-sora-semibold text-foreground/70"
            style={{
              flexShrink: 0,
              fontSize: Type.subhead,
              lineHeight: lineHeightFor(Type.subhead),
            }}
          >
            {Currency.EGP}
          </Typography>
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: Spacing.xs,
            height: TRANSACTIONS_HERO_GEOMETRY.columns,
          }}
        >
          <HeroColumn label={Strings.transactionsHeroIn} value={model.in} align="left" />
          <HeroColumn label={Strings.transactionsHeroNet} value={model.net} align="center" />
          <HeroColumn
            label={Strings.transactionsHeroLeftOfIncome}
            value={model.leftOfIncome}
            align="right"
          />
        </View>

        <View
          accessibilityRole="progressbar"
          accessibilityLabel={model.railAccessibilityLabel}
          accessibilityValue={{ min: 0, max: 100, now: model.railPct }}
          className="bg-default/40 overflow-hidden rounded-full"
          style={{ height: TRANSACTIONS_HERO_GEOMETRY.rail }}
        >
          <View
            className={model.railDanger ? 'bg-danger rounded-full' : 'bg-accent rounded-full'}
            style={{ height: TRANSACTIONS_HERO_GEOMETRY.rail, width: `${model.railPct}%` }}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.xs,
            height: TRANSACTIONS_HERO_GEOMETRY.caption,
          }}
        >
          <Typography
            numberOfLines={1}
            className="font-inter text-foreground/55"
            style={{ flex: 1, fontSize: Type.chip, lineHeight: lineHeightFor(Type.chip) }}
          >
            {model.shareCaption ?? ''}
          </Typography>
          <Typography
            numberOfLines={1}
            className="font-inter text-foreground/55"
            style={{ flexShrink: 0, fontSize: Type.chip, lineHeight: lineHeightFor(Type.chip) }}
          >
            {model.caption}
          </Typography>
        </View>
      </View>
    </HeroShell>
  );
}
