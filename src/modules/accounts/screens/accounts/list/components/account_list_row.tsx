import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ListGroup, PressableFeedback, Separator, Typography } from 'heroui-native';
import { type AccessibilityActionEvent, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { ACCOUNT_TYPE_ICONS } from '@/constants/account_type_icons';
import { Strings } from '@/constants/strings';
import { Colors, Radius, Size, Type, lineHeightFor } from '@/constants/theme';
import { resolveAccountName } from '@/utils/account_name';
import { formatCurrencyParts } from '@/utils/format_amount';

import { resolveAccountBalanceColorClass } from '../../../../constants/account_balance_color';
import { resolveAccountRowA11yLabel } from '../../../../constants/account_row_a11y_label';
import { resolveAccountTileColors } from '../../../../constants/account_tile_color';
import type { Account } from '../../../../entities/account.entity';
import { type ListDrag, useLiftGesture, useRowShiftStyle } from '../accounts_list.anim';
import {
  ACCOUNTS_LIST_GRIP_HIT_SLOP,
  ACCOUNTS_LIST_ROW_CAPTION_STYLE,
  ACCOUNTS_LIST_ROW_STYLE,
} from '../accounts_list.geometry';
import {
  MOVE_ACTIONS,
  type ReorderDirection,
  resolveMoveActionDirection,
} from '../accounts_list.reorder';

// The grip's own press absorbs a tap, so it never reaches the row and opens the account.
const absorbGripPress = () => undefined;

interface AccountListRowProps {
  account: Account;
  /** The row's live figure line; the a11y label keeps the type label instead. */
  caption: string;
  onPress: (id: string) => void;
  /** Undefined while reorder is off: an empty grip slot and no actions. */
  onMove: ((direction: ReorderDirection) => void) | undefined;
  index: number;
  count: number;
  drag: ListDrag;
  /** Any row on screen is lifted, so every row follows the drag. */
  isLifted: boolean;
  canLift: boolean;
  onLift: (id: string) => void;
  onRelease: (id: string, fromIndex: number, toIndex: number) => void;
  showSeparator: boolean;
}

/** Prefix, content and suffix: the row's own and the lifted copy's. */
export function AccountListRowBody({ account, caption }: { account: Account; caption: string }) {
  // Two nodes, not `formatCurrencyAmount`: B1 stacks the value over the code.
  const { value, code } = formatCurrencyParts(account.current_balance, account.currency);
  const tile = resolveAccountTileColors(account.color);

  return (
    <>
      {/* Runtime hex: className is build-time only. */}
      <ListGroup.ItemPrefix
        style={{
          width: Size.accountTile,
          height: Size.accountTile,
          borderRadius: Radius.sm,
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tile.background,
        }}
      >
        <MaterialCommunityIcons
          name={ACCOUNT_TYPE_ICONS[account.type]}
          size={Size.iconXs}
          color={tile.glyph}
        />
      </ListGroup.ItemPrefix>

      <ListGroup.ItemContent style={{ flex: 1, minWidth: 0 }}>
        <ListGroup.ItemTitle
          className="text-foreground font-inter-medium"
          style={{ fontSize: Type.bodyStrong, lineHeight: lineHeightFor(Type.bodyStrong) }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {resolveAccountName(account)}
        </ListGroup.ItemTitle>

        {/* Not ItemDescription: its muted colour is 2.36:1. */}
        <Typography
          className="text-content-secondary font-inter tabular-nums"
          style={ACCOUNTS_LIST_ROW_CAPTION_STYLE}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {caption}
        </Typography>
      </ListGroup.ItemContent>

      {/* Passing children replaces the slot's default chevron outright. */}
      <ListGroup.ItemSuffix style={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <Typography
          className={`${resolveAccountBalanceColorClass(account.type)} font-sora tabular-nums`}
          style={{
            fontSize: Type.bodyStrong,
            lineHeight: lineHeightFor(Type.bodyStrong),
            textAlign: 'right',
          }}
        >
          {value}
        </Typography>
        <Typography
          className="text-content-secondary font-inter"
          style={[ACCOUNTS_LIST_ROW_CAPTION_STYLE, { textAlign: 'right' }]}
        >
          {code}
        </Typography>
      </ListGroup.ItemSuffix>
    </>
  );
}

export function AccountListRow({
  account,
  caption,
  onPress,
  onMove,
  index,
  count,
  drag,
  isLifted,
  canLift,
  onLift,
  onRelease,
  showSeparator,
}: AccountListRowProps) {
  const onMoveAction =
    onMove === undefined
      ? undefined
      : (event: AccessibilityActionEvent) => {
          const direction = resolveMoveActionDirection(event.nativeEvent.actionName);
          if (direction !== undefined) onMove(direction);
        };
  const moveActions = onMove === undefined ? undefined : MOVE_ACTIONS;
  const { gesture, onLayout } = useLiftGesture({
    drag,
    id: account.id,
    index,
    count,
    enabled: canLift,
    onLift,
    onRelease,
  });
  const shiftStyle = useRowShiftStyle({ drag, index, isLifted });

  // The item stays mounted through a lift: a GestureDetector drops its handler when its element unmounts.
  return (
    <Animated.View style={shiftStyle} onLayout={onLayout}>
      {showSeparator ? <Separator thickness={Size.hairline} /> : null}
      <ListGroup.Item
        onPress={() => onPress(account.id)}
        style={ACCOUNTS_LIST_ROW_STYLE}
        accessibilityRole="button"
        accessibilityLabel={resolveAccountRowA11yLabel(account)}
        // The item is one focus stop on iOS and swallows the grip, so it carries the moves too.
        accessibilityActions={moveActions}
        onAccessibilityAction={onMoveAction}
      >
        <AccountListRowBody account={account} caption={caption} />

        {onMoveAction === undefined ? (
          <View style={{ width: Size.reorderGripSlot }} />
        ) : (
          <GestureDetector gesture={gesture}>
            <PressableFeedback
              animation={false}
              onPress={absorbGripPress}
              hitSlop={ACCOUNTS_LIST_GRIP_HIT_SLOP}
              style={{ width: Size.reorderGripSlot, alignItems: 'center' }}
              accessibilityRole="button"
              accessibilityLabel={Strings.accountsReorderGrip(resolveAccountName(account))}
              accessibilityActions={moveActions}
              onAccessibilityAction={onMoveAction}
            >
              {/* `Colors.dark.text3` is the canvas `--muted`. */}
              <MaterialCommunityIcons
                name="drag-vertical"
                size={Size.reorderGripSlot}
                color={Colors.dark.text3}
              />
            </PressableFeedback>
          </GestureDetector>
        )}
      </ListGroup.Item>
    </Animated.View>
  );
}
