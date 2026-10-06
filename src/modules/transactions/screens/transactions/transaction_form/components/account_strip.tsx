import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  BottomSheetScrollView,
  type BottomSheetScrollableProps,
  type ScrollEventsHandlersHookType,
} from '@gorhom/bottom-sheet';
import { View } from 'react-native';

import { AccountColorTile } from '@/components/ui/account_color_tile';
import { SelectablePill } from '@/components/ui/chip';
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
  ACCOUNT_STRIP_INSET_X,
  ACCOUNT_STRIP_TILE,
  ACCOUNT_STRIP_TILE_NAME_GAP,
} from './transaction_form.geometry';

type FocusHook = NonNullable<BottomSheetScrollableProps['focusHook']>;

// The form's vertical scroll owns the sheet's scrollable slot: the strip neither registers there nor writes its offset over the form's.
const skipScrollableRegistration: FocusHook = () => {};
const noScrollEventsHandlers: ScrollEventsHandlersHookType = () => ({});

interface AccountStripProps {
  chips: AccountStripChip[];
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
    <View testID="account-strip" style={{ marginHorizontal: ACCOUNT_STRIP_INSET_X }}>
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
            focusHook={skipScrollableRegistration}
            scrollEventsHandlersHook={noScrollEventsHandlers}
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: ACCOUNT_STRIP_GAP,
              paddingVertical: ACCOUNT_STRIP_CHIP_SLOP_Y,
            }}
          >
            {chips.map((chip) => (
              <SelectablePill
                key={chip.id}
                testID={`account-strip-chip-${chip.id}`}
                label={chip.name}
                selected={chip.selected}
                onPress={() => onSelect?.(chip.id)}
                disabled={chip.locked || chip.dimmed}
                hitSlop={ACCOUNT_STRIP_HIT_SLOP}
                accessibilityHint={error}
                startIcon={
                  <AccountColorTile
                    color={chip.tile.color}
                    type={chip.tile.type}
                    size={ACCOUNT_STRIP_TILE}
                    glyphSize={Size.rowGlyph}
                    hollow={chip.tile.hollow}
                  />
                }
                endIcon={
                  chip.locked ? (
                    <MaterialCommunityIcons
                      testID={`account-strip-lock-${chip.id}`}
                      name="lock-outline"
                      size={Size.iconMicro}
                      color={CoreTokens.text2}
                      style={{ marginLeft: 'auto' }}
                    />
                  ) : undefined
                }
                labelNumberOfLines={1}
                labelStyle={{ flexShrink: 1, textAlign: 'left' }}
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
              />
            ))}
          </BottomSheetScrollView>
        )}
        {error !== undefined ? (
          <DangerRing testID="account-strip-ring" radius={ACCOUNT_STRIP_CHIP_RADIUS} />
        ) : null}
      </View>
    </View>
  );
}
