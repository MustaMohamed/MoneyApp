import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { ms } from '@/utils/responsive';

export type OnboardingStepIndex = 1 | 2 | 3 | 4;
export const ONBOARDING_TOTAL_STEPS = 4;

/** The shell's four fixed tracks, bound to the named geometry tokens. */
export const ONBOARDING_SHELL_TRACKS = {
  header: Size.headerHeight,
  progressRail: Size.progressRail,
  statusTrack: Size.statusTrack,
  cta: Size.ctaHeight,
} as const;

/**
 * Derived from the track, never authored — see plan decision 7. Authoring the
 * mockup's 17 as ms(17) clips on large phones: at scale 1.15, ms(34) = 39 but
 * 2 * ms(17) = 40. Deriving it from the track makes two lines fit at every
 * scale by construction, and it still equals the mockup's 17 at the 390pt
 * reference.
 */
export const STATUS_TRACK_LINE_HEIGHT = Math.floor(Size.statusTrack / 2);

/**
 * Status-track glyph column — mockup.html:330-332. Named rather than derived
 * from an unrelated token: Size.hairline * 5 is a literal 5 wearing a token
 * (ms(1) is always 1 inside the 0.85-1.15 clamp), and Size.iconMicro (12) is a
 * silent 2dp shrink of a glyph the mockup sized deliberately at 14. Both
 * states share this column width, which is what keeps the text's left edge
 * still between them.
 */
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

/**
 * The status track is never empty. `message` replaces `footnote` in the
 * identical box only when it carries actual content — an empty string is not
 * a failure, it is the absence of one, so idle copy stays on screen.
 *
 * Live-region mapping mirrors the only error precedent in the tree —
 * income_sheet.tsx:81-82 pairs accessibilityRole="alert" with
 * accessibilityLiveRegion="assertive"; idle stays "polite" so a route change
 * (which remounts the shell, and a live region does not announce on mount)
 * never speaks a footnote over the screen title.
 */
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
