import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Chip, cn } from 'heroui-native';
import { View } from 'react-native';

import { AccountColorTile } from '@/components/ui/account_color_tile';
import { SELECTABLE_PILL_CONTAINER_CLASS, SELECTABLE_PILL_LABEL_CLASS } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

import type { AccountStripChip } from '../transaction_form.helpers';
import { DangerRing } from './danger_ring';
import {
  ACCOUNT_STRIP_CHIP_HEIGHT,
  ACCOUNT_STRIP_CHIP_PADDING_X,
  ACCOUNT_STRIP_CHIP_RADIUS,
  ACCOUNT_STRIP_CHIP_SLOP_Y,
  ACCOUNT_STRIP_CHIP_WIDTH,
  ACCOUNT_STRIP_DIMMED_OPACITY,
  ACCOUNT_STRIP_GAP,
  ACCOUNT_STRIP_HIT_SLOP,
  ACCOUNT_STRIP_TILE,
  ACCOUNT_STRIP_TILE_NAME_GAP,
} from './transaction_form_geometry';

interface AccountStripProps {
  chips: AccountStripChip[];
  /** Absent on the locked strip; a locked or dimmed chip never reports a press. */
  onSelect?: (id: string) => void;
  caption?: string;
  error?: string;
  /** Shown in place of the chips when the type leaves no eligible account. */
  emptyText?: string;
}

export function AccountStrip({
  chips,
  onSelect,
  caption,
  error,
  emptyText,
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
        {chips.length === 0 ? (
          <Text
            testID="account-strip-empty"
            accessibilityHint={error}
            className="font-inter text-muted"
            style={{
              padding: Spacing.xs,
              fontSize: Type.caption,
              lineHeight: lineHeightFor(Type.caption),
            }}
            numberOfLines={1}
          >
            {emptyText}
          </Text>
        ) : (
          <BottomSheetScrollView
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: ACCOUNT_STRIP_GAP,
              paddingVertical: ACCOUNT_STRIP_CHIP_SLOP_Y,
            }}
          >
            {chips.map((chip) => {
              const disabled = chip.locked || chip.dimmed;
              return (
                <Chip
                  key={chip.id}
                  testID={`account-strip-chip-${chip.id}`}
                  size="sm"
                  variant="secondary"
                  color="default"
                  animation="disable-all"
                  disabled={disabled}
                  onPress={disabled || onSelect === undefined ? undefined : () => onSelect(chip.id)}
                  hitSlop={ACCOUNT_STRIP_HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityState={{ selected: chip.selected, disabled }}
                  accessibilityLabel={chip.name}
                  accessibilityHint={error}
                  className={cn(
                    'border',
                    chip.selected
                      ? SELECTABLE_PILL_CONTAINER_CLASS.selected
                      : SELECTABLE_PILL_CONTAINER_CLASS.unselected,
                  )}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    width: ACCOUNT_STRIP_CHIP_WIDTH,
                    height: ACCOUNT_STRIP_CHIP_HEIGHT,
                    gap: ACCOUNT_STRIP_TILE_NAME_GAP,
                    borderRadius: ACCOUNT_STRIP_CHIP_RADIUS,
                    paddingVertical: 0,
                    paddingHorizontal: ACCOUNT_STRIP_CHIP_PADDING_X,
                    // HeroUI's pressable root clips, and RNGH drops a hitSlop outside a clipping view on Android.
                    overflow: 'visible',
                    ...(chip.dimmed
                      ? { opacity: ACCOUNT_STRIP_DIMMED_OPACITY, borderStyle: 'dashed' as const }
                      : null),
                  }}
                >
                  <AccountColorTile
                    color={chip.tile.color}
                    type={chip.tile.type}
                    size={ACCOUNT_STRIP_TILE}
                    glyphSize={Size.rowGlyph}
                    hollow={chip.tile.hollow}
                  />
                  <Chip.Label
                    numberOfLines={1}
                    className={
                      chip.selected
                        ? SELECTABLE_PILL_LABEL_CLASS.selected
                        : SELECTABLE_PILL_LABEL_CLASS.unselected
                    }
                    style={{
                      flexShrink: 1,
                      textAlign: 'left',
                      fontSize: Type.micro,
                      lineHeight: lineHeightFor(Type.micro),
                    }}
                  >
                    {chip.name}
                  </Chip.Label>
                  {chip.locked ? (
                    <MaterialCommunityIcons
                      testID={`account-strip-lock-${chip.id}`}
                      name="lock-outline"
                      size={Size.iconMicro}
                      color={CoreTokens.text2}
                      style={{ marginLeft: 'auto' }}
                    />
                  ) : null}
                </Chip>
              );
            })}
          </BottomSheetScrollView>
        )}
        {error !== undefined ? (
          <DangerRing testID="account-strip-ring" radius={ACCOUNT_STRIP_CHIP_RADIUS} />
        ) : null}
      </View>
    </View>
  );
}
