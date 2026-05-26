import { ScrollView, View } from 'react-native';

import { SelectablePill } from '@/components/ui/chip';
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
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- labelKey values are hardcoded Strings keys; always defined
          const label = Strings[c.labelKey] as string;
          return (
            <SelectablePill
              key={c.key}
              label={label}
              selected={active === c.key}
              onPress={() => onChange(c.key)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}
