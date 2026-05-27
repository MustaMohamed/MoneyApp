import { Card } from 'heroui-native';
import { FlatList } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

import type { Commitment } from '../../../../entities/commitment.entity';
import type { CommitmentPayment } from '../../../../entities/commitment_payment.entity';
import { historyEntering } from '../detail.anim';
import { PaymentRow } from './payment_row';

interface Props {
  payments: CommitmentPayment[];
  commitment: Commitment;
}

export function PaymentHistory({ payments, commitment }: Props) {
  if (payments.length === 0) return null;

  return (
    <Animated.View entering={historyEntering} className="mx-4 mt-4">
      <Text className="font-inter text-muted mb-1 text-[11px] tracking-wide uppercase">
        {Strings.commitmentsDetailPaymentHistory}
      </Text>
      <Card className="bg-surface rounded-2xl px-3">
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
      </Card>
    </Animated.View>
  );
}
