import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Skeleton, Typography } from 'heroui-native';
import React, { type ComponentProps } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { withUniwind } from 'uniwind';

import { HeroShell } from '@/components/ui/hero_shell';
import { Strings } from '@/constants/strings';
import { Spacing, lineHeightFor } from '@/constants/theme';

import {
  type DeltaDirection,
  FLOW_CLASS,
  type PolaritySignal,
  type TransactionsHeroChange,
  type TransactionsHeroModel,
} from '../transactions.helpers';
import {
  type TransactionsHeroGeometry,
  resolveTransactionsHeroGeometry,
} from './transactions_text.geometry';

const HERO_ROW_GAP = Spacing.sm;
export const HERO_SHELL_MARGIN_BOTTOM = Spacing.xs;
const HERO_SHELL_STYLE = { marginTop: Spacing.xs, marginBottom: HERO_SHELL_MARGIN_BOTTOM } as const;

// Without `withUniwind` the icon's `styleDefaults` win and its `className` colour is a no-op.
const ChangeIcon = withUniwind(MaterialCommunityIcons);

const CHANGE_ICON: Record<DeltaDirection, ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  up: 'arrow-up',
  down: 'arrow-down',
  flat: 'arrow-right',
};

const CHANGE_CLASS: Record<PolaritySignal, string> = {
  good: 'text-success',
  bad: 'text-danger',
  neutral: 'text-foreground/50',
};
const HERO_BODY_STYLE = { gap: HERO_ROW_GAP } as const;

type ColumnAlign = 'left' | 'center' | 'right';

// Aligned by the column, not `textAlign`: Android draws a right-aligned ellipsised line past its box's leading edge.
const COLUMN_ALIGN: Record<ColumnAlign, 'flex-start' | 'center' | 'flex-end'> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
};

function HeroColumn({
  label,
  value,
  align,
  valueClassName,
  geometry,
}: {
  label: string;
  value: string;
  align: ColumnAlign;
  valueClassName: string;
  geometry: TransactionsHeroGeometry;
}): React.ReactElement {
  return (
    <View
      accessible
      accessibilityLabel={`${label} ${value}`}
      style={{ flex: 1, gap: Spacing.xxxs, alignItems: COLUMN_ALIGN[align] }}
    >
      <Typography
        allowFontScaling={false}
        numberOfLines={1}
        className="font-inter text-foreground/55"
        style={{ fontSize: geometry.micro, lineHeight: lineHeightFor(geometry.micro) }}
      >
        {label}
      </Typography>
      <Typography
        allowFontScaling={false}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        className={`font-sora-semibold tabular-nums ${valueClassName}`}
        style={{ fontSize: geometry.body, lineHeight: lineHeightFor(geometry.body) }}
      >
        {value}
      </Typography>
    </View>
  );
}

function LastMonthChange({
  change,
  geometry,
}: {
  change: TransactionsHeroChange;
  geometry: TransactionsHeroGeometry;
}): React.ReactElement {
  return (
    <View
      accessible
      accessibilityLabel={change.accessibilityLabel}
      style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}
    >
      <ChangeIcon
        name={CHANGE_ICON[change.direction]}
        size={geometry.caption}
        className={CHANGE_CLASS[change.polarity]}
      />
      <Typography
        allowFontScaling={false}
        numberOfLines={1}
        className={`font-sora-bold tabular-nums ${CHANGE_CLASS[change.polarity]}`}
        style={{ fontSize: geometry.chip, lineHeight: lineHeightFor(geometry.chip) }}
      >
        {change.label}
      </Typography>
    </View>
  );
}

function HeroSkeleton({ geometry }: { geometry: TransactionsHeroGeometry }): React.ReactElement {
  return (
    <View testID="transactions-hero-skeleton" className="px-4 py-4" style={HERO_BODY_STYLE}>
      <Skeleton className="w-2/5 rounded-md" style={{ height: geometry.header }} />
      <Skeleton className="w-1/2 rounded-md" style={{ height: geometry.amount }} />
      <Skeleton className="w-full rounded-md" style={{ height: geometry.columns }} />
      <Skeleton className="w-full rounded-full" style={{ height: geometry.rail }} />
      <Skeleton className="w-3/5 rounded-md" style={{ height: geometry.caption }} />
    </View>
  );
}

