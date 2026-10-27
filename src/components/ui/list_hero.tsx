import { Skeleton, Typography } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { FLOW_CLASS, type PolaritySignal } from '@/components/ui/flow_polarity';
import { HeroShell } from '@/components/ui/hero_shell';
import { HERO_SHELL_MARGIN_BOTTOM } from '@/components/ui/hero_shell.geometry';
import { type ListHeroGeometry, resolveListHeroGeometry } from '@/components/ui/list_text.geometry';
import { StatusCounter, type StatusCounterProps } from '@/components/ui/status_counter';
import { Size, Spacing, lineHeightFor } from '@/constants/theme';

export type ListHeroMode = 'skeleton' | 'loaded';

export type ListHeroColumnAlign = 'left' | 'center' | 'right';

export type ListHeroRailTone = 'success' | 'danger' | 'gold';

export interface ListHeroColumnModel {
  label: string;
  value: string;
  align: ListHeroColumnAlign;
  polarity: PolaritySignal;
}

export interface ListHeroRailModel {
  /** 0 to 100. */
  pct: number;
  tone: ListHeroRailTone;
  accessibilityLabel: string;
}

export interface ListHeroCounterModel {
  icon: StatusCounterProps['icon'];
  color: string;
  value: string;
  accessibilityLabel: string;
}

export interface ListHeroModel {
  mode: ListHeroMode;
  title: string;
  monthLabel: string;
  amount: string;
  currencyCode: string;
  amountAccessibilityLabel: string;
  columns: readonly ListHeroColumnModel[];
  rail: ListHeroRailModel;
  /** Absent, the hero draws no counters row. */
  counters?: readonly ListHeroCounterModel[];
}

// The tab's month row owns the space above the hero; 0 and not dropped, since `HeroShell`'s frame defaults to a top margin.
const HERO_SHELL_STYLE = { marginTop: 0, marginBottom: HERO_SHELL_MARGIN_BOTTOM } as const;
const HERO_BODY_STYLE = { gap: Spacing.sm } as const;
const COLUMNS_ROW_STYLE = { flexDirection: 'row', gap: Spacing.xs } as const;
const COUNTERS_ROW_STYLE = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
} as const;

// Aligned by the column, not `textAlign`: Android draws a right-aligned ellipsised line past its box's leading edge.
const COLUMN_ALIGN: Record<ListHeroColumnAlign, 'flex-start' | 'center' | 'flex-end'> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
};

const RAIL_FILL_CLASS: Record<ListHeroRailTone, string> = {
  success: 'bg-success rounded-full',
  danger: 'bg-danger rounded-full',
  gold: 'bg-gold-600 rounded-full',
};

function HeroColumn({
  column,
  geometry,
}: {
  column: ListHeroColumnModel;
  geometry: ListHeroGeometry;
}): React.ReactElement {
  return (
    <View
      accessible
      accessibilityLabel={`${column.label} ${column.value}`}
      style={{ flex: 1, gap: Spacing.xxxs, alignItems: COLUMN_ALIGN[column.align] }}
    >
      <Typography
        allowFontScaling={false}
        numberOfLines={1}
        className="font-inter text-foreground/55"
        style={{ fontSize: geometry.micro, lineHeight: lineHeightFor(geometry.micro) }}
      >
        {column.label}
      </Typography>
      <Typography
        allowFontScaling={false}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        className={`font-sora-semibold tabular-nums ${FLOW_CLASS[column.polarity]}`}
        style={{ fontSize: geometry.body, lineHeight: lineHeightFor(geometry.body) }}
      >
        {column.value}
      </Typography>
    </View>
  );
}

function HeroSkeleton({
  columns,
  counters,
  geometry,
  testID,
}: {
  columns: readonly ListHeroColumnModel[];
  counters: readonly ListHeroCounterModel[] | undefined;
  geometry: ListHeroGeometry;
  testID: string;
}): React.ReactElement {
  return (
    <View testID={testID} className="px-4 py-4" style={HERO_BODY_STYLE}>
      <Skeleton className="w-2/5 rounded-md" style={{ height: geometry.header }} />
      <Skeleton className="w-1/2 rounded-md" style={{ height: geometry.amount }} />
      <View style={COLUMNS_ROW_STYLE}>
        {columns.map((_column, index) => (
          <Skeleton
            key={index}
            className="rounded-md"
            style={{ flex: 1, height: geometry.columns }}
          />
        ))}
      </View>
      <Skeleton className="w-full rounded-full" style={{ height: geometry.rail }} />
      {counters !== undefined && (
        <View style={[COUNTERS_ROW_STYLE, { height: geometry.counters }]}>
          {counters.map((counter, index) => (
            <View key={index} accessible accessibilityLabel={counter.accessibilityLabel}>
              <Skeleton
                className="rounded-md"
                style={{
                  width: Size.statusCounterIcon + Spacing.xxs + geometry.micro,
                  height: geometry.counters,
                }}
              />
            </View>
          ))}
        </View>
      )}
      <Skeleton className="w-3/5 rounded-md" style={{ height: geometry.caption }} />
    </View>
  );
}

export function ListHero({
  model,
  renderCaption,
  testID,
}: {
  model: ListHeroModel;
  renderCaption: (geometry: ListHeroGeometry) => React.ReactNode;
  testID: string;
}): React.ReactElement {
  const geometry = resolveListHeroGeometry(useWindowDimensions().fontScale);
  if (model.mode === 'skeleton') {
    return (
      <HeroShell style={HERO_SHELL_STYLE}>
        <HeroSkeleton
          columns={model.columns}
          counters={model.counters}
          geometry={geometry}
          testID={`${testID}-skeleton`}
        />
      </HeroShell>
    );
  }

  return (
    <HeroShell style={HERO_SHELL_STYLE}>
      <View testID={testID} className="px-4 py-4" style={HERO_BODY_STYLE}>
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
          accessibilityLabel={model.amountAccessibilityLabel}
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
            {model.amount}
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

        <View style={[COLUMNS_ROW_STYLE, { height: geometry.columns }]}>
          {model.columns.map((column, index) => (
            <HeroColumn key={index} column={column} geometry={geometry} />
          ))}
        </View>

        <View
          accessibilityRole="progressbar"
          accessibilityLabel={model.rail.accessibilityLabel}
          accessibilityValue={{ min: 0, max: 100, now: model.rail.pct }}
          className="bg-default/40 overflow-hidden rounded-full"
          style={{ height: geometry.rail }}
        >
          <View
            className={RAIL_FILL_CLASS[model.rail.tone]}
            style={{ height: geometry.rail, width: `${model.rail.pct}%` }}
          />
        </View>

        {model.counters !== undefined && (
          <View style={[COUNTERS_ROW_STYLE, { height: geometry.counters }]}>
            {model.counters.map((counter, index) => (
              <StatusCounter
                key={index}
                icon={counter.icon}
                color={counter.color}
                value={counter.value}
                fontSize={geometry.micro}
                accessibilityLabel={counter.accessibilityLabel}
              />
            ))}
          </View>
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.xs,
            height: geometry.caption,
          }}
        >
          {renderCaption(geometry)}
        </View>
      </View>
    </HeroShell>
  );
}
