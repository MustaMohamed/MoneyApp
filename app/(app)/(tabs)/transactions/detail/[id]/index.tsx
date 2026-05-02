import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { EditTransactionSheet } from '../../transaction_form';

import { ActionRow } from '../components/action_row';
import { DeleteConfirmDialog } from '../components/delete_confirm_dialog';
import { DetailHero } from '../components/detail_hero';
import { DetailRow } from '../components/detail_row';
import { DetailRowsCard } from '../components/detail_rows_card';
import { NotFoundState } from '../components/not_found_state';
import { useTransactionDetail } from '../detail.hook';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useTransactionDetail(id);
  const [editVisible, setEditVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={Size.iconBack}
            color={Colors.dark.text2}
          />
        </Pressable>
        <Text style={styles.title}>{Strings.detailHeader}</Text>
        <View style={styles.backBtn} />
      </View>

      {d.state === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.shared.cairoGold} />
        </View>
      )}

      {d.state === 'notFound' && <NotFoundState />}

      {d.state === 'ready' && d.tx && d.derived && (
        <>
          <ScrollView contentContainerStyle={styles.scroll}>
            <DetailHero
              tx={d.tx}
              category={d.derived.category}
              amountText={d.derived.amountText}
              title={d.derived.title}
              dateTimeText={d.derived.dateTimeText}
            />

            <DetailRowsCard>
              <DetailRow
                icon="shape"
                label={Strings.detailCategory}
                value={d.derived.categoryLabel}
                badge={d.derived.categoryBadge}
              />
              <DetailRow
                icon="card-bulleted-outline"
                label={Strings.detailAccount}
                value={d.derived.accountLabel}
                sublabel={d.derived.accountTypeLabel}
              />
              <DetailRow
                icon="calendar"
                label={Strings.detailDateTime}
                value={d.derived.dateTimeText}
              />
              {d.derived.exchangeRateText && (
                <DetailRow
                  icon="earth"
                  label={Strings.detailExchangeRate}
                  value={d.derived.exchangeRateText}
                  badge={Strings.capturedBadge}
                />
              )}
              <DetailRow
                icon="text"
                label={Strings.detailNote}
                value={d.derived.noteText}
                muted={!d.tx.note}
                showDivider={false}
              />
            </DetailRowsCard>

            <ActionRow onEdit={() => setEditVisible(true)} onDelete={d.openDeleteConfirm} />
          </ScrollView>

          <DeleteConfirmDialog
            visible={d.confirmVisible}
            busy={d.deleting}
            onCancel={d.closeDeleteConfirm}
            onConfirm={d.confirmDelete}
          />

          <EditTransactionSheet
            visible={editVisible}
            tx={d.tx ?? null}
            onClose={() => {
              setEditVisible(false);
              d.reload();
            }}
          />
        </>
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
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.title,
    color: Colors.dark.text1,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: ms(40) },
});
