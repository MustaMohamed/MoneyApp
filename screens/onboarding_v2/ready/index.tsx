import React from 'react';
import Animated from 'react-native-reanimated';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { cn } from 'heroui-native';

import { ProgressDots } from '@/components/progress_dots';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { SemanticTokens } from '@/constants/theme_tokens';
import { useReadyV2 } from './ready.hook';
import { useReadyAnim } from './ready.anim';

export default function ReadyScreenV2() {
  const { state, handleComplete } = useReadyV2();
  const { rows, completing } = state;
  const { checkEntering, headlineEntering, subtitleEntering, rowEntering, ctaEntering } =
    useReadyAnim();

  return (
    <Screen>
      <ProgressDots totalSteps={4} currentStep={4} />

      <Box style={{ flex: 1 }} className="items-center justify-center px-4 gap-4">
        <Animated.View entering={checkEntering}>
          <MaterialCommunityIcons name="check-circle" size={64} color={SemanticTokens.positive} />
        </Animated.View>

        <Animated.Text entering={headlineEntering}>
          <Text variant="hero" className="font-soraExtra text-foreground text-center">
            {Strings.o6Title}
          </Text>
        </Animated.Text>

        <Animated.Text entering={subtitleEntering}>
          <Text variant="body" className="text-muted text-center">
            {Strings.o6Subtitle}
          </Text>
        </Animated.Text>

        {/* 3-row summary card */}
        <Box className="w-full bg-surface border border-border rounded-[12px] py-3 px-4">
          {rows.map((row, index) => (
            <Animated.View
              key={row.label}
              testID="summary-row"
              entering={rowEntering(index)}
              style={{ flexDirection: 'row' }}
              className={cn(
                'justify-between items-center py-3',
                index < rows.length - 1 && 'border-b border-separator',
              )}
            >
              <Text variant="body" className="text-muted">
                {row.label}
              </Text>
              <Text
                variant="body"
                className={cn('font-soraBold', row.gold ? 'text-gold-500' : 'text-foreground')}
              >
                {row.value}
              </Text>
            </Animated.View>
          ))}
        </Box>
      </Box>

      {/* CTA bar */}
      <Box className="border-t border-separator pt-2 px-4 pb-6">
        <Animated.View entering={ctaEntering}>
          <Button
            variant="primary"
            label={Strings.o6Cta}
            onPress={handleComplete}
            disabled={completing}
          />
        </Animated.View>
      </Box>
    </Screen>
  );
}
