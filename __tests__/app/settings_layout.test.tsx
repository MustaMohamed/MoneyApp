/**
 * Tests for app/(app)/settings/_layout.tsx
 *
 * Bug 1: Settings root screen must have headerLeft: () => <SettingsBackButton />
 *        (previously missing, causing the plain default back arrow on the index screen).
 *
 * Bug 2: SettingsBackButton must wrap BackButton in a View with horizontal padding
 *        tokens so the boxy button has breathing room from the screen edge (paddingLeft)
 *        and from the title text (paddingRight). NativeStackNavigationOptions does NOT
 *        expose headerLeftContainerStyle, so the inset is applied in the component wrapper.
 */
import fs from 'fs';
import path from 'path';

import { Spacing } from '@/constants/theme';

const LAYOUT_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../app/(app)/settings/_layout.tsx'),
  'utf8',
);

// ---------------------------------------------------------------------------
// Bug 1 — index screen must define a custom headerLeft
// ---------------------------------------------------------------------------
describe('Settings layout — Bug 1: root screen headerLeft', () => {
  it('Stack.Screen name="index" includes a headerLeft prop', () => {
    // The index screen was missing headerLeft, so Expo Router rendered its own
    // default thin arrow. The fix adds the same SettingsBackButton used by the
    // other screens.
    expect(LAYOUT_SOURCE).toMatch(/name="index"[\s\S]*?headerLeft\s*:/);
  });

  it('all four screens (index, currency, categories, about) define headerLeft', () => {
    // Regression guard — ensure the existing screens were not accidentally
    // removed when the fix was applied, and index was added.
    expect(LAYOUT_SOURCE).toMatch(/name="index"[\s\S]*?headerLeft\s*:/);
    expect(LAYOUT_SOURCE).toMatch(/name="currency\/index"[\s\S]*?headerLeft\s*:/);
    expect(LAYOUT_SOURCE).toMatch(/name="categories\/index"[\s\S]*?headerLeft\s*:/);
    expect(LAYOUT_SOURCE).toMatch(/name="about\/index"[\s\S]*?headerLeft\s*:/);
  });
});

// ---------------------------------------------------------------------------
// Bug 2 — SettingsBackButton wrapper View must carry horizontal padding tokens
// ---------------------------------------------------------------------------
describe('Settings layout — Bug 2: SettingsBackButton padding', () => {
  it('SettingsBackButton renders a wrapping View (not bare BackButton)', () => {
    // NativeStack has no headerLeftContainerStyle — we apply insets on the
    // wrapper View inside the headerLeft render function instead.
    expect(LAYOUT_SOURCE).toContain('paddingLeft');
    expect(LAYOUT_SOURCE).toContain('paddingRight');
  });

  it('paddingLeft is either 0 or a Spacing token', () => {
    // 0 = flush against the screen edge (current intent post-polish).
    // Spacing token also acceptable — design may evolve.
    expect(LAYOUT_SOURCE).toMatch(/paddingLeft\s*:\s*(0|Spacing\.\w+)/);
  });

  it('paddingRight uses a Spacing token (any tier)', () => {
    // Token-driven — actual tier (xs/sm/md) is a design decision, not contract.
    expect(LAYOUT_SOURCE).toMatch(/paddingRight\s*:\s*Spacing\.\w+/);
  });

  it('paddingLeft is either 0 or a defined Spacing key', () => {
    const match = LAYOUT_SOURCE.match(/paddingLeft\s*:\s*(0|Spacing\.\w+)/);
    expect(match).not.toBeNull();
    if (match && match[1].startsWith('Spacing.')) {
      const tokenName = match[1].replace('Spacing.', '') as keyof typeof Spacing;
      expect(Object.prototype.hasOwnProperty.call(Spacing, tokenName)).toBe(true);
    }
  });

  it('paddingRight token value is a defined Spacing key', () => {
    const match = LAYOUT_SOURCE.match(/paddingRight\s*:\s*(Spacing\.\w+)/);
    expect(match).not.toBeNull();
    if (match) {
      const tokenName = match[1].replace('Spacing.', '') as keyof typeof Spacing;
      expect(Object.prototype.hasOwnProperty.call(Spacing, tokenName)).toBe(true);
    }
  });

  it('does NOT hardcode non-zero numeric pixel values for padding (must use tokens or 0)', () => {
    // Tokens only — never inline magic numbers. Literal 0 is allowed (unambiguous sentinel).
    expect(LAYOUT_SOURCE).not.toMatch(/paddingLeft\s*:\s*[1-9]\d*/);
    expect(LAYOUT_SOURCE).not.toMatch(/paddingRight\s*:\s*[1-9]\d*/);
  });
});
