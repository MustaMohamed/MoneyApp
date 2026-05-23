import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { Account } from '@/database/entities/account.entity';
import type { Commitment } from '@/database/entities/commitment.entity';
import { formatLongDate } from '@/utils/format_date';
import { ms, msFont } from '@/utils/responsive';

import { cardEntering } from '../detail.anim';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface RowProps {
  icon: IconName;
  label: string;
  value: string;
  showDivider?: boolean;
}

function InfoRow({ icon, label, value, showDivider = true }: RowProps) {
  return (
    <View style={[styles.row, !showDivider && styles.noDivider]}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name={icon} size={ms(16)} color={Colors.dark.text2} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

interface Props {
  commitment: Commitment;
  account: Account | undefined;
  recurrenceLabel: string;
  durationLabel: string;
}

export function DetailsCard({ commitment, account, recurrenceLabel, durationLabel }: Props) {
  const hasNotes = commitment.notes != null;
  const rows: { icon: IconName; label: string; value: string }[] = [
    {
      icon: 'repeat',
      label: Strings.commitmentsDetailRecurrence,
      value: recurrenceLabel,
    },
    {
      icon: 'calendar-start',
      label: Strings.commitmentsDetailStartDate,
      value: formatLongDate(commitment.start_date),
    },
    {
      icon: 'bank-outline',
      label: Strings.commitmentsDetailDefaultAccount,
      value: account?.name ?? Strings.commitmentsDetailNone,
    },
    {
      icon: 'timer-sand',
      label: Strings.commitmentsDetailDuration,
      value: durationLabel,
    },
    {
      icon: 'currency-usd',
      label: Strings.commitmentsDetailCurrency,
      value: commitment.currency,
    },
  ];

  return (
    <Animated.View entering={cardEntering} style={styles.wrap}>
      <View style={styles.card}>
        {rows.map((row, i) => (
          <InfoRow
            key={row.label}
            icon={row.icon}
            label={row.label}
            value={row.value}
            showDivider={hasNotes || i < rows.length - 1}
          />
        ))}
        {hasNotes && (
          <InfoRow
            icon="text"
            label={Strings.commitmentsDetailNotes}
            value={commitment.notes!}
            showDivider={false}
          />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  noDivider: { borderBottomWidth: 0 },
  iconBox: {
    width: ms(32),
    height: ms(32),
    borderRadius: Radius.sm,
    backgroundColor: Colors.dark.surfaceEl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1 },
  rowLabel: {
    fontFamily: FontFamily.interSemi,
    fontSize: msFont(11),
    color: Colors.dark.text2,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  rowValue: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
});
