import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Alert, Checkbox, PressableFeedback, SkeletonGroup } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { MonthFilter } from '@/components/ui/month_filter';
import { Sheet, SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import type { BudgetCopyRowVM } from '@/modules/budget/screens/budget/budget.helpers';
import { formatAmount } from '@/utils/format_amount';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

interface BudgetCopySheetProps {
  isOpen: boolean;
  sourceMonth: string;
  targetMonthLabel: string;
  rows: BudgetCopyRowVM[];
  selectedBudgetIds: string[];
  previewLoading: boolean;
  previewError: boolean;
  copyBusy: boolean;
  copyError: boolean;
  onSourceMonthChange: (month: string) => void;
  onOpenChange: (open: boolean) => void;
  onToggleBudget: (budgetId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onRetryPreview: () => void;
  onApply: () => void;
}

function statusLabel(status: BudgetCopyRowVM['status']): string {
  return status === 'new' ? Strings.budgetCopyStatusNew : Strings.budgetCopyStatusWillReplace;
}

export function BudgetCopySheet({
  isOpen,
  sourceMonth,
  targetMonthLabel,
  rows,
  selectedBudgetIds,
  previewLoading,
  previewError,
  copyBusy,
  copyError,
  onSourceMonthChange,
  onOpenChange,
  onToggleBudget,
  onSelectAll,
  onClearSelection,
  onRetryPreview,
  onApply,
}: BudgetCopySheetProps) {
  const selectedCount = selectedBudgetIds.length;
  const canApply = rows.length > 0 && selectedCount > 0 && !previewLoading && !previewError;

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!copyBusy || open) onOpenChange(open);
      }}
      title={Strings.budgetCopyTitle}
      size="md"
      scrollable
      isDismissable={!copyBusy}
      footer={
        <View style={styles.footer}>
          <Button
            variant="secondary"
            className="flex-1"
            label={Strings.budgetCopyCancel}
            accessibilityLabel={Strings.budgetCopyCancel}
            isDisabled={copyBusy}
            onPress={() => onOpenChange(false)}
          />
          <Button
            className="flex-1"
            label={Strings.budgetCopyApply}
            accessibilityLabel={Strings.budgetCopyApply}
            isLoading={copyBusy}
            isDisabled={!canApply || copyBusy}
            onPress={() => {
              if (canApply && !copyBusy) onApply();
            }}
          />
        </View>
      }
    >
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.bodyContent}
      >
        <View style={styles.sourceBlock}>
          <Text style={styles.sourceLabel}>{Strings.budgetCopySourceLabel}</Text>
          <View
            style={[styles.sourceRow, copyBusy && styles.disabledControl]}
            pointerEvents={copyBusy ? 'none' : 'auto'}
            accessibilityState={{ disabled: copyBusy }}
          >
            <View style={styles.sourceFilter}>
              <MonthFilter
                selectedMonth={sourceMonth}
                onSelectedMonthChange={(month) => {
                  if (!copyBusy) onSourceMonthChange(month);
                }}
                showStepButtons={false}
              />
            </View>
            <Text style={styles.routeArrow}>→</Text>
            <Text style={styles.targetMonth}>{targetMonthLabel}</Text>
          </View>
        </View>

        <View style={styles.statusTrack}>
          {previewError ? (
            <Alert status="danger" className="w-full">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{Strings.budgetCopyPreviewError}</Alert.Title>
              </Alert.Content>
              <Button
                variant="secondary"
                size="sm"
                label={Strings.budgetCopyRetry}
                accessibilityLabel={Strings.budgetCopyRetry}
                isDisabled={copyBusy}
                onPress={onRetryPreview}
              />
            </Alert>
          ) : copyError ? (
            <Alert status="danger" className="w-full">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{Strings.budgetCopyError}</Alert.Title>
              </Alert.Content>
            </Alert>
          ) : null}
        </View>

        {previewLoading ? (
          <SkeletonGroup isLoading isSkeletonOnly>
            <View style={styles.list}>
              {[0, 1, 2].map((row) => (
                <SkeletonGroup.Item key={row} style={styles.skeletonRow} />
              ))}
            </View>
          </SkeletonGroup>
        ) : rows.length > 0 && !previewError ? (
          <>
            <View style={styles.actionsRow}>
              <PressableFeedback
                accessibilityRole="button"
                accessibilityLabel={Strings.budgetCopySelectAll}
                isDisabled={copyBusy}
                onPress={onSelectAll}
                style={styles.textAction}
              >
                <Text style={styles.textActionLabel}>{Strings.budgetCopySelectAll}</Text>
              </PressableFeedback>
              <PressableFeedback
                accessibilityRole="button"
                accessibilityLabel={Strings.budgetCopyClear}
                isDisabled={copyBusy}
                onPress={onClearSelection}
                style={styles.textAction}
              >
                <Text style={styles.textActionLabel}>{Strings.budgetCopyClear}</Text>
              </PressableFeedback>
              <Text style={styles.selectedLabel}>{`${selectedCount}/${rows.length}`}</Text>
            </View>

            <View style={styles.list}>
              {rows.map((row) => {
                const selected = selectedBudgetIds.includes(row.id);
                return (
                  <PressableFeedback
                    key={row.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected, disabled: copyBusy }}
                    accessibilityLabel={Strings.budgetCopyToggleA11y(row.name)}
                    isDisabled={copyBusy}
                    onPress={() => onToggleBudget(row.id)}
                    style={styles.row}
                  >
                    <View pointerEvents="none">
                      <Checkbox
                        isSelected={selected}
                        isDisabled={copyBusy}
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
                      <Text style={styles.rowMeta}>
                        {`${row.categoryName} / ${statusLabel(row.status)}`}
                      </Text>
                    </View>
                    <Text style={styles.rowAmount}>{formatAmount(row.amount)}</Text>
                  </PressableFeedback>
                );
              })}
            </View>
          </>
        ) : !previewError ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="content-copy" size={ms(32)} color={Colors.dark.text3} />
            <Text style={styles.emptyTitle}>{Strings.budgetCopyEmptyTitle}</Text>
            <Text style={styles.emptyBody}>{Strings.budgetCopyEmptyBody}</Text>
          </View>
        ) : null}
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
  sourceFilter: {
    flex: 1,
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
  statusTrack: {
    minHeight: Size.statusRailMinHeight,
    justifyContent: 'center',
  },
  skeletonRow: {
    minHeight: ms(54),
    borderRadius: Radius.md,
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
  disabledControl: {
    opacity: 0.45,
  },
});
