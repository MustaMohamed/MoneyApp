import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, View } from 'react-native';

import { Box } from '@/components/ui/box';
import { SwipeableRow, type SwipeAction } from '@/components/ui/swipeable_row';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Category } from '@/database/entities/category.entity';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import {
  STATUS_COLORS,
  STATUS_ICONS,
  STATUS_LABELS,
  resolveDisplayAmount,
} from '@/screens/commitments/commitment_status';
import { formatShortDate } from '@/utils/format_date';
import { toIconName } from '@/utils/icon_name_guard';

interface CommitmentRowProps {
  payment: CommitmentPayment;
  commitment: Commitment | undefined;
  category: Category | undefined;
  onPress: () => void;
  onSkip: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

export function CommitmentRow({
  payment,
  commitment,
  category,
  onPress,
  onSkip,
  onEdit,
  onDelete,
}: CommitmentRowProps) {
  const statusColor = STATUS_COLORS[payment.status];
  const statusLabel = STATUS_LABELS[payment.status];
  const { amount, showTilde } = resolveDisplayAmount(payment, commitment);
  const formattedAmount = amount != null ? numberFmt.format(amount) : '—';
  const iconBg = category?.color ? `${category.color}2E` : CoreTokens.surfaceEl;

  const actions: SwipeAction[] = [
    {
      key: 'skip',
      label: Strings.swipeSkip,
      icon: 'skip-next-outline',
      variant: 'info',
      onPress: onSkip,
    },
    {
      key: 'edit',
      label: Strings.swipeEdit,
      icon: 'pencil-outline',
      variant: 'neutral',
      onPress: onEdit,
    },
    {
      key: 'delete',
      label: Strings.swipeDelete,
      icon: 'trash-can-outline',
      variant: 'destructive',
      onPress: onDelete,
    },
  ];

  return (
    <SwipeableRow
      rowId={payment.id}
      actions={actions}
      disabled={commitment === undefined}
      accessibilityLabel={`${commitment?.name ?? ''}, ${showTilde ? '~' : ''}${formattedAmount} ${payment.currency}, ${statusLabel}`}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${commitment?.name ?? ''}, ${showTilde ? '~' : ''}${formattedAmount} ${payment.currency}, ${statusLabel}`}
        style={{ flexDirection: 'row', alignItems: 'center' }}
        className="border-separator min-h-[48px] gap-2 border-b px-4 py-2"
      >
        <View
          style={{ backgroundColor: iconBg, width: 36, height: 36 }}
          className="items-center justify-center rounded-md"
        >
          <MaterialCommunityIcons
            name={toIconName(category?.icon, 'tag-outline')}
            size={18}
            color={category?.color ?? CoreTokens.text2}
          />
        </View>
        <Box style={{ flex: 1 }}>
          <Text className="font-inter text-foreground text-[15px] font-medium" numberOfLines={1}>
            {commitment?.name ?? '—'}
          </Text>
          <Text className="font-inter text-muted mt-0.5 text-[11px]" numberOfLines={1}>
            {formatShortDate(payment.due_date)}
          </Text>
        </Box>
        <View style={{ alignItems: 'flex-end' }} className="gap-1">
          <Text className="font-sora text-foreground text-[15px] font-bold">
            {showTilde ? '~' : ''}
            {formattedAmount} {payment.currency}
          </Text>
          <View
            style={{
              backgroundColor: `${statusColor}22`,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            className="gap-0.5 rounded-full px-1.5 py-0.5"
          >
            <MaterialCommunityIcons
              name={STATUS_ICONS[payment.status]}
              size={11}
              color={statusColor}
            />
            <Text className="font-inter text-[10px]" style={{ color: statusColor }}>
              {statusLabel}
            </Text>
          </View>
        </View>
      </Pressable>
    </SwipeableRow>
  );
}
