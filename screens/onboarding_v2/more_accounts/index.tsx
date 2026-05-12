import React from 'react';
import { FlashList } from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { ProgressDots } from '@/components/progress_dots';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { SemanticTokens } from '@/constants/theme_tokens';
import { useMoreAccountsV2 } from './more_accounts.hook';
import { useMoreAccountsAnim } from './more_accounts.anim';
import { AccountRowV2 } from './components/account_row';
import type { Account } from '@/store/account.store';

export default function MoreAccountsScreenV2() {
  const { accounts, initialCount, handleAddAnother, handleContinue } = useMoreAccountsV2();
  const { checkEntering, headlineEntering, subtitleEntering, rowEntering } = useMoreAccountsAnim();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ProgressDots totalSteps={4} currentStep={3} />

      <Box className="flex-1 px-4">
        {/* Success header */}
        <Box className="items-center pt-8 pb-6 gap-3">
          <Animated.View entering={checkEntering}>
            <Box className="w-16 h-16 rounded-full bg-[rgba(76,175,130,0.12)] items-center justify-center">
              <MaterialCommunityIcons
                name="check-circle"
                size={40}
                color={SemanticTokens.positive}
              />
            </Box>
          </Animated.View>

          <Animated.Text entering={headlineEntering}>
            <Text variant="title" className="font-soraBold text-foreground text-center">
              {Strings.n3AccountSaved}
            </Text>
          </Animated.Text>

          <Animated.Text entering={subtitleEntering}>
            <Text variant="body" className="text-muted text-center">
              {Strings.n3AddMoreSubtitle}
            </Text>
          </Animated.Text>
        </Box>

        {/* Account list */}
        <FlashList
          data={accounts}
          keyExtractor={(item: Account) => item.id}
          contentContainerStyle={{ paddingBottom: 8 }}
          renderItem={({ item, index }: { item: Account; index: number }) => (
            <Box className="mb-2">
              <AccountRowV2
                account={item}
                index={index}
                entering={rowEntering(index, index < initialCount)}
              />
            </Box>
          )}
          ListFooterComponent={
            <Pressable
              onPress={handleAddAnother}
              className="flex-row items-center justify-center gap-2 p-3 mt-1 rounded-[8px] border-[1.5px] border-dashed border-border"
            >
              <Box
                className="w-7 h-7 rounded-[6px] items-center justify-center"
                style={{ backgroundColor: 'rgba(201,151,58,0.12)' }}
              >
                <Text className="text-gold-500 font-soraBold text-[16px]">+</Text>
              </Box>
              <Text variant="body" className="text-muted">
                {Strings.o5AddAnother}
              </Text>
            </Pressable>
          }
        />

        <Text variant="caption" className="text-muted text-center px-4 py-2">
          {Strings.o5SettingsHint}
        </Text>
      </Box>

      {/* CTA */}
      <Box className="border-t border-separator pt-2 px-4 pb-6">
        <Button variant="primary" label={Strings.o5Cta} onPress={handleContinue} />
      </Box>
    </SafeAreaView>
  );
}
