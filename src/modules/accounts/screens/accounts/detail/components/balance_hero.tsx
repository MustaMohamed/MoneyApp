import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Typography } from 'heroui-native';
import { View } from 'react-native';

import { HeroShell } from '@/components/ui/hero_shell';
import { StatusBadge } from '@/components/ui/status_badge';
import { ACCOUNT_TYPE_ICONS } from '@/constants/account_type_icons';
import { ACCOUNT_TYPE_LABELS } from '@/constants/account_type_labels';
import { Strings } from '@/constants/strings';
import { Radius, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { AcctTokens } from '@/constants/theme_tokens';
import { resolveAccountBadgeColors } from '@/modules/accounts/constants/account_badge_color';
import { resolveAccountBalanceColorClass } from '@/modules/accounts/constants/account_balance_color';
import { resolveAccountTileColors } from '@/modules/accounts/constants/account_tile_color';

import type { Account } from '../../../../store/account.store';
import { HERO_CURRENCY_GAP, HERO_CURRENCY_OPACITY } from './balance_hero.geometry';
import { buildHeroCaption, formatAccountBalanceParts } from './balance_hero.helpers';

interface BalanceHeroProps {
  account: Account;
}

export function BalanceHero({ account }: BalanceHeroProps) {
  const color = account.color ?? AcctTokens.midnight.rich;
  const caption = buildHeroCaption(account);
  const tile = resolveAccountTileColors(account.color);
  const badge = resolveAccountBadgeColors(color);
  const balance = formatAccountBalanceParts(account.current_balance, account.currency);
  const balanceColorClass = resolveAccountBalanceColorClass(account.type);

  return (
    <HeroShell glowColor={color} style={{ marginTop: 8 }}>
      <View className="px-4 py-4">
        <View style={{ flexDirection: 'row' }} className="items-center gap-3">
          <View
            style={{
              width: Size.typeIconBox,
              height: Size.typeIconBox,
              borderRadius: Radius.sm,
              backgroundColor: tile.background,
            }}
            className="items-center justify-center"
          >
            <MaterialCommunityIcons
              name={ACCOUNT_TYPE_ICONS[account.type]}
              size={Size.iconSm}
              color={tile.glyph}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Typography
              numberOfLines={1}
              style={{ fontSize: Type.subhead, lineHeight: lineHeightFor(Type.subhead) }}
              className="font-sora-semibold text-foreground"
            >
              {account.name}
            </Typography>
            {/* A column child stretches by default, which would run the pill the full width. */}
            <View style={{ alignSelf: 'flex-start', marginTop: Spacing.xxs }}>
              <StatusBadge
                label={ACCOUNT_TYPE_LABELS[account.type]}
                fill={badge.fill}
                foreground={badge.foreground}
                icon={ACCOUNT_TYPE_ICONS[account.type]}
                size="sm"
              />
            </View>
          </View>
        </View>

        <Typography className="text-foreground/70 font-inter mt-4 text-[11px] tracking-wider uppercase">
          {Strings.accountDetailBalance}
        </Typography>

        {/* A container `gap`, not a `marginLeft` on a nested Text — RN Android drops margins on inline text. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: HERO_CURRENCY_GAP,
          }}
          className="mt-1"
        >
          <Typography
            numberOfLines={1}
            style={{ flexShrink: 1, fontSize: Type.hero, lineHeight: lineHeightFor(Type.hero) }}
            className={`font-sora-bold tabular-nums ${balanceColorClass}`}
          >
            {balance.amount}
          </Typography>
          <Typography
            style={{
              flexShrink: 0,
              opacity: HERO_CURRENCY_OPACITY,
              fontSize: Type.subhead,
              lineHeight: lineHeightFor(Type.subhead),
            }}
            className={`font-sora-bold tabular-nums ${balanceColorClass}`}
          >
            {balance.code}
          </Typography>
        </View>

        <Typography
          className="text-foreground/55 font-inter mt-1 text-[11px]"
          style={caption.color ? { color: caption.color } : undefined}
        >
          {caption.text}
          {caption.adjusted ? ` · ${Strings.accountHeroAdjusted}` : ''}
        </Typography>
      </View>
    </HeroShell>
  );
}
