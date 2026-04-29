import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MockStatusBar } from '@/components/MockStatusBar';
import { ProgressDots } from '@/components/ProgressDots';
import { Strings } from '@/constants/strings';
import { type Account, type AccountType, useAccountStore } from '@/store/accountStore';
import { useOnboardingStore } from '@/store/onboardingStore';

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
  const router = useRouter();
  const accounts = useAccountStore((s) => s.accounts);
  const setStep = useOnboardingStore((s) => s.setStep);

  // Track previous accounts length so the row stagger only plays for the
  // initial mount snapshot. Newly added rows (returning from O4) get an
  // immediate FadeInRight without the index*80 stagger delay.
  const initialCountRef = useRef<number | null>(null);
  if (initialCountRef.current === null) {
    initialCountRef.current = accounts.length;
  }
  const initialCount = initialCountRef.current;

  useFocusEffect(
    useCallback(() => {
      useAccountStore.getState().loadAccounts();
    }, []),
  );

  const handleAddAnother = () => {
    router.push({
      pathname: '/(onboarding)/add-account',
      params: { isAddingMore: 'true' },
    });
  };

  const handleDone = async () => {
    await setStep('O6');
    router.push('/(onboarding)/ready');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <MockStatusBar />

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
          <AccountRow account={item} index={index} isInitialMount={index < initialCount} />
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
  isInitialMount,
}: {
  account: Account;
  index: number;
  isInitialMount: boolean;
}) {
  const isFirst = index === 0;
  const icon = TYPE_ICONS[account.type];
  const typeLabel = `${TYPE_LABELS[account.type]} · ${account.currency}`;
  const formattedBalance = new Intl.NumberFormat('en-US').format(account.opening_balance);

  const entering = isInitialMount
    ? FadeInRight.delay(index * 80).duration(300)
    : FadeInRight.duration(250);

  return (
    <Animated.View entering={entering} style={styles.row}>
      <View
        style={[
          styles.iconContainer,
          isFirst ? styles.iconContainerActive : styles.iconContainerInactive,
        ]}
      >
        <MaterialCommunityIcons name={icon} size={14} color={isFirst ? '#C9973A' : '#6B7F99'} />
      </View>

      <View style={styles.rowMiddle}>
        <Text style={styles.rowName} numberOfLines={1}>
          {account.name}
        </Text>
        <Text style={styles.rowType}>{typeLabel}</Text>
      </View>

      <Text style={styles.rowBalance}>{formattedBalance}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F1923' },
  header: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerSpacer: {
    width: 26,
    height: 26,
  },
  headerTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 12,
    color: '#F0EBE3',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: '#6B7F99',
    paddingTop: 6,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
    paddingHorizontal: 9,
    borderRadius: 9,
    backgroundColor: '#1A2535',
    borderWidth: 1,
    borderColor: '#2A3A4F',
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
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
    gap: 2,
  },
  rowName: {
    fontFamily: 'Sora_700Bold',
    fontSize: 10,
    color: '#F0EBE3',
  },
  rowType: {
    fontFamily: 'Inter_400Regular',
    fontSize: 8,
    color: '#6B7F99',
  },
  rowBalance: {
    fontFamily: 'Sora_700Bold',
    fontSize: 10,
    color: '#4CAF82',
    marginLeft: 'auto',
  },
  addAnother: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 9,
    marginTop: 6,
    borderRadius: 9,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#2A3A4F',
  },
  addAnotherPlus: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(201,151,58,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAnotherPlusText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 12,
    color: '#C9973A',
    lineHeight: 14,
  },
  addAnotherLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#6B7F99',
  },
  hint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 8,
    color: '#4A5568',
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  ctaBar: {
    borderTopWidth: 1,
    borderTopColor: '#1A2535',
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  ctaPress: {
    width: '100%',
    borderRadius: 13,
    overflow: 'hidden',
  },
  cta: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  ctaText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 12,
    color: '#1B2B4B',
  },
});
