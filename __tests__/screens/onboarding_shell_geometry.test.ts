import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import {
  ONBOARDING_SHELL_TRACKS,
  ONBOARDING_TOTAL_STEPS,
  STATUS_TRACK_LINE_HEIGHT,
  resolveProgressRail,
  resolveStatusTrack,
  type OnboardingStepIndex,
} from '@/modules/onboarding/components/onboarding_shell/onboarding_shell.geometry';

describe('onboarding shell geometry', () => {
  // What this test proves and does not: it binds ONBOARDING_SHELL_TRACKS to
  // the tokens. It does NOT prove the four .tsx routes consume that constant
  // — that link is closed by the emulator offset comparison (task § A) and by
  // @impl-reviewer reading the diff for a literal where a track height
  // belongs. A render suite would close it in CI, but .claude/rules/tests.md
  // is "keep the files, don't add to them" for .tsx render suites, so a new
  // one here would be against policy, not merely unfashionable.
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