export function TransactionsHero({ model }: { model: TransactionsHeroModel }): React.ReactElement {
  const geometry = resolveTransactionsHeroGeometry(useWindowDimensions().fontScale);
  if (model.mode === 'skeleton') {
    return (
      <HeroShell style={HERO_SHELL_STYLE}>
        <HeroSkeleton geometry={geometry} />
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
            height: geometry.header,
          }}
        >
          <Typography
            allowFontScaling={false}
            numberOfLines={1}
            className="font-sora-semibold text-foreground/70"
            style={{
              flex: 1,
              fontSize: geometry.overline,
              lineHeight: lineHeightFor(geometry.overline),
            }}
          >
            {model.title}
          </Typography>
          <Typography
            allowFontScaling={false}
            numberOfLines={1}
            className="font-sora-semibold text-foreground/70"
            style={{ fontSize: geometry.overline, lineHeight: lineHeightFor(geometry.overline) }}
          >
            {model.monthLabel}
          </Typography>
        </View>

        {/* A container `gap`, not a `marginLeft` on a nested Text: RN Android drops margins on inline text. */}
        <View
          accessible
          accessibilityLabel={model.outAccessibilityLabel}
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: Spacing.xs,
            height: geometry.amount,
          }}
        >
          <Typography
            allowFontScaling={false}
            numberOfLines={1}
            className="font-sora-bold text-foreground tabular-nums"
            style={{
              flexShrink: 1,
              fontSize: geometry.hero,
              lineHeight: lineHeightFor(geometry.hero),
            }}
          >
            {model.out}
          </Typography>
          <Typography
            allowFontScaling={false}
            className="font-sora-semibold text-foreground/70"
            style={{
              flexShrink: 0,
              fontSize: geometry.subhead,
              lineHeight: lineHeightFor(geometry.subhead),
            }}
          >
            {model.currencyCode}
          </Typography>
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: Spacing.xs,
            height: geometry.columns,
          }}
        >
          <HeroColumn
            geometry={geometry}
            label={Strings.transactionsHeroIn}
            value={model.in}
            align="left"
            valueClassName={FLOW_CLASS[model.inPolarity]}
          />
          <HeroColumn
            geometry={geometry}
            label={Strings.transactionsHeroNet}
            value={model.net}
            align="center"
            valueClassName={FLOW_CLASS[model.netPolarity]}
          />
          <HeroColumn
            geometry={geometry}
            label={Strings.transactionsHeroLeftOfIncome}
            value={model.leftOfIncome}
            align="right"
            valueClassName="text-foreground"
          />
        </View>

        <View
          accessibilityRole="progressbar"
          accessibilityLabel={model.railAccessibilityLabel}
          accessibilityValue={{ min: 0, max: 100, now: model.railPct }}
          className="bg-default/40 overflow-hidden rounded-full"
          style={{ height: geometry.rail }}
        >
          <View
            className={model.railDanger ? 'bg-danger rounded-full' : 'bg-success rounded-full'}
            style={{ height: geometry.rail, width: `${model.railPct}%` }}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.xs,
            height: geometry.caption,
          }}
        >
          <Typography
            allowFontScaling={false}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            className="font-inter text-foreground/55"
            style={{ flex: 1, fontSize: geometry.chip, lineHeight: lineHeightFor(geometry.chip) }}
          >
            {model.shareCaption ?? ''}
          </Typography>
          <Typography
            allowFontScaling={false}
            numberOfLines={1}
            className="font-inter text-foreground/55"
            style={{
              flexShrink: 0,
              fontSize: geometry.chip,
              lineHeight: lineHeightFor(geometry.chip),
            }}
          >
            {model.caption}
          </Typography>
          {model.lastMonthChange !== undefined ? (
            <LastMonthChange change={model.lastMonthChange} geometry={geometry} />
          ) : null}
        </View>
      </View>
    </HeroShell>
  );
}
