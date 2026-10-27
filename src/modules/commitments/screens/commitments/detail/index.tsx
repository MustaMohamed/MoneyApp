import { DetailEditAction } from '@/components/ui/detail_edit_action';
import { DetailHero } from '@/components/ui/detail_hero';
import { DetailLoadError } from '@/components/ui/detail_load_error';
import { DetailNotFoundState } from '@/components/ui/detail_not_found_state';
import { DetailNoteCard } from '@/components/ui/detail_note_card';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { StackHeader } from '@/components/ui/stack_header';
import { Strings } from '@/constants/strings';

import { CurrentCycleCard } from './components/current_cycle_card';
import { CommitmentDetailSkeleton } from './components/detail_skeleton';
import { DetailsCard } from './components/details_card';
import { PaySheet } from './components/pay_sheet';
import { PaymentHistory } from './components/payment_history';
import { SkipConfirmSheet } from './components/skip_confirm_sheet';
import { heroEntering } from './detail.anim';
import {
  COMMITMENT_DETAIL_LOAD_ERROR_COPY,
  COMMITMENT_DETAIL_LOAD_ERROR_TEST_ID,
  commitmentDetailShowsEdit,
} from './detail.helpers';
import { useCommitmentDetail } from './detail.hook';

export default function CommitmentDetailScreen() {
  const { state, confirmSkip, skipPayment, cancelSkip, reload, openPaySheet, goToEdit, goBack } =
    useCommitmentDetail();
  const showsBody = commitmentDetailShowsEdit(state.viewState);

  return (
    <Screen edges={['top', 'bottom']}>
      <StackHeader
        title={Strings.commitmentsDetailHeader}
        onBack={goBack}
        right={
          commitmentDetailShowsEdit(state.viewState) ? (
            <DetailEditAction
              accessibilityLabel={Strings.commitmentsDetailEditAccessibility}
              onPress={goToEdit}
            />
          ) : undefined
        }
      />

      {state.viewState === 'loading' ? (
        <CommitmentDetailSkeleton commitmentHint={state.loadingCommitmentHint} />
      ) : null}

      {state.viewState === 'notFound' ? (
        <DetailNotFoundState
          title={Strings.commitmentsDetailNotFoundTitle}
          body={Strings.commitmentsDetailNotFoundBody}
          testID="commitment-detail-not-found"
        />
      ) : null}

      {state.viewState === 'firstLoadError' ? (
        <DetailLoadError
          copy={COMMITMENT_DETAIL_LOAD_ERROR_COPY}
          testID={COMMITMENT_DETAIL_LOAD_ERROR_TEST_ID}
          onRetry={reload}
        />
      ) : null}

      {showsBody && state.commitment && state.today !== undefined && state.hero !== undefined ? (
        <ScreenScroll
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <DetailHero hero={state.hero} testID="commitment-detail-hero" entering={heroEntering} />
          {state.payment ? (
            <CurrentCycleCard
              payment={state.payment}
              today={state.today}
              commitment={state.commitment}
              onMarkAsPaid={openPaySheet}
              onSkip={confirmSkip}
            />
          ) : null}
          <DetailsCard facts={state.facts} />
          <DetailNoteCard note={state.commitment.notes} testID="commitment-detail-note-card" />
          <PaymentHistory
            payments={state.allPayments}
            today={state.today}
            commitment={state.commitment}
          />
        </ScreenScroll>
      ) : null}

      {state.viewState === 'refreshErrorWithData' ? (
        <DetailLoadError
          copy={COMMITMENT_DETAIL_LOAD_ERROR_COPY}
          testID={COMMITMENT_DETAIL_LOAD_ERROR_TEST_ID}
          floating
          onRetry={reload}
        />
      ) : null}

      <PaySheet
        owner={state.owner}
        commitment={state.commitment}
        payment={state.payment}
        today={state.today}
      />

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
