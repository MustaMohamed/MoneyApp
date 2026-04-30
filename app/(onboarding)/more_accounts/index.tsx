import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { type EntryOrExitLayoutType } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressDots } from '@/components/progress_dots';
import { Strings } from '@/constants/strings';
import { FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { type Account, type AccountType } from '@/store/account.store';
import { useMoreAccounts } from './more_accounts.hook';
import { useMoreAccountsAnim } from './more_accounts.anim';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TYPE_ICONS: Record<AccountType, IconName> = {
  bank: 'bank',
  smart_wallet: 'cellphone-nfc',
  physical_wallet: 'wallet',
  physical_savings: 'piggy-bank',
  credit_card: 'credit-card',
};

const TYPE_LABELS: Record<AccountType, string> = {
  bank: Strings.typeBank,
  smart_wallet: Strings.typeSmartWallet,
  physical_wallet: Strings.typePhysicalWallet,
  physical_savings: Strings.typePhysicalSavings,
  credit_card: Strings.typeCreditCard,
};

export default function MoreAccountsScreen() {
  const { accounts, initialCount, handleAddAnother, handleDone } = useMoreAccounts();
  const { rowEntering } = useMoreAccountsAnim();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>{Strings.o5Title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ProgressDots totalSteps={6} currentStep={5} />

      <Text style={styles.subtitle}>
        {accounts.length}
        {Strings.o5SubtitleSuffix}
      </Text>

      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <AccountRow
            account={item}
            index={index}
            entering={rowEntering(index, index < initialCount)}
          />
        )}
        ListFooterComponent={
          <Pressable onPress={handleAddAnother} style={styles.addAnother}>
            <View style={styles.addAnotherPlus}>
              <Text style={styles.addAnotherPlusText}>+</Text>
            </View>
            <Text style={styles.addAnotherLabel}>{Strings.o5AddAnother}</Text>
          </Pressable>
        }
      />

      <Text style={styles.hint}>{Strings.o5SettingsHint}</Text>

      <View style={styles.ctaBar}>
        <Pressable onPress={handleDone} style={styles.ctaPress}>
          <LinearGradient
            colors={['#C9973A', '#D4A44C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>{Strings.o5Cta}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function AccountRow({
  account,
  index,
  entering,
}: {
  account: Account;
  index: number;
  entering: EntryOrExitLayoutType | undefined;
}) {
  const isFirst = index === 0;
  const icon = TYPE_ICONS[account.type];
  const typeLabel = `${TYPE_LABELS[account.type]} · ${account.currency}`;
  const formattedBalance = new Intl.NumberFormat('en-US').format(account.opening_balance);

  return (
    <Animated.View entering={entering} style={styles.row}>
      <View
        style={[
          styles.iconContainer,
          isFirst ? styles.iconContainerActive : styles.iconContainerInactive,
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={Size.iconBack}
          color={isFirst ? '#C9973A' : '#6B7F99'}
        />
      </View>

      <View style={styles.rowMiddle}>
        <Text style={styles.rowName} numberOfLines={1}>
          {account.name}
        </Text>
        <Text style={styles.rowType}>{typeLabel}</Text>
      </View>

      <Text
        style={[
          styles.rowBalance,
          { color: account.type === 'credit_card' ? '#E05A42' : '#4CAF82' },
        ]}
      >
        {formattedBalance}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F1923' },
  header: {
    height: Size.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  headerSpacer: {
    width: Size.backBtn,
    height: Size.backBtn,
  },
  headerTitle: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: '#F0EBE3',
  },
  subtitle: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: '#6B7F99',
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    lineHeight: Math.round(Type.body * 1.4),
  },
  listContent: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: '#1A2535',
    borderWidth: 1,
    borderColor: '#2A3A4F',
  },
  iconContainer: {
    width: Size.typeIconBox,
    height: Size.typeIconBox,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: '#1B2B4B',
    borderColor: '#C9973A',
  },
  iconContainerInactive: {
    backgroundColor: '#1A2535',
    borderColor: '#2A3A4F',
  },
  rowMiddle: {
    flex: 1,
    gap: Spacing.xxs,
  },
  rowName: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: '#F0EBE3',
  },
  rowType: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: '#6B7F99',
  },
  rowBalance: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: '#4CAF82',
    marginLeft: 'auto',
  },
  addAnother: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#2A3A4F',
  },
  addAnotherPlus: {
    width: Size.iconLg,
    height: Size.iconLg,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(201,151,58,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAnotherPlusText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.headline,
    color: '#C9973A',
    lineHeight: Math.round(Type.headline * 1.1),
  },
  addAnotherLabel: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: '#6B7F99',
  },
  hint: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: '#4A5568',
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xxs,
  },
  ctaBar: {
    borderTopWidth: 1,
    borderTopColor: '#1A2535',
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  ctaPress: {
    width: '100%',
    borderRadius: Radius.cta,
    overflow: 'hidden',
  },
  cta: {
    height: Size.ctaHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.cta,
  },
  ctaText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: '#1B2B4B',
  },
});
