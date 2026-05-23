import { cn } from 'heroui-native';
import React from 'react';
import Animated from 'react-native-reanimated';

import { GeoIllustration } from '@/components/geo_illustration';
import { ProgressDots } from '@/components/progress_dots';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';

import { useWelcomeAnim } from './welcome.anim';
import { useWelcome } from './welcome.hook';

export default function WelcomeScreenV2() {
  const { state, setSelected, onContinue } = useWelcome();
  const { illustrationEntering, headlineEntering, pillsEntering, ctaEntering } = useWelcomeAnim();

  return (
    <Screen>
      <ProgressDots totalSteps={4} currentStep={1} />

      <ScreenScroll>
        <Box style={{ flex: 1 }} className="items-center justify-center gap-6 px-4">
          <Animated.View entering={illustrationEntering}>
            <GeoIllustration />
          </Animated.View>

          <Animated.View entering={headlineEntering} className="items-center gap-1">
            <Text variant="hero" className="font-soraExtra text-center">
              {Strings.o1Headline}
            </Text>
            <Text variant="body" className="text-muted mt-1 text-center">
              {Strings.o1Subtext}
            </Text>
          </Animated.View>

          <Text variant="hint" className="mt-4 self-start">
            {Strings.n1CurrencyLabel}
          </Text>

          <Animated.View
            entering={pillsEntering}
            style={{ flexDirection: 'row', width: '100%' }}
            className="gap-3"
          >
            {([Currency.EGP, Currency.USD] as const).map((code) => (
              <Pressable
                key={code}
                onPress={() => setSelected(code)}
                style={{ flex: 1 }}
                className={cn(
                  'flex-row items-center justify-center gap-2 rounded-[10px] border-[1.5px] py-3',
                  state.selected === code
                    ? 'border-gold-600 bg-[rgba(201,151,58,0.08)]'
                    : 'border-border bg-default',
                )}
              >
                <Text className="text-[18px]">{code === Currency.EGP ? '🇪🇬' : '🇺🇸'}</Text>
                <Text
                  variant="body"
                  className={cn(
                    'font-soraBold',
                    state.selected === code ? 'text-gold-600' : 'text-muted',
                  )}
                >
                  {code}
                </Text>
              </Pressable>
            ))}
          </Animated.View>

          <Box className="bg-surface mt-3 w-full rounded-[10px] px-4 py-3">
            <Text variant="caption" className="text-muted">
              {Strings.n1CurrencyNote}
            </Text>
          </Box>
        </Box>
      </ScreenScroll>

      <Box className="border-separator border-t px-4 pt-2 pb-6">
        <Animated.View entering={ctaEntering}>
          <Button
            variant="primary"
            label={Strings.o1Cta}
            onPress={() => {
              void onContinue();
            }}
          />
        </Animated.View>
      </Box>
    </Screen>
  );
}
