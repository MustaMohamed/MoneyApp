import { Card } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { BudgetGroup } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { BucketStatus, BucketVM } from '@/screens/budget/budget_buckets.helpers';
import { ms } from '@/utils/responsive';

export interface BucketCardProps {
  vm: BucketVM;
  currency?: string;
}

const BUCKET_LABELS: Record<BudgetGroup, string> = {
  [BudgetGroup.Need]: Strings.budget5030NeedLabel,
  [BudgetGroup.Want]: Strings.budget5030WantLabel,
  [BudgetGroup.Savings]: Strings.budget5030SavingsLabel,
};

const BUCKET_PCTS: Record<BudgetGroup, string> = {
  [BudgetGroup.Need]: Strings.budget5030NeedPct,
  [BudgetGroup.Want]: Strings.budget5030WantPct,
  [BudgetGroup.Savings]: Strings.budget5030SavingsPct,
};

const STATUS_LABELS: Record<BucketStatus, string> = {
  'on-track': Strings.budget5030StatusOnTrack,
  over: Strings.budget5030StatusOver,
  ahead: Strings.budget5030StatusAhead,
  behind: Strings.budget5030StatusBehind,
};

const STATUS_TEXT_COLORS: Record<BucketStatus, string> = {
  'on-track': Colors.dark.positive,
  over: Colors.dark.negative,
  ahead: Colors.dark.positive,
  behind: Colors.dark.warning,
};

const STATUS_BG_COLORS: Record<BucketStatus, string> = {
  'on-track': 'rgba(76, 175, 130, 0.12)',
  over: Colors.dark.dangerBg,
  ahead: 'rgba(76, 175, 130, 0.12)',
  behind: Colors.dark.warningBg,
};

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(Math.round(amount))}`;
}

export function BucketCard({ vm, currency = 'EGP' }: BucketCardProps) {
  const { group, target, allocated, spent, barPct, spendFillPct, status } = vm;

  const label = BUCKET_LABELS[group];
  const pctLabel = BUCKET_PCTS[group];
  const statusLabel = STATUS_LABELS[status];
  const statusTextColor = STATUS_TEXT_COLORS[status];
  const statusBgColor = STATUS_BG_COLORS[status];

  const allocatedPct = target > 0 ? Math.round((allocated / target) * 100) : 0;
  const spentPct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

  return (
    <Card className="mb-3 rounded-xl p-0" style={{ elevation: 0, shadowOpacity: 0 }}>
      <Card.Body className="gap-0 p-4">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: Spacing.sm,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
            <Text
              style={{
                fontFamily: FontFamily.soraBold,
                fontSize: Type.body,
                color: Colors.dark.text1,
              }}
            >
              {label}
            </Text>
            <Text
              style={{
                fontFamily: FontFamily.interRegular,
                fontSize: Type.micro,
                color: Colors.dark.text2,
              }}
            >
              {pctLabel}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: statusBgColor,
              paddingHorizontal: Spacing.xs,
              paddingVertical: ms(3),
              borderRadius: Radius.pill,
            }}
          >
            <Text
              style={{
                fontFamily: FontFamily.interSemi,
                fontSize: Type.micro,
                color: statusTextColor,
              }}
            >
              {statusLabel}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: Spacing.sm,
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: FontFamily.interRegular,
                fontSize: Type.micro,
                color: Colors.dark.text2,
                marginBottom: ms(2),
              }}
            >
              {Strings.budget5030AllocatedLabel}
            </Text>
            <Text
              style={{
                fontFamily: FontFamily.soraBold,
                fontSize: Type.body,
                color: Colors.dark.text1,
              }}
            >
              {formatAmount(allocated, currency)}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontFamily: FontFamily.interRegular,
                fontSize: Type.micro,
                color: Colors.dark.text2,
                marginBottom: ms(2),
              }}
            >
              {Strings.budget5030TargetLabel}
            </Text>
            <Text
              style={{
                fontFamily: FontFamily.soraBold,
                fontSize: Type.body,
                color: Colors.dark.text1,
              }}
            >
              {formatAmount(target, currency)}
            </Text>
          </View>
        </View>

        <View
          style={{
            height: ms(8),
            backgroundColor: Colors.dark.surfaceEl,
            borderRadius: Radius.sm,
            overflow: 'hidden',
            marginBottom: ms(4),
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${barPct * 100}%`,
              backgroundColor: Colors.dark.border,
              borderRadius: Radius.sm,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${spendFillPct * 100}%`,
                backgroundColor: statusTextColor,
                borderRadius: Radius.sm,
              }}
            />
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: group === BudgetGroup.Savings ? Spacing.sm : 0,
          }}
        >
          <Text
            style={{
              fontFamily: FontFamily.interRegular,
              fontSize: Type.micro,
              color: Colors.dark.text2,
            }}
          >
            {`${allocatedPct}% ${Strings.budget5030AllocatedLabel.toLowerCase()}`}
          </Text>

          {allocated > 0 && (
            <Text
              style={{
                fontFamily: FontFamily.interRegular,
                fontSize: Type.micro,
                color: Colors.dark.text2,
              }}
            >
              {`${spentPct}% ${Strings.budgetSummarySpent.toLowerCase()}`}
            </Text>
          )}
        </View>

        {group === BudgetGroup.Savings && (
          <Text
            style={{
              fontFamily: FontFamily.interRegular,
              fontSize: Type.micro,
              color: Colors.dark.text2,
              fontStyle: 'italic',
            }}
          >
            {Strings.budget5030SavingsCaption}
          </Text>
        )}
      </Card.Body>
    </Card>
  );
}
