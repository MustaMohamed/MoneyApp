import { PressableFeedback, cn } from 'heroui-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Radius, Size, TouchSize, Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import { STEPPER_VALUE_MIN_WIDTH, resolveStepperEnds } from './stepper.helpers';

interface StepperProps {
  value: number;
  min: number;
  max?: number;
  onChange: (next: number) => void;
  testID?: string;
}

interface StepperButtonProps {
  glyph: string;
  accessibilityLabel: string;
  isDisabled: boolean;
  onPress: () => void;
  testID: string | undefined;
}

function StepperButton({
  glyph,
  accessibilityLabel,
  isDisabled,
  onPress,
  testID,
}: StepperButtonProps) {
  return (
    <PressableFeedback
      testID={testID}
      onPress={onPress}
      isDisabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled }}
      className="bg-default items-center justify-center"
      style={{ width: TouchSize.min, height: TouchSize.min }}
    >
      <Text
        className={cn('font-sora-semibold', isDisabled ? 'text-muted' : 'text-foreground')}
        style={{ fontSize: Type.subhead, lineHeight: lineHeightFor(Type.subhead) }}
      >
        {glyph}
      </Text>
    </PressableFeedback>
  );
}

/** No HeroUI primitive fits: a count between a decrease and an increase button, held to the caller's floor and optional ceiling. */
export function Stepper({ value, min, max, onChange, testID }: StepperProps): React.ReactElement {
  const { canDecrease, canIncrease } = resolveStepperEnds(value, min, max);
  const partID = (part: string) => (testID === undefined ? undefined : `${testID}-${part}`);
  return (
    <View
      testID={testID}
      className="border-border"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderWidth: Size.hairline,
        borderRadius: Radius.md,
        overflow: 'hidden',
      }}
    >
      <StepperButton
        testID={partID('decrease')}
        glyph={Strings.stepperDecreaseGlyph}
        accessibilityLabel={Strings.stepperDecreaseA11y}
        isDisabled={!canDecrease}
        onPress={() => onChange(value - 1)}
      />
      <Text
        testID={partID('value')}
        className="font-sora-semibold text-foreground text-center"
        style={{
          minWidth: ms(STEPPER_VALUE_MIN_WIDTH),
          fontSize: Type.subhead,
          lineHeight: lineHeightFor(Type.subhead),
        }}
      >
        {value}
      </Text>
      <StepperButton
        testID={partID('increase')}
        glyph={Strings.stepperIncreaseGlyph}
        accessibilityLabel={Strings.stepperIncreaseA11y}
        isDisabled={!canIncrease}
        onPress={() => onChange(value + 1)}
      />
    </View>
  );
}
