import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import {
  ONBOARDING_SHELL_TRACKS,
  ONBOARDING_TOTAL_STEPS,
  STATUS_TRACK_LINE_HEIGHT,
  resolveAmbientWashGeometry,
  resolveProgressRail,
  resolveStatusTrack,
  type OnboardingStepIndex,
} from '@/modules/onboarding/components/onboarding_shell/onboarding_shell.geometry';
import { ms } from '@/utils/responsive';

describe('onboarding shell geometry', () => {
  it('binds every track to its named token', () => {
    expect(ONBOARDING_SHELL_TRACKS.header).toBe(Size.headerHeight);
    expect(ONBOARDING_SHELL_TRACKS.progressRail).toBe(Size.progressRail);
    expect(ONBOARDING_SHELL_TRACKS.statusTrack).toBe(Size.statusTrack);
    expect(ONBOARDING_SHELL_TRACKS.cta).toBe(Size.ctaHeight);
  });

  it('holds exactly two status lines at every scale', () => {
    expect(STATUS_TRACK_LINE_HEIGHT * 2).toBeLessThanOrEqual(Size.statusTrack);
    expect(STATUS_TRACK_LINE_HEIGHT * 2).toBeGreaterThan(Size.statusTrack - 2);
  });
});

describe('resolveProgressRail', () => {
  const stepNames = [
    Strings.n1StepName,
    Strings.n2StepName,
    Strings.n3StepName,
    Strings.n4StepName,
  ];

  it.each([1, 2, 3, 4] as OnboardingStepIndex[])('step %i', (step) => {
    const model = resolveProgressRail(step);

    expect(model.filled).toHaveLength(ONBOARDING_TOTAL_STEPS);
    expect(model.filled).toEqual(
      Array.from({ length: ONBOARDING_TOTAL_STEPS }, (_, i) => i < step),
    );
    expect(model.stepLabel).toBe(`Step ${step} of 4`);
    expect(model.stepName).toBe(stepNames[step - 1]);
    expect(model.accessibilityLabel).toBe(`Step ${step} of 4, ${stepNames[step - 1]}`);
  });
});

describe('resolveStatusTrack', () => {
  it.each([
    [
      'idle footnote, no message',
      Strings.n2Footnote,
      undefined,
      {
        text: Strings.n2Footnote,
        tone: 'idle' as const,
        a11y: { accessibilityLiveRegion: 'polite' as const },
      },
    ],
    [
      'error message replaces the footnote',
      Strings.n2Footnote,
      'Could not save that.',
      {
        text: 'Could not save that.',
        tone: 'error' as const,
        a11y: {
          accessibilityLiveRegion: 'assertive' as const,
          accessibilityRole: 'alert' as const,
        },
      },
    ],
    [
      'an empty string is not a failure — the track is never empty',
      Strings.n2Footnote,
      '',
      {
        text: Strings.n2Footnote,
        tone: 'idle' as const,
        a11y: { accessibilityLiveRegion: 'polite' as const },
      },
    ],
  ])('%s', (_name, footnote, message, expected) => {
    expect(resolveStatusTrack(footnote, message)).toEqual(expected);
  });
});

describe('ambient wash geometry — mockup.html:428-433 (.aurora)', () => {
  it('places the gold ellipse above the top-left corner', () => {
    const { gold } = resolveAmbientWashGeometry(390, 844);
    expect(gold.cx).toBeCloseTo(39, 5); // 10% of width
    expect(gold.cy).toBeCloseTo(-50.64, 5); // -6% of height, deliberately off-canvas
    expect(gold.rx).toBe(ms(470));
    expect(gold.ry).toBe(ms(320));
  });

  it('places the teal ellipse just off the right edge', () => {
    const { teal } = resolveAmbientWashGeometry(390, 844);
    expect(teal.cx).toBeCloseTo(397.8, 5); // 102% of width
    expect(teal.cy).toBeCloseTo(286.96, 5); // 34% of height
  });

  it('tracks the viewport rather than the 390pt reference', () => {
    const wide = resolveAmbientWashGeometry(430, 932);
    expect(wide.gold.cx).toBeCloseTo(43, 5);
    expect(wide.teal.cx).toBeCloseTo(438.6, 5);
  });
});
