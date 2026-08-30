import {
  STATE_SCREEN_LAYOUT,
  resolveStateScreenLayout,
} from '@/components/ui/state_screen.geometry';
import { Spacing } from '@/constants/theme';

// Logic-only pin for the shared Empty/ErrorState geometry (W2G §4.2/§4.3,
// #290 cluster 1). Repo policy forbids UI-component render tests, so this
// cannot prove either component actually renders with these values — that is
// the device-QA walk's job (gate 3). What this guards against is the two
// components' geometry drifting apart again, or the shared slots re-splitting
// into per-kind duplicates.
//
// jest-expo mocks the window at 750pt, so responsiveScale clamps to the 1.15
// ceiling (onboarding_ready.geometry.test.ts:42-44) — every pinned number
// below is that clamp's output, not the 390pt design value: `ms(64)` reads 74
// here, not 64. A bare `toBe(64)` would fail under this suite.

const errorLayout = resolveStateScreenLayout('error');
const emptyLayout = resolveStateScreenLayout('empty');

describe('resolveStateScreenLayout — every leaf pairs its token and its scaled number', () => {
  it('error.root.paddingHorizontal', () => {
    expect(errorLayout.root.paddingHorizontal).toBe(Spacing.xl);
    expect(errorLayout.root.paddingHorizontal).toBe(28);
  });

  it('error.iconCircle width/height', () => {
    expect(errorLayout.iconCircle.width).toBe(STATE_SCREEN_LAYOUT.error.iconCircle);
    expect(errorLayout.iconCircle.height).toBe(STATE_SCREEN_LAYOUT.error.iconCircle);
    expect(errorLayout.iconCircle.width).toBe(74);
  });

  it('error.iconSize', () => {
    expect(errorLayout.iconSize).toBe(STATE_SCREEN_LAYOUT.error.iconSize);
    expect(errorLayout.iconSize).toBe(35);
  });

  it('error.headline.marginTop', () => {
    expect(errorLayout.headline.marginTop).toBe(Spacing.lg);
    expect(errorLayout.headline.marginTop).toBe(23);
  });

  it('error.body.marginTop — the shared bodyGap slot', () => {
    expect(errorLayout.body.marginTop).toBe(Spacing.xs);
    expect(errorLayout.body.marginTop).toBe(9);
  });

  it('error.body.maxWidth', () => {
    expect(errorLayout.body.maxWidth).toBe(STATE_SCREEN_LAYOUT.error.bodyMaxWidth);
    expect(errorLayout.body.maxWidth).toBe(368);
  });

  it('error.action.marginTop', () => {
    expect(errorLayout.action.marginTop).toBe(Spacing.xl);
    expect(errorLayout.action.marginTop).toBe(28);
  });

  it('empty.root.paddingHorizontal', () => {
    expect(emptyLayout.root.paddingHorizontal).toBe(Spacing.xl);
    expect(emptyLayout.root.paddingHorizontal).toBe(28);
  });

  it('empty.iconCircle width/height', () => {
    expect(emptyLayout.iconCircle.width).toBe(STATE_SCREEN_LAYOUT.empty.iconCircle);
    expect(emptyLayout.iconCircle.height).toBe(STATE_SCREEN_LAYOUT.empty.iconCircle);
    expect(emptyLayout.iconCircle.width).toBe(92);
  });

  it('empty.iconSize', () => {
    expect(emptyLayout.iconSize).toBe(STATE_SCREEN_LAYOUT.empty.iconSize);
    expect(emptyLayout.iconSize).toBe(46);
  });

  it('empty.headline.marginTop', () => {
    expect(emptyLayout.headline.marginTop).toBe(Spacing.md);
    expect(emptyLayout.headline.marginTop).toBe(18);
  });

  it('empty.body.marginTop — the shared bodyGap slot', () => {
    expect(emptyLayout.body.marginTop).toBe(Spacing.xs);
    expect(emptyLayout.body.marginTop).toBe(9);
  });

  it('empty.body.maxWidth', () => {
    expect(emptyLayout.body.maxWidth).toBe(STATE_SCREEN_LAYOUT.empty.bodyMaxWidth);
    expect(emptyLayout.body.maxWidth).toBe(299);
  });

  it('empty.action.marginTop', () => {
    expect(emptyLayout.action.marginTop).toBe(Spacing.md);
    expect(emptyLayout.action.marginTop).toBe(18);
  });
});

describe('resolveStateScreenLayout — the icon circle never goes out of round', () => {
  it('error borderRadius is exactly half of width', () => {
    expect(errorLayout.iconCircle.borderRadius).toBe(STATE_SCREEN_LAYOUT.error.iconCircle / 2);
    expect(errorLayout.iconCircle.borderRadius).toBe(37);
  });

  it('empty borderRadius is exactly half of width', () => {
    expect(emptyLayout.iconCircle.borderRadius).toBe(STATE_SCREEN_LAYOUT.empty.iconCircle / 2);
    expect(emptyLayout.iconCircle.borderRadius).toBe(46);
  });
});

describe('resolveStateScreenLayout — the action slot differs by kind', () => {
  // ErrorState's Button is mandatory and full-width, bounded by the same
  // maxWidth as the body copy; EmptyState's CTA (where it has one at all)
  // sizes itself and only takes the top gap.
  it('error stretches full width, capped at the shared body max width', () => {
    expect(errorLayout.action.width).toBe('100%');
    expect(errorLayout.action.maxWidth).toBe(STATE_SCREEN_LAYOUT.error.bodyMaxWidth);
  });

  it('empty carries no width or maxWidth', () => {
    expect(emptyLayout.action.width).toBeUndefined();
    expect(emptyLayout.action.maxWidth).toBeUndefined();
  });
});

describe('resolveStateScreenLayout — shared slots live once, not duplicated per kind', () => {
  it('paddingHorizontal and bodyGap are absent from both kind configs', () => {
    expect('paddingHorizontal' in STATE_SCREEN_LAYOUT.error).toBe(false);
    expect('bodyGap' in STATE_SCREEN_LAYOUT.error).toBe(false);
    expect('paddingHorizontal' in STATE_SCREEN_LAYOUT.empty).toBe(false);
    expect('bodyGap' in STATE_SCREEN_LAYOUT.empty).toBe(false);
  });

  it('both kinds resolve the identical shared paddingHorizontal', () => {
    expect(errorLayout.root.paddingHorizontal).toBe(emptyLayout.root.paddingHorizontal);
  });
});

describe('resolveStateScreenLayout — key-set pins and frozen output', () => {
  const EXPECTED_KEYS = ['action', 'body', 'headline', 'iconCircle', 'iconSize', 'root'];

  it('error carries exactly these keys', () => {
    expect(Object.keys(errorLayout).sort()).toEqual(EXPECTED_KEYS);
  });

  it('empty carries exactly these keys', () => {
    expect(Object.keys(emptyLayout).sort()).toEqual(EXPECTED_KEYS);
  });

  it.each([
    ['error', errorLayout],
    ['empty', emptyLayout],
  ] as const)('%s — root, iconCircle, headline, body, action are frozen', (_kind, layout) => {
    expect(Object.isFrozen(layout.root)).toBe(true);
    expect(Object.isFrozen(layout.iconCircle)).toBe(true);
    expect(Object.isFrozen(layout.headline)).toBe(true);
    expect(Object.isFrozen(layout.body)).toBe(true);
    expect(Object.isFrozen(layout.action)).toBe(true);
  });
});
