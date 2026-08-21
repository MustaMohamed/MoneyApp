import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';

import { Box } from '@/components/ui/box';
import { SwipeableRow, type SwipeAction } from '@/components/ui/swipeable_row';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Category } from '@/database/entities/category.entity';
import { formatShortDate } from '@/utils/format_date';
import { toIconName } from '@/utils/icon_name_guard';

import type { Commitment } from '../../../entities/commitment.entity';
import type { CommitmentPayment } from '../../../entities/commitment_payment.entity';
import {
  STATUS_COLORS,
  STATUS_ICONS,
  STATUS_LABELS,
  formatCommitmentAmount,
  resolveDisplayAmount,
} from '../commitment_status';

interface CommitmentRowProps {
  payment: CommitmentPayment;
  commitment: Commitment | undefined;
  category: Category | undefined;
  onPress: (paymentId: string) => void;
  onSkip: (paymentId: string) => void;
  onEdit: (commitmentId: string | undefined) => void;
  onDelete: (commitmentId: string | undefined) => void;
}

function CommitmentRowComponent({
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
  const { showTilde } = resolveDisplayAmount(payment, commitment);
  const amountText =
    formatCommitmentAmount(payment, commitment) ?? `${showTilde ? '~' : ''}— ${payment.currency}`;
  const iconBg = category?.color ? `${category.color}2E` : CoreTokens.surfaceEl;

  const handlePress = useCallback(() => onPress(payment.id), [onPress, payment.id]);
  const handleSkip = useCallback(() => onSkip(payment.id), [onSkip, payment.id]);
  const handleEdit = useCallback(() => onEdit(commitment?.id), [commitment?.id, onEdit]);
  const handleDelete = useCallback(() => onDelete(commitment?.id), [commitment?.id, onDelete]);
  const actions: SwipeAction[] = useMemo(
    () => [
      {
        key: 'skip',
        label: Strings.swipeSkip,
        icon: 'skip-next-outline',
        variant: 'info',
        onPress: handleSkip,
      },
      {
        key: 'edit',
        label: Strings.swipeEdit,
        icon: 'pencil-outline',
        variant: 'neutral',
        onPress: handleEdit,
      },
      {
        key: 'delete',
        label: Strings.swipeDelete,
        icon: 'trash-can-outline',
        variant: 'destructive',
        onPress: handleDelete,
      },
    ],
    [handleDelete, handleEdit, handleSkip],
  );

  return (
    <SwipeableRow
      rowId={payment.id}
      actions={actions}
      disabled={commitment === undefined}
      accessibilityLabel={`${commitment?.name ?? ''}, ${amountText}, ${statusLabel}`}
    >
      <PressableFeedback
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${commitment?.name ?? ''}, ${amountText}, ${statusLabel}`}
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
          <Text className="font-inter-medium text-foreground text-[15px]" numberOfLines={1}>
            {commitment?.name ?? '—'}
          </Text>
          <Text className="font-inter text-muted mt-0.5 text-[11px]" numberOfLines={1}>
            {formatShortDate(payment.due_date)}
          </Text>
        </Box>
        <View style={{ alignItems: 'flex-end' }} className="gap-1">
          <Text className="font-sora-bold text-foreground text-[15px]">{amountText}</Text>
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
      </PressableFeedback>
    </SwipeableRow>
  );
}

export const CommitmentRow = React.memo(CommitmentRowComponent);
CommitmentRow.displayName = 'CommitmentRow';
