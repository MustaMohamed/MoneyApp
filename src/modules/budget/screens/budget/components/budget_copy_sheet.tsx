import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Checkbox, PressableFeedback } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Sheet, SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { BudgetCopyRowVM } from '@/modules/budget/screens/budget/budget.helpers';
import { formatAmount } from '@/utils/format_amount';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

interface BudgetCopySheetProps {
  isOpen: boolean;
  sourceMonthLabel: string;
  targetMonthLabel: string;
  rows: BudgetCopyRowVM[];
  selectedCategoryIds: string[];
  sourceMonthPreviousDisabled?: boolean;
  sourceMonthNextDisabled?: boolean;
  onPreviousSourceMonth?: () => void;
  onNextSourceMonth?: () => void;
  onOpenChange: (open: boolean) => void;
  onToggleCategory: (categoryId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onApply: () => void;
}

function statusLabel(status: BudgetCopyRowVM['status']): string {
  return status === 'new' ? Strings.budgetCopyStatusNew : Strings.budgetCopyStatusWillReplace;
}

export function BudgetCopySheet({
  isOpen,
  sourceMonthLabel,
  targetMonthLabel,
  rows,
  selectedCategoryIds,
  sourceMonthPreviousDisabled = false,
  sourceMonthNextDisabled = false,
  onPreviousSourceMonth,
  onNextSourceMonth,
  onOpenChange,
  onToggleCategory,
  onSelectAll,
  onClearSelection,
  onApply,
}: BudgetCopySheetProps) {
  const selectedCount = selectedCategoryIds.length;
  const canApply = rows.length > 0 && selectedCount > 0;

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={Strings.budgetCopyTitle}
      size="md"
      scrollable
      footer={
        <View style={styles.footer}>
          <PressableFeedback
            accessibilityRole="button"
            accessibilityLabel={Strings.budgetCopyClear}
            onPress={onClearSelection}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>{Strings.budgetCopyClear}</Text>
          </PressableFeedback>
          <PressableFeedback
            accessibilityRole="button"
            accessibilityLabel={Strings.budgetCopyApply}
            accessibilityState={{ disabled: !canApply }}
            onPress={() => {
              if (canApply) onApply();
            }}
            style={[styles.primaryButton, !canApply && styles.disabledButton]}
          >
            <Text style={styles.primaryButtonText}>{Strings.budgetCopyApply}</Text>
          </PressableFeedback>
        </View>
      }
    >
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.bodyContent}
      >
        <View style={styles.sourceBlock}>
          <Text style={styles.sourceLabel}>{Strings.budgetCopySourceLabel}</Text>
          <View style={styles.sourceRow}>
            <PressableFeedback
              accessibilityRole="button"
              accessibilityLabel={Strings.budgetCopyPreviousSourceA11y}
              accessibilityState={{ disabled: sourceMonthPreviousDisabled }}
              isDisabled={sourceMonthPreviousDisabled}
              onPress={() => {
                if (!sourceMonthPreviousDisabled) onPreviousSourceMonth?.();
              }}
              style={[styles.sourceButton, sourceMonthPreviousDisabled && styles.disabledSource]}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={ms(18)}
                color={sourceMonthPreviousDisabled ? Colors.dark.text3 : Colors.dark.text1}
              />
            </PressableFeedback>
            <View style={styles.sourcePill}>
              <Text style={styles.sourceMonth}>{sourceMonthLabel}</Text>
            </View>
            <PressableFeedback
              accessibilityRole="button"
              accessibilityLabel={Strings.budgetCopyNextSourceA11y}
              accessibilityState={{ disabled: sourceMonthNextDisabled }}
              isDisabled={sourceMonthNextDisabled}
              onPress={() => {
                if (!sourceMonthNextDisabled) onNextSourceMonth?.();
              }}
              style={[styles.sourceButton, sourceMonthNextDisabled && styles.disabledSource]}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={ms(18)}
                color={sourceMonthNextDisabled ? Colors.dark.text3 : Colors.dark.text1}
              />
            </PressableFeedback>
            <Text style={styles.routeArrow}>→</Text>
            <Text style={styles.targetMonth}>{targetMonthLabel}</Text>
          </View>
        </View>

        {rows.length > 0 ? (
          <>
            <View style={styles.actionsRow}>
              <PressableFeedback
                accessibilityRole="button"
                accessibilityLabel={Strings.budgetCopySelectAll}
                onPress={onSelectAll}
                style={styles.textAction}
              >
                <Text style={styles.textActionLabel}>{Strings.budgetCopySelectAll}</Text>
              </PressableFeedback>
              <Text style={styles.selectedLabel}>{`${selectedCount}/${rows.length}`}</Text>
            </View>

            <View style={styles.list}>
              {rows.map((row) => {
                const selected = selectedCategoryIds.includes(row.categoryId);
                return (
                  <PressableFeedback
                    key={row.categoryId}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`Toggle ${row.name}`}
                    onPress={() => onToggleCategory(row.categoryId)}
                    style={styles.row}
                  >
                    <View pointerEvents="none">
                      <Checkbox
                        isSelected={selected}
                        className="border-accent/70 bg-surface size-5 border"
                      />
                    </View>
                    <View style={[styles.iconBox, { backgroundColor: `${row.color}22` }]}>
                      <MaterialCommunityIcons
                        name={toIconName(row.icon, 'tag-outline')}
                        size={ms(15)}
                        color={row.color}
                      />
                    </View>
                    <View style={styles.rowCenter}>
                      <Text style={styles.rowTitle}>{row.name}</Text>
                      <Text style={styles.rowMeta}>{statusLabel(row.status)}</Text>
                    </View>
                    <Text style={styles.rowAmount}>{formatAmount(row.amount)}</Text>
                  </PressableFeedback>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="content-copy" size={ms(32)} color={Colors.dark.text3} />
            <Text style={styles.emptyTitle}>{Strings.budgetCopyEmptyTitle}</Text>
            <Text style={styles.emptyBody}>{Strings.budgetCopyEmptyBody}</Text>
          </View>
        )}
      </BottomSheetScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  bodyContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: SHEET_FOOTER_CLEARANCE,
  },
  sourceBlock: {
    marginBottom: Spacing.sm,
  },
  sourceLabel: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
    color: Colors.dark.gold,
    marginBottom: Spacing.xs,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sourceButton: {
    width: ms(32),
    height: ms(32),
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.surfaceEl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
  },
  disabledSource: {
    opacity: 0.45,
  },
  sourcePill: {
    minHeight: ms(32),
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.surfaceEl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
  },
  sourceMonth: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.caption,
    color: Colors.dark.text1,
  },
  routeArrow: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  targetMonth: {
    flexShrink: 1,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.caption,
    color: Colors.dark.text1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  textAction: {
    paddingVertical: Spacing.xs,
  },
  textActionLabel: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
    color: Colors.dark.gold,
  },
  selectedLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  list: {
    gap: Spacing.xs,
  },
  row: {
    minHeight: ms(54),
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.dark.surfaceEl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  iconBox: {
    width: ms(30),
    height: ms(30),
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCenter: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  rowMeta: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    marginTop: ms(2),
  },
  rowAmount: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  empty: {
    minHeight: ms(180),
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  emptyTitle: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  emptyBody: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    height: ms(44),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.dark.surfaceEl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
  },
  secondaryButtonText: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  primaryButton: {
    flex: 1,
    height: ms(44),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.dark.gold,
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryButtonText: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.shared.midnightBlue,
  },
});
