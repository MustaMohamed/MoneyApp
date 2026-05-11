import React from 'react';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { ProgressDots } from '@/components/progress_dots';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { SemanticTokens } from '@/constants/theme_tokens';
import { cn } from '@/utils/cn';
import { useReadyV2 } from './ready.hook';
import { useReadyAnim } from './ready.anim';

export default function ReadyScreenV2() {
  const { state, handleComplete } = useReadyV2();
  const { rows, completing } = state;
  const { checkEntering, headlineEntering, subtitleEntering, rowEntering, ctaEntering } =
    useReadyAnim();

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <ProgressDots totalSteps={4} currentStep={4} />

      <Box className="flex-1 items-center justify-center px-4 gap-4">
        <Animated.View entering={checkEntering}>
          <MaterialCommunityIcons
            name="check-circle"
            size={Size.iconHero}
            color={SemanticTokens.positive}
          />
        </Animated.View>

        <Animated.Text entering={headlineEntering}>
          <Text variant="hero" className="font-soraExtra text-text1 text-center">
            {Strings.o6Title}
          </Text>
        </Animated.Text>

        <Animated.Text entering={subtitleEntering}>
          <Text variant="body" className="text-text2 text-center">
            {Strings.o6Subtitle}
          </Text>
        </Animated.Text>

        <Box className="w-full bg-surface border border-border rounded-[12px] py-3 px-4">
          {rows.map((row, index) => (
            <Animated.View
              key={row.label}
              testID="summary-row"
              entering={rowEntering(index)}
              className={cn(
                'flex-row justify-between items-center py-3',
                index < rows.length - 1 && 'border-b border-surfaceEl',
              )}
            >
              <Text variant="body" className="text-text2">
                {row.label}
              </Text>
              <Text
                variant="body"
                className={cn('font-soraBold', row.gold ? 'text-gold-500' : 'text-text1')}
              >
                {row.value}
              </Text>
            </Animated.View>
          ))}
        </Box>
      </Box>

      <Box className="border-t border-surface pt-2 px-4 pb-6">
        <Animated.View entering={ctaEntering}>
          <Button
            variant="primary"
            label={Strings.o6Cta}
            onPress={handleComplete}
            disabled={completing}
          />
        </Animated.View>
      </Box>
    </SafeAreaView>
  );
}
