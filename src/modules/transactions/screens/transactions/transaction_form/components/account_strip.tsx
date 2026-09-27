import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Chip, cn } from 'heroui-native';
import { View } from 'react-native';

import { AccountColorTile } from '@/components/ui/account_color_tile';
import { Text } from '@/components/ui/text';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { resolveAccountName } from '@/utils/account_name';

import { DangerRing } from './danger_ring';
import {
  ACCOUNT_STRIP_CHIP_MIN_HEIGHT,
  ACCOUNT_STRIP_CHIP_PADDING,
  ACCOUNT_STRIP_CHIP_RADIUS,
  ACCOUNT_STRIP_CHIP_WIDTH,
  ACCOUNT_STRIP_GAP,
  ACCOUNT_STRIP_TILE,
  ACCOUNT_STRIP_TILE_NAME_GAP,
} from './transaction_form_geometry';

interface AccountStripProps {
  accounts: Account[];
  selectedId: string | undefined;
  onSelect: (account: Account) => void;
  caption?: string;
  error?: string;
}

export function AccountStrip({
  accounts,
  selectedId,
  onSelect,
  caption,
  error,
}: AccountStripProps): React.ReactElement {
  return (
    <View testID="account-strip" style={{ marginHorizontal: Spacing.md }}>
      {caption !== undefined ? (
        <Text
          className="font-inter text-muted"
          style={{
            marginBottom: Spacing.xxs,
            fontSize: Type.micro,
            lineHeight: lineHeightFor(Type.micro),
          }}
          numberOfLines={1}
        >
          {caption}
        </Text>
      ) : null}
      <View>
        <BottomSheetScrollView
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: ACCOUNT_STRIP_GAP }}
        >
          {accounts.map((account) => {
            const selected = account.id === selectedId;
            const name = resolveAccountName(account);
            return (
              <Chip
                key={account.id}
                testID={`account-strip-chip-${account.id}`}
                size="sm"
                variant="secondary"
                color="default"
                animation="disable-all"
                onPress={() => onSelect(account)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={name}
                accessibilityHint={error}
                className={cn(
                  'border',
                  selected ? 'border-accent/50 bg-accent/15' : 'border-border bg-default/40',
                )}
                style={{
                  flexDirection: 'column',
                  width: ACCOUNT_STRIP_CHIP_WIDTH,
                  minHeight: ACCOUNT_STRIP_CHIP_MIN_HEIGHT,
                  gap: ACCOUNT_STRIP_TILE_NAME_GAP,
                  borderRadius: ACCOUNT_STRIP_CHIP_RADIUS,
                  paddingVertical: ACCOUNT_STRIP_CHIP_PADDING.vertical,
                  paddingHorizontal: ACCOUNT_STRIP_CHIP_PADDING.horizontal,
                }}
              >
                <AccountColorTile
                  color={account.color}
                  type={account.type}
                  size={ACCOUNT_STRIP_TILE}
                  glyphSize={Size.rowGlyph}
                />
                <Chip.Label
                  numberOfLines={1}
                  className={
                    selected
                      ? 'text-accent font-inter-semibold'
                      : 'text-foreground/70 font-inter-medium'
                  }
                  style={{ fontSize: Type.pillLabel, lineHeight: lineHeightFor(Type.pillLabel) }}
                >
                  {name}
                </Chip.Label>
              </Chip>
            );
          })}
        </BottomSheetScrollView>
        {error !== undefined ? (
          <DangerRing testID="account-strip-ring" radius={ACCOUNT_STRIP_CHIP_RADIUS} />
        ) : null}
      </View>
    </View>
  );
}
