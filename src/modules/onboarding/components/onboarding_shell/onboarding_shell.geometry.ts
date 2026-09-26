import type { PlatformOSType } from 'react-native';

import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { ms } from '@/utils/responsive';

export type OnboardingStepIndex = 1 | 2 | 3 | 4;
export const ONBOARDING_TOTAL_STEPS = 4;

export const ONBOARDING_SHELL_TRACKS = {
  header: Size.headerHeight,
  progressRail: Size.progressRail,
  statusTrack: Size.statusTrack,
  cta: Size.onboardingCtaTrack,
} as const;

const STEP_NAMES: Record<OnboardingStepIndex, string> = {
  1: Strings.n1StepName,
  2: Strings.n2StepName,
  3: Strings.n3StepName,
  4: Strings.n4StepName,
};

export interface ProgressRailModel {
  filled: boolean[];
  stepLabel: string;
  stepName: string;
  accessibilityLabel: string;
}

export function resolveProgressRail(step: OnboardingStepIndex): ProgressRailModel {
  const stepName = STEP_NAMES[step];
  return {
    filled: Array.from({ length: ONBOARDING_TOTAL_STEPS }, (_, i) => i < step),
    stepLabel: Strings.onboardingStepOf(step),
    stepName,
    accessibilityLabel: Strings.onboardingProgressA11y(step, stepName),
  };
}

/** Android's IME height already excludes the navigation bar `Screen` pads, so only iOS subtracts the inset. */
export function resolveKeyboardLift(
  platform: PlatformOSType,
  keyboardHeight: number,
  bottomInset: number,
): number {
  const lift = platform === 'android' ? keyboardHeight : keyboardHeight - bottomInset;
  return Math.max(lift, 0);
}

/** N1 ambient wash from mockup.html:428-433, as viewport fractions plus ms()-scaled radii. */
export const AMBIENT_WASH_GOLD_CX_FRACTION = 0.1; // mockup.html:428, "10%"
export const AMBIENT_WASH_GOLD_CY_FRACTION = -0.06; // mockup.html:428, "-6%"
export const AMBIENT_WASH_TEAL_CX_FRACTION = 1.02; // mockup.html:429, "102%"
export const AMBIENT_WASH_TEAL_CY_FRACTION = 0.34; // mockup.html:429, "34%"

export interface AmbientWashStop {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface AmbientWashGeometry {
  gold: AmbientWashStop;
  teal: AmbientWashStop;
}

export function resolveAmbientWashGeometry(width: number, height: number): AmbientWashGeometry {
  return {
    gold: {
      cx: width * AMBIENT_WASH_GOLD_CX_FRACTION,
      cy: height * AMBIENT_WASH_GOLD_CY_FRACTION,
      rx: ms(470), // mockup.html:428, "470px"
      ry: ms(320), // mockup.html:428, "320px"
    },
    teal: {
      cx: width * AMBIENT_WASH_TEAL_CX_FRACTION,
      cy: height * AMBIENT_WASH_TEAL_CY_FRACTION,
      rx: ms(420), // mockup.html:429, "420px"
      ry: ms(340), // mockup.html:429, "340px"
    },
  };
}
