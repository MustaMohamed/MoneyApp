import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Typography } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { DateTile } from '@/components/ui/date_tile';
import {
  DETAIL_HERO_BADGE_GAP,
  DETAIL_HERO_BADGE_ROW_GAP,
  DETAIL_HERO_BAR_GAP,
  DETAIL_HERO_BAR_HEIGHT,
  DETAIL_HERO_BAR_RADIUS,
  DETAIL_HERO_BAR_TICK_OVERHANG,
  DETAIL_HERO_BAR_TICK_RADIUS,
  DETAIL_HERO_BAR_TICK_WIDTH,
  DETAIL_HERO_CODE_GAP,
  DETAIL_HERO_CODE_OPACITY,
  DETAIL_HERO_FIGURES_COLUMN_GAP,
  DETAIL_HERO_FIGURES_GAP,
  DETAIL_HERO_FIGURE_VALUE_GAP,
  DETAIL_HERO_INFO_ROW_GAP,
  DETAIL_HERO_INFO_STACK_GAP,
  DETAIL_HERO_PADDING,
  DETAIL_HERO_SHELL_STYLE,
  DETAIL_HERO_TILE_GAP,
  DETAIL_HERO_TILE_STYLE,
  resolveDetailHeroBarShare,
  resolveDetailHeroGeometry,
} from '@/components/ui/detail_hero.geometry';
import { HeroShell, type HeroShellProps } from '@/components/ui/hero_shell';
import { StatusBadge } from '@/components/ui/status_badge';
import {
  resolveFitAmountTextProps,
  resolveFitLineTextProps,
} from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import { Size, Type, lineHeightFor } from '@/constants/theme';
import type { DateTileParts } from '@/utils/format_date';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export type DetailHeroRun = string | { strong: string };
export type DetailHeroText = string | readonly DetailHeroRun[];

export interface DetailHeroFigure {
  label: string;
  value: string;
}

export type DetailHeroFigures =
  | readonly [DetailHeroFigure]
  | readonly [DetailHeroFigure, DetailHeroFigure]
  | readonly [DetailHeroFigure, DetailHeroFigure, DetailHeroFigure];

export type DetailHeroTileDate = DateTileParts & { ink: string };

interface DetailHeroFields {
  title: string;
  badgeLabel: string;
  badgeIcon?: IconName;
  badgeFill: string;
  badgeForeground: string;
  tileColor: string;
  amountValue: string;
  amountCode?: string;
  amountColor: string;
  amountAccessibilityLabel: string;
  caption: DetailHeroText;
  captionEnd?: DetailHeroText;
  /** Absent draws the default overline; `false` hides the line. */
  overline?: string | false;
  tag?: DetailHeroBadge;
  figures?: DetailHeroFigures;
  bar?: DetailHeroBar;
}

type DetailHeroTile =
  | { tileGlyph: IconName; tileGlyphColor: string; tileDate?: never }
  | { tileDate: DetailHeroTileDate; tileGlyph?: never; tileGlyphColor?: never };

export type DetailHeroModel = DetailHeroFields & DetailHeroTile;

export type DetailHeroBadge = Pick<
  DetailHeroModel,
  'badgeLabel' | 'badgeIcon' | 'badgeFill' | 'badgeForeground'
>;

export interface DetailHeroBar {
  share: number;
  color: string;
  tickShare?: number;
}

interface Props {
  hero: DetailHeroModel;
  testID: string;
  entering?: HeroShellProps['entering'];
}

function sharePercent(share: number): `${number}%` {
  return `${resolveDetailHeroBarShare(share) * 100}%`;
}

function DetailHeroTileSlot({ hero }: { hero: DetailHeroModel }): React.ReactElement {
  if (hero.tileDate !== undefined) {
    return <DateTile {...hero.tileDate} fill={hero.tileColor} />;
  }
  return (
    <View style={{ ...DETAIL_HERO_TILE_STYLE, backgroundColor: hero.tileColor }}>
      <MaterialCommunityIcons
        name={hero.tileGlyph}
        size={Size.iconLg}
        color={hero.tileGlyphColor}
      />
    </View>
  );
}

type FigureAlign = 'flex-start' | 'center' | 'flex-end';

function figureAlign(index: number, count: number): FigureAlign {
  if (index === 0) return 'flex-start';
  return index === count - 1 ? 'flex-end' : 'center';
}

const FIGURE_TEXT_ALIGN = { 'flex-start': 'left', center: 'center', 'flex-end': 'right' } as const;

