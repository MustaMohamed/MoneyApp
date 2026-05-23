import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';

import type { CommitmentStatusFilter } from '../commitments.state';

interface Props {
  active: CommitmentStatusFilter;
  onChange: (f: CommitmentStatusFilter) => void;
}

const CHIPS: { key: CommitmentStatusFilter; labelKey: keyof typeof Strings }[] = [
  { key: 'all', labelKey: 'filterAll' },
  { key: CommitmentPaymentStatus.Overdue, labelKey: 'commitmentsStatusOverdue' },
  { key: CommitmentPaymentStatus.Due, labelKey: 'commitmentsStatusDue' },
  { key: CommitmentPaymentStatus.Upcoming, labelKey: 'commitmentsStatusUpcoming' },
  { key: CommitmentPaymentStatus.Paid, labelKey: 'commitmentsStatusPaid' },
  { key: CommitmentPaymentStatus.Skipped, labelKey: 'commitmentsStatusSkipped' },
];

export function StatusFilterChips({ active, onChange }: Props) {
  return (
    <View className="py-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-4"
      >
        {CHIPS.map((c) => {
          const isActive = active === c.key;
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- labelKey values are hardcoded Strings keys; always defined
          const label = Strings[c.labelKey] as string;
          return (
            <Pressable
              key={c.key}
              onPress={() => onChange(c.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={label}
              className={
                isActive
                  ? 'border-accent/50 bg-accent/15 rounded-full border px-3 py-1'
                  : 'bg-default/40 border-border rounded-full border px-3 py-1'
              }
            >
              <Text
                className={
                  isActive
                    ? 'font-inter text-accent text-[11px] font-semibold'
                    : 'font-inter text-foreground/65 text-[11px] font-medium'
                }
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
