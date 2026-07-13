import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, Chip, PressableFeedback } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, TouchSize, Type } from '@/constants/theme';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import { SpendingPlanAllocationChip } from '@/modules/budget/screens/budget/components/spending_plan_allocation_chip';
import { SpendingPlanCategoryChip } from '@/modules/budget/screens/budget/components/spending_plan_category_chip';
import type { SpendingPlanRowVM } from '@/modules/budget/screens/budget/spending_plans.helpers';

interface SpendingPlanCardProps {
  row: SpendingPlanRowVM;
  onOpenDetails: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (plan: { id: string; name: string }) => void;
}

export function SpendingPlanCard({ row, onOpenDetails, onEdit, onDelete }: SpendingPlanCardProps) {
  return (
    <Card variant="default" style={styles.card}>
      <PressableFeedback
        accessibilityRole="button"
        accessibilityLabel={row.card.openDetailsAccessibilityLabel}
        animation={false}
        onPress={() => onOpenDetails(row.id)}
        style={styles.detailsSurface}
      >
        <PressableFeedback.Highlight />
      </PressableFeedback>

      <Card.Header pointerEvents="none" style={styles.header}>
        <View style={styles.titleWrap}>
          <View style={styles.titleRow}>
            <View style={styles.detailsCopy}>
              <Card.Title style={styles.title} numberOfLines={1}>
                {row.name}
              </Card.Title>
              <Card.Description style={styles.meta}>{row.card.dateLabel}</Card.Description>
            </View>
            <Chip
              size="sm"
              variant="soft"
              color={row.card.statusTone}
              animation="disable-all"
              accessibilityRole="text"
              accessibilityLabel={row.card.statusLabel}
              style={styles.statusChip}
            >
              <Chip.Label style={styles.statusLabel}>{row.card.statusLabel}</Chip.Label>
            </Chip>
          </View>
        </View>
        <View
          accessible
          accessibilityRole="text"
          accessibilityLabel={row.card.balanceAccessibilityLabel}
          style={styles.amountWrap}
        >
          <Text style={[styles.amount, { color: row.card.balanceColor }]}>
            {row.card.balanceAmountLabel}
          </Text>
          <Text style={styles.amountSub}>{row.card.balanceMetaLabel}</Text>
        </View>
      </Card.Header>

      <Card.Body pointerEvents="none" style={styles.body}>
        <View style={styles.moneyLine}>
          <Text style={styles.spent}>{row.card.spentLabel}</Text>
          <Text style={styles.percentage}>{row.card.percentageLabel}</Text>
        </View>

        <View style={styles.progressWrap}>
          <BudgetBar
            pct={row.pct}
            status={row.card.progressStatus}
            color={row.card.progressColor}
            height={Spacing.xxs}
          />
          {row.card.elapsedMarkerPercentage !== undefined &&
          row.card.elapsedMarkerColor !== undefined ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              pointerEvents="none"
              style={[
                styles.elapsedMarker,
                {
                  left: `${row.card.elapsedMarkerPercentage}%`,
                  backgroundColor: row.card.elapsedMarkerColor,
                },
              ]}
            />
          ) : null}
        </View>

        {row.card.paceLabel === undefined ? null : (
          <Text style={styles.pace}>{row.card.paceLabel}</Text>
        )}

        <View style={styles.chips}>
          {row.card.chips.map((chip) => {
            if (chip.type === 'allocation') {
              return <SpendingPlanAllocationChip key={chip.id} allocation={chip.allocation} />;
            }
            if (chip.type === 'category') {
              return <SpendingPlanCategoryChip key={chip.id} category={chip.category} />;
            }
            return (
              <Chip
                key={chip.id}
                size="sm"
                variant="secondary"
                color="default"
                animation="disable-all"
                accessibilityRole="text"
                accessibilityLabel={chip.accessibilityLabel}
                style={styles.moreChip}
              >
                <Chip.Label style={styles.moreChipLabel}>{chip.label}</Chip.Label>
              </Chip>
            );
          })}
        </View>
      </Card.Body>

      <Card.Footer pointerEvents="box-none" style={styles.footer}>
        {row.card.allocationFooterLabel === undefined ? (
          <View pointerEvents="none" style={styles.footerSpacer} />
        ) : (
          <Text pointerEvents="none" style={styles.allocationFooter} numberOfLines={1}>
            {row.card.allocationFooterLabel}
          </Text>
        )}
        <View style={styles.actions}>
          <PressableFeedback
            accessibilityRole="button"
            accessibilityLabel={`${Strings.budgetPlanEditTitle} ${row.name}`}
            onPress={() => onEdit(row.id)}
            style={styles.iconButton}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={Size.iconXs}
              color={Colors.dark.text2}
            />
          </PressableFeedback>
          <PressableFeedback
            accessibilityRole="button"
            accessibilityLabel={`${Strings.budgetPlansRemoveA11y} ${row.name}`}
            onPress={() => onDelete({ id: row.id, name: row.name })}
            style={styles.iconButton}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={Size.iconXs}
              color={Colors.dark.text2}
            />
          </PressableFeedback>
        </View>
      </Card.Footer>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: Size.hairline,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    overflow: 'hidden',
  },
  detailsSurface: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: Radius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  titleWrap: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailsCopy: {
    minHeight: TouchSize.min,
    flex: 1,
    flexShrink: 1,
    justifyContent: 'center',
  },
  title: {
    flexShrink: 1,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  statusChip: {
    minHeight: Size.checkCircle,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 0,
  },
  statusLabel: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
  },
  meta: {
    marginTop: Spacing.xxxs,
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  amountWrap: { alignItems: 'flex-end' },
  amount: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
  },
  amountSub: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  body: {
    marginTop: Spacing.xs,
  },
  moneyLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  spent: {
    flexShrink: 1,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text1,
  },
  percentage: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  progressWrap: {
    position: 'relative',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  elapsedMarker: {
    position: 'absolute',
    top: -Spacing.xxxs,
    width: Spacing.xxxs,
    height: Size.progressTrack,
    borderRadius: Radius.sm,
    transform: [{ translateX: -Spacing.xxxs }],
  },
  pace: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xxs,
    marginTop: Spacing.xs,
  },
  moreChip: {
    minHeight: Spacing.xl,
    borderRadius: Radius.xl,
    backgroundColor: Colors.dark.bg,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 0,
  },
  moreChipLabel: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
    color: Colors.dark.text1,
  },
  allocationFooter: {
    flex: 1,
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  footerSpacer: { flex: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    borderTopWidth: Size.hairline,
    borderTopColor: Colors.dark.border,
    paddingTop: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  iconButton: {
    width: Spacing.xl,
    height: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
