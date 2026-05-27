import { PressableFeedback } from 'heroui-native';
import { ActivityIndicator, View } from 'react-native';

import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { GoldTokens } from '@/constants/theme_tokens';

import { CommitmentHeader } from '../components/commitment_header';
import { CurrentCycleCard } from './components/current_cycle_card';
import { DetailHero } from './components/detail_hero';
import { DetailsCard } from './components/details_card';
import { PaySheet } from './components/pay_sheet';
import { PaymentHistory } from './components/payment_history';
import { SkipConfirmSheet } from './components/skip_confirm_sheet';
import { useCommitmentDetail } from './detail.hook';

export default function CommitmentDetailScreen() {
  const { state, confirmSkip, skipPayment, cancelSkip, openPaySheet, goToEdit, goBack } =
    useCommitmentDetail();

  return (
    <Screen edges={['top', 'bottom']}>
      <CommitmentHeader
        title={state.commitment?.name ?? ''}
        onBack={goBack}
        right={
          state.viewState === 'ready' && state.commitment ? (
            <PressableFeedback
              onPress={goToEdit}
              hitSlop={8}
              className="min-w-[44px] items-center justify-center px-1"
            >
              <Text
                className="font-inter text-[15px] font-semibold"
                style={{ color: GoldTokens[500] }}
              >
                {Strings.commitmentsDetailEdit}
              </Text>
            </PressableFeedback>
          ) : undefined
        }
      />

      {state.viewState === 'loading' ? (
        <View style={{ flex: 1 }} className="items-center justify-center">
          <ActivityIndicator color={GoldTokens[500]} />
        </View>
      ) : null}

      {state.viewState === 'notFound' ? (
        <View style={{ flex: 1 }} className="items-center justify-center">
          <Text className="font-inter text-muted text-[15px]">
            {Strings.commitmentsDetailNotFound}
          </Text>
        </View>
      ) : null}

      {state.viewState === 'ready' && state.commitment ? (
        <ScreenScroll
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <DetailHero
            commitment={state.commitment}
            category={state.category}
            payment={state.payment}
            recurrenceLabel={state.recurrenceLabel}
          />
          {state.payment ? (
            <CurrentCycleCard
              payment={state.payment}
              commitment={state.commitment}
              onMarkAsPaid={openPaySheet}
              onSkip={confirmSkip}
            />
          ) : null}
          <DetailsCard
            commitment={state.commitment}
            account={state.account}
            recurrenceLabel={state.recurrenceLabel}
            durationLabel={state.durationLabel}
          />
          <PaymentHistory payments={state.allPayments} commitment={state.commitment} />
        </ScreenScroll>
      ) : null}

      <PaySheet commitment={state.commitment} payment={state.payment} />

      <SkipConfirmSheet
        isOpen={state.skipConfirmVisible}
        onCancel={cancelSkip}
        onConfirm={() => void skipPayment()}
      />
    </Screen>
  );
}
