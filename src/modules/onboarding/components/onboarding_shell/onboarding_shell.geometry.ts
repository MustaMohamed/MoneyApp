import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { ms } from '@/utils/responsive';

export type OnboardingStepIndex = 1 | 2 | 3 | 4;
export const ONBOARDING_TOTAL_STEPS = 4;

export const ONBOARDING_SHELL_TRACKS = {
  header: Size.headerHeight,
  progressRail: Size.progressRail,
  statusTrack: Size.statusTrack,
  cta: Size.ctaHeight,
} as const;

/** Derived from the track so two lines fit: at scale 1.15, ms(34) = 39 but 2 * ms(17) = 40. */
export const STATUS_TRACK_LINE_HEIGHT = Math.floor(Size.statusTrack / 2);

/** Glyph column from mockup.html:330-332 at 14; both states share it so the text edge holds. */
export const STATUS_GLYPH_BOX = ms(14);
export const STATUS_IDLE_DOT = ms(5);

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

export type StatusTone = 'idle' | 'error';

export interface StatusTrackModel {
  text: string;
  tone: StatusTone;
  a11y: { accessibilityLiveRegion: 'polite' | 'assertive'; accessibilityRole?: 'alert' };
}

/** An empty `message` is the absence of an error, so idle copy stays; the track is never empty. */
export function resolveStatusTrack(footnote: string, message?: string): StatusTrackModel {
  if (message) {
    return {
      text: message,
      tone: 'error',
      a11y: { accessibilityLiveRegion: 'assertive', accessibilityRole: 'alert' },
    };
  }

  return {
    text: footnote,
    tone: 'idle',
    a11y: { accessibilityLiveRegion: 'polite' },
  };
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
