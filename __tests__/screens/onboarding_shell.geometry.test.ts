import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import { Size, Spacing, Type } from '@/constants/theme';
import {
  ONBOARDING_SHELL_TRACKS,
  ONBOARDING_TOTAL_STEPS,
  resolveAmbientWashGeometry,
  resolveProgressRail,
  resolveProgressRailGeometry,
  type OnboardingStepIndex,
} from '@/modules/onboarding/components/onboarding_shell/onboarding_shell.geometry';
import { ms } from '@/utils/responsive';

describe('onboarding shell geometry', () => {
  it('binds every track to its named token', () => {
    expect(ONBOARDING_SHELL_TRACKS.progressRail).toBe(Size.progressRail);
  });
});

describe('resolveProgressRailGeometry', () => {
  it.each([1, 0.85])(
    'MA-162: at font scale %s the rail keeps its track and leaves its labels to the OS',
    (fontScale) => {
      expect(resolveProgressRailGeometry(fontScale)).toEqual({
        height: ONBOARDING_SHELL_TRACKS.progressRail,
        label: undefined,
      });
    },
  );

  it('MA-162: at font scale 2 the rail holds its bar, its padding and one scaled label line', () => {
    const g = resolveProgressRailGeometry(2);
    const label = scaledTextStyle(Type.caption, 2);
    const content = 2 * Spacing.sm + Size.progressThin + label.lineHeight;

    expect(g.label).toEqual(label);
    expect(g.height).toBe(Math.max(Size.progressRail, content));
    expect(g.height).toBeGreaterThanOrEqual(content);
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