function DetailHeroFiguresRow({
  figures,
  fontScale,
}: {
  figures: DetailHeroFigures;
  fontScale: number;
}): React.ReactElement {
  const labelText = resolveFitLineTextProps(Type.micro, fontScale);
  const valueText = resolveFitAmountTextProps(Type.meta, fontScale);
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: DETAIL_HERO_FIGURES_COLUMN_GAP,
        marginTop: DETAIL_HERO_FIGURES_GAP,
      }}
    >
      {figures.map((figure, index) => {
        const align = figureAlign(index, figures.length);
        const textAlign = FIGURE_TEXT_ALIGN[align];
        return (
          // oxlint-disable-next-line react/no-array-index-key -- figures are a fixed-order tuple with no id.
          <View key={index} style={{ flexShrink: 1, alignItems: align }}>
            <Typography
              {...labelText}
              className="font-inter text-foreground/55"
              style={{ ...labelText.style, textAlign }}
            >
              {figure.label}
            </Typography>
            <Typography
              {...valueText}
              // Fits at every scale: a figure value never ends in `…`.
              adjustsFontSizeToFit
              className="font-sora-semibold text-foreground tabular-nums"
              style={{ ...valueText.style, textAlign, marginTop: DETAIL_HERO_FIGURE_VALUE_GAP }}
            >
              {figure.value}
            </Typography>
          </View>
        );
      })}
    </View>
  );
}

function DetailHeroInfoText({
  text,
  fontSize,
  style,
}: {
  text: DetailHeroText;
  fontSize: number;
  style?: { flexShrink?: number };
}): React.ReactElement {
  return (
    <Typography
      allowFontScaling={false}
      numberOfLines={1}
      className="font-inter text-foreground/55"
      style={{ ...style, fontSize, lineHeight: lineHeightFor(fontSize) }}
    >
      {typeof text === 'string'
        ? text
        : text.map((run, index) =>
            typeof run === 'string' ? (
              run
            ) : (
              // A nested Typography takes HeroUI's body size unless it carries its own pair.
              <Typography
                // oxlint-disable-next-line react/no-array-index-key -- runs are a static sequence with no id.
                key={index}
                allowFontScaling={false}
                className="font-inter-semibold text-foreground/80"
                style={{ fontSize, lineHeight: lineHeightFor(fontSize) }}
              >
                {run.strong}
              </Typography>
            ),
          )}
    </Typography>
  );
}

// No overflow clip: the tick overhangs the track.
function DetailHeroBarRow({ bar }: { bar: DetailHeroBar }): React.ReactElement {
  return (
    <View
      className="bg-foreground/12"
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(resolveDetailHeroBarShare(bar.share) * 100),
      }}
      style={{
        marginTop: DETAIL_HERO_BAR_GAP,
        height: DETAIL_HERO_BAR_HEIGHT,
        borderRadius: DETAIL_HERO_BAR_RADIUS,
      }}
    >
      <View
        style={{
          width: sharePercent(bar.share),
          height: DETAIL_HERO_BAR_HEIGHT,
          borderRadius: DETAIL_HERO_BAR_RADIUS,
          backgroundColor: bar.color,
        }}
      />
      {bar.tickShare === undefined ? undefined : (
        <View
          className="bg-foreground/80"
          style={{
            position: 'absolute',
            left: sharePercent(bar.tickShare),
            // Slides back by its share of its own width, so it stays on the track at 0 and 1.
            transform: [
              {
                translateX: -DETAIL_HERO_BAR_TICK_WIDTH * resolveDetailHeroBarShare(bar.tickShare),
              },
            ],
            top: -DETAIL_HERO_BAR_TICK_OVERHANG,
            width: DETAIL_HERO_BAR_TICK_WIDTH,
            height: DETAIL_HERO_BAR_HEIGHT + 2 * DETAIL_HERO_BAR_TICK_OVERHANG,
            borderRadius: DETAIL_HERO_BAR_TICK_RADIUS,
          }}
        />
      )}
    </View>
  );
}

