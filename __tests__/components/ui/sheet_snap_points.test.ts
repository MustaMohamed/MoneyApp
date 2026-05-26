/**
 * Sheet snap-point resolver — pure-function tests.
 *
 * resolveSnapPoints is exported from components/ui/bottom_sheet.tsx
 * (the new HeroUI-backed primitive). After Wave 5 (git mv bottom_sheet → sheet),
 * update this import to '@/components/ui/sheet'.
 */
import { resolveSnapPoints } from '@/components/ui/bottom_sheet';

describe('resolveSnapPoints', () => {
  // --- legacy presets (values frozen — in-flight consumers are device-QA gated) ---

  it('sm preset resolves to 50%', () => {
    expect(resolveSnapPoints('sm', undefined)).toEqual(['50%']);
  });

  it('md preset resolves to 75%', () => {
    expect(resolveSnapPoints('md', undefined)).toEqual(['75%']);
  });

  it('lg preset resolves to 92%', () => {
    expect(resolveSnapPoints('lg', undefined)).toEqual(['92%']);
  });

  it('lg snap point is NOT 85% (old value removed)', () => {
    expect(resolveSnapPoints('lg', undefined)).not.toContain('85%');
  });

  // --- new presets (7-step scale) ---

  it('xxs preset resolves to 25%', () => {
    expect(resolveSnapPoints('xxs', undefined)).toEqual(['25%']);
  });

  it('xs preset resolves to 40%', () => {
    expect(resolveSnapPoints('xs', undefined)).toEqual(['40%']);
  });

  it('xl preset resolves to 96%', () => {
    expect(resolveSnapPoints('xl', undefined)).toEqual(['96%']);
  });

  it('xxl preset resolves to 100%', () => {
    expect(resolveSnapPoints('xxl', undefined)).toEqual(['100%']);
  });

  // --- default fallback ---

  it('defaults to lg (92%) when size is undefined', () => {
    expect(resolveSnapPoints(undefined, undefined)).toEqual(['92%']);
  });

  // --- explicit snapPoints override ---

  it('explicit snapPoints override size', () => {
    expect(resolveSnapPoints('sm', ['40%'])).toEqual(['40%']);
  });

  it('explicit multi-stop snapPoints are preserved', () => {
    expect(resolveSnapPoints('lg', ['45%', '92%'])).toEqual(['45%', '92%']);
  });

  it('explicit snapPoints override when size is undefined', () => {
    expect(resolveSnapPoints(undefined, ['60%'])).toEqual(['60%']);
  });

  it('explicit snapPoints override new xl size', () => {
    expect(resolveSnapPoints('xl', ['80%'])).toEqual(['80%']);
  });
});
