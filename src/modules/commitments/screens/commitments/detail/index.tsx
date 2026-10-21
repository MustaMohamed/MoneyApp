import { View } from 'react-native';

import { HeaderTextAction } from '@/components/ui/header_text_action';
import { LoadingCenter } from '@/components/ui/loading_center';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { StackHeader } from '@/components/ui/stack_header';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

import { CurrentCycleCard } from './components/current_cycle_card';
import { DetailHero } from './components/detail_hero';
import { DetailLoadError } from './components/detail_load_error';
import { DetailsCard } from './components/details_card';
import { PaySheet } from './components/pay_sheet';
import { PaymentHistory } from './components/payment_history';
import { SkipConfirmSheet } from './components/skip_confirm_sheet';
import { useCommitmentDetail } from './detail.hook';

export default function CommitmentDetailScreen() {
  const { state, confirmSkip, skipPayment, cancelSkip, reload, openPaySheet, goToEdit, goBack } =
    useCommitmentDetail();
  const showsBody = state.viewState === 'ready' || state.viewState === 'refreshErrorWithData';

  return (
    <Screen edges={['top', 'bottom']}>
      <StackHeader
        title={state.commitment?.name ?? ''}
        onBack={goBack}
        right={
          state.commitment && state.viewState !== 'loading' ? (
            <HeaderTextAction label={Strings.commitmentsDetailEdit} onPress={goToEdit} />
          ) : undefined
        }
      />

      {state.viewState === 'loading' ? <LoadingCenter /> : null}

      {state.viewState === 'notFound' ? (
        <View style={{ flex: 1 }} className="items-center justify-center">
          <Text className="font-inter text-muted text-[15px]">
            {Strings.commitmentsDetailNotFound}
          </Text>
        </View>
      ) : null}

      {state.viewState === 'firstLoadError' ? <DetailLoadError onRetry={reload} /> : null}

      {showsBody && state.commitment && state.today !== undefined ? (
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
              today={state.today}
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
          <PaymentHistory
            payments={state.allPayments}
            today={state.today}
            commitment={state.commitment}
          />
        </ScreenScroll>
      ) : null}

      {state.viewState === 'refreshErrorWithData' ? (
        <DetailLoadError floating onRetry={reload} />
      ) : null}

      <PaySheet owner={state.owner} commitment={state.commitment} payment={state.payment} />

      <SkipConfirmSheet
        isOpen={state.skipConfirmVisible}
        busy={state.skipBusy}
        errorMessage={state.skipError ? Strings.commitmentsSkipError : undefined}
        onCancel={cancelSkip}
        onConfirm={() => void skipPayment()}
      />
    </Screen>
  );
}
