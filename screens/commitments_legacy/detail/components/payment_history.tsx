import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { msFont } from '@/utils/responsive';

import { historyEntering } from '../detail.anim';
import { PaymentRow } from './payment_row';

interface Props {
  payments: CommitmentPayment[];
  commitment: Commitment;
}

export function PaymentHistory({ payments, commitment }: Props) {
  if (payments.length === 0) return null;

  return (
    <Animated.View entering={historyEntering} style={styles.wrap}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{Strings.commitmentsDetailPaymentHistory}</Text>
      </View>
      <View style={styles.card}>
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item, index }) => (
            <PaymentRow
              payment={item}
              commitment={commitment}
              showDivider={index < payments.length - 1}
            />
          )}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionHeader: {
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: FontFamily.interSemi,
    fontSize: msFont(11),
    color: Colors.dark.text2,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
  },
});
