import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/back_button';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import { CurrentCycleCard } from './components/current_cycle_card';
import { DetailHero } from './components/detail_hero';
import { DetailsCard } from './components/details_card';
import { PaySheet } from './components/pay_sheet';
import { PaymentHistory } from './components/payment_history';
import { SkipConfirmDialog } from './components/skip_confirm_dialog';
import { useCommitmentDetail } from './detail.hook';

export default function CommitmentDetailScreen() {
  const { state, confirmSkip, skipPayment, cancelSkip, openPaySheet, goToEdit, goBack } =
    useCommitmentDetail();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackButton onPress={goBack} />
        <Text style={styles.title}>{state.commitment?.name ?? ''}</Text>
        {state.viewState === 'ready' && state.commitment ? (
          <Pressable onPress={goToEdit} style={styles.editBtn} hitSlop={8}>
            <Text style={styles.editText}>{Strings.commitmentsDetailEdit}</Text>
          </Pressable>
        ) : (
          <View style={styles.editBtn} />
        )}
      </View>

      {state.viewState === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.shared.cairoGold} />
        </View>
      )}

      {state.viewState === 'notFound' && (
        <View style={styles.center}>
          <Text style={styles.notFoundText}>{Strings.commitmentsDetailNotFound}</Text>
        </View>
      )}

      {state.viewState === 'ready' && state.commitment && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <DetailHero
            commitment={state.commitment}
            category={state.category}
            payment={state.payment}
            recurrenceLabel={state.recurrenceLabel}
          />

          {state.payment && (
            <CurrentCycleCard
              payment={state.payment}
              commitment={state.commitment}
              onMarkAsPaid={openPaySheet}
              onSkip={confirmSkip}
            />
          )}

          <DetailsCard
            commitment={state.commitment}
            account={state.account}
            recurrenceLabel={state.recurrenceLabel}
            durationLabel={state.durationLabel}
          />

          <PaymentHistory payments={state.allPayments} commitment={state.commitment} />

          <View style={styles.bottomPad} />
        </ScrollView>
      )}

      <PaySheet commitment={state.commitment} payment={state.payment} />

      <SkipConfirmDialog
        visible={state.skipConfirmVisible}
        onCancel={cancelSkip}
        onConfirm={skipPayment}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    height: Size.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backBtn: {
    width: Size.backBtn,
    height: Size.backBtn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    minWidth: Size.backBtn,
    height: Size.backBtn,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(4),
  },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.title,
    color: Colors.dark.text1,
    flex: 1,
    textAlign: 'center',
  },
  editText: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.gold,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  scroll: { paddingBottom: ms(40) },
  bottomPad: { height: ms(16) },
});