export function DetailHero({ hero, testID, entering }: Props): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const geometry = resolveDetailHeroGeometry(fontScale, {
    hidesOverline: hero.overline === false,
    bar: hero.bar !== undefined,
    figures: hero.figures !== undefined,
    captionEnd: hero.captionEnd !== undefined,
  });
  const infoRow = hero.captionEnd !== undefined && !geometry.stacksInfo;
  const infoTextStyle = infoRow ? { flexShrink: 1 } : undefined;

  return (
    <HeroShell glowColor={hero.tileColor} style={DETAIL_HERO_SHELL_STYLE} entering={entering}>
      <View testID={testID} style={{ padding: DETAIL_HERO_PADDING, height: geometry.height }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: DETAIL_HERO_TILE_GAP,
            height: geometry.topHeight,
          }}
        >
          <DetailHeroTileSlot hero={hero} />
          <View style={{ flex: 1 }}>
            <Typography
              allowFontScaling={false}
              numberOfLines={1}
              className="font-sora-semibold text-foreground"
              style={{
                fontSize: geometry.titleFontSize,
                lineHeight: lineHeightFor(geometry.titleFontSize),
              }}
            >
              {hero.title}
            </Typography>
            {/* A column child stretches by default, which would run the pill the full width. */}
            <View
              style={{
                flexDirection: 'row',
                alignSelf: 'flex-start',
                gap: DETAIL_HERO_BADGE_ROW_GAP,
                marginTop: DETAIL_HERO_BADGE_GAP,
              }}
            >
              {hero.tag === undefined ? undefined : (
                // The state tag keeps its whole label; the badge beside it takes the ellipsis.
                <View style={{ flexShrink: 0 }}>
                  <StatusBadge
                    label={hero.tag.badgeLabel}
                    fill={hero.tag.badgeFill}
                    foreground={hero.tag.badgeForeground}
                    icon={hero.tag.badgeIcon}
                    size="tagMd"
                    fontScale={fontScale}
                  />
                </View>
              )}
              <StatusBadge
                label={hero.badgeLabel}
                fill={hero.badgeFill}
                foreground={hero.badgeForeground}
                icon={hero.badgeIcon}
                size="md"
                fontScale={fontScale}
              />
            </View>
          </View>
        </View>

        {hero.overline === false ? undefined : (
          <Typography
            allowFontScaling={false}
            numberOfLines={1}
            className="font-inter text-foreground/70 tracking-wider uppercase"
            style={{
              marginTop: geometry.overlineMarginTop,
              fontSize: geometry.overlineFontSize,
              lineHeight: lineHeightFor(geometry.overlineFontSize),
            }}
          >
            {hero.overline ?? Strings.detailAmountOverline}
          </Typography>
        )}

        {/* A container `gap`, not a `marginLeft` on a nested Text: RN Android drops margins on inline text. */}
        <View
          accessible
          accessibilityLabel={hero.amountAccessibilityLabel}
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: DETAIL_HERO_CODE_GAP,
            height: geometry.amountHeight,
            marginTop: geometry.amountMarginTop,
          }}
        >
          <Typography
            allowFontScaling={false}
            numberOfLines={1}
            adjustsFontSizeToFit
            className="font-sora-bold tabular-nums"
            style={{
              flexShrink: 1,
              color: hero.amountColor,
              fontSize: geometry.amountFontSize,
              lineHeight: lineHeightFor(geometry.amountFontSize),
            }}
          >
            {hero.amountValue}
          </Typography>
          {hero.amountCode === undefined ? undefined : (
            <Typography
              allowFontScaling={false}
              className="font-sora-semibold"
              style={{
                flexShrink: 0,
                color: hero.amountColor,
                opacity: DETAIL_HERO_CODE_OPACITY,
                fontSize: geometry.codeFontSize,
                lineHeight: lineHeightFor(geometry.codeFontSize),
              }}
            >
              {hero.amountCode}
            </Typography>
          )}
        </View>

        {hero.figures === undefined ? undefined : (
          <DetailHeroFiguresRow figures={hero.figures} fontScale={fontScale} />
        )}

        {hero.bar === undefined ? undefined : <DetailHeroBarRow bar={hero.bar} />}

        <View
          style={{
            flexDirection: infoRow ? 'row' : 'column',
            justifyContent: 'space-between',
            gap: infoRow ? DETAIL_HERO_INFO_ROW_GAP : DETAIL_HERO_INFO_STACK_GAP,
            marginTop: geometry.captionGap,
          }}
        >
          <DetailHeroInfoText
            text={hero.caption}
            fontSize={geometry.captionFontSize}
            style={infoTextStyle}
          />
          {hero.captionEnd === undefined ? undefined : (
            <DetailHeroInfoText
              text={hero.captionEnd}
              fontSize={geometry.captionFontSize}
              style={infoTextStyle}
            />
          )}
        </View>
      </View>
    </HeroShell>
  );
}
