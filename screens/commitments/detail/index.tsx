import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import { useCommitmentDetail } from './detail.hook';
import { CurrentCycleCard } from './components/current_cycle_card';
import { DetailsCard } from './components/details_card';
import { DetailHero } from './components/detail_hero';
import { PaymentHistory } from './components/payment_history';

export default function CommitmentDetailScreen() {
  const { state, confirmSkip, skipPayment, cancelSkip, openPaySheet, goToEdit, goBack } =
    useCommitmentDetail();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={Size.iconBack}
            color={Colors.dark.text2}
          />
        </Pressable>
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
            payment={state.currentPayment}
            recurrenceLabel={state.recurrenceLabel}
          />

          {state.currentPayment && (
            <CurrentCycleCard
              payment={state.currentPayment}
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
