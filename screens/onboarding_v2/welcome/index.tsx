import React from 'react';
import { ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GeoIllustration } from '@/components/geo_illustration';
import { ProgressDots } from '@/components/progress_dots';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { cn } from '@/utils/cn';
import { useWelcome } from './welcome.hook';
import { useWelcomeAnim } from './welcome.anim';

export default function WelcomeScreenV2() {
  const { state, setSelected, onContinue } = useWelcome();
  const { illustrationEntering, headlineEntering, pillsEntering, ctaEntering } = useWelcomeAnim();

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <ProgressDots totalSteps={4} currentStep={1} />

      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <Box className="flex-1 items-center justify-center gap-6 px-4">
          <Animated.View entering={illustrationEntering}>
            <GeoIllustration />
          </Animated.View>

          <Animated.View entering={headlineEntering} className="items-center gap-1">
            <Text variant="hero" className="text-center font-soraExtra">
              {Strings.o1Headline}
            </Text>
            <Text variant="body" className="text-text2 text-center mt-1">
              {Strings.o1Subtext}
            </Text>
          </Animated.View>

          <Text variant="hint" className="mt-4 self-start">
            {Strings.n1CurrencyLabel}
          </Text>

          <Animated.View entering={pillsEntering} className="flex-row gap-3 w-full">
            {(['EGP', 'USD'] as Currency[]).map((code) => (
              <Pressable
                key={code}
                onPress={() => setSelected(code)}
                className={cn(
                  'flex-1 flex-row items-center justify-center gap-2 py-3 rounded-[10px] border-[1.5px]',
                  state.selected === code
                    ? 'border-gold-600 bg-[rgba(201,151,58,0.08)]'
                    : 'border-border bg-surfaceEl',
                )}
              >
                <Text className="text-[18px]">{code === 'EGP' ? '🇪🇬' : '🇺🇸'}</Text>
                <Text
                  variant="body"
                  className={cn(
                    'font-soraBold',
                    state.selected === code ? 'text-gold-600' : 'text-text2',
                  )}
                >
                  {code}
                </Text>
              </Pressable>
            ))}
          </Animated.View>

          <Box className="mt-3 bg-surface rounded-[10px] px-4 py-3 w-full">
            <Text variant="caption" className="text-text2">
              {Strings.n1CurrencyNote}
            </Text>
          </Box>
        </Box>
      </ScrollView>

      <Box className="border-t border-surface pt-2 px-4 pb-6">
        <Animated.View entering={ctaEntering}>
          <Button variant="primary" label={Strings.o1Cta} onPress={onContinue} />
        </Animated.View>
      </Box>
    </SafeAreaView>
  );
}
