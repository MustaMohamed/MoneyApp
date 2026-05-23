import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FlashList } from '@shopify/flash-list';
import React from 'react';
import Animated from 'react-native-reanimated';

import { ProgressDots } from '@/components/progress_dots';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { SemanticTokens } from '@/constants/theme_tokens';
import type { Account } from '@/store/account.store';

import { AccountRowV2 } from './components/account_row';
import { useMoreAccountsAnim } from './more_accounts.anim';
import { useMoreAccountsV2 } from './more_accounts.hook';

export default function MoreAccountsScreenV2() {
  const { accounts, initialCount, handleAddAnother, handleContinue } = useMoreAccountsV2();
  const { checkEntering, headlineEntering, subtitleEntering, rowEntering } = useMoreAccountsAnim();

  return (
    <Screen>
      <ProgressDots totalSteps={4} currentStep={3} />

      <Box style={{ flex: 1 }} className="px-4">
        {/* Success header */}
        <Box className="items-center gap-3 pt-8 pb-6">
          <Animated.View entering={checkEntering}>
            <Box className="h-16 w-16 items-center justify-center rounded-full bg-[rgba(76,175,130,0.12)]">
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
              style={{ flexDirection: 'row' }}
              className="border-border mt-1 items-center justify-center gap-2 rounded-[8px] border-[1.5px] border-dashed p-3"
            >
              <Box
                className="h-7 w-7 items-center justify-center rounded-[6px]"
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

        <Text variant="caption" className="text-muted px-4 py-2 text-center">
          {Strings.o5SettingsHint}
        </Text>
      </Box>

      {/* CTA */}
      <Box className="border-separator border-t px-4 pt-2 pb-6">
        <Button variant="primary" label={Strings.o5Cta} onPress={handleContinue} />
      </Box>
    </Screen>
  );
}
