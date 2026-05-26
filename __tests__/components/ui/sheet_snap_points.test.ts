/**
 * Sheet snap-point resolver — pure-function tests.
 *
 * resolveSnapPoints is exported from components/ui/sheet.tsx
 * (the HeroUI-backed Sheet primitive).
 */
import { resolveSnapPoints } from '@/components/ui/sheet';

describe('resolveSnapPoints', () => {
  // --- 7-step scale (user-defined heights) ---

  it('xxs preset resolves to 25%', () => {
    expect(resolveSnapPoints('xxs', undefined)).toEqual(['25%']);
  });

  it('xs preset resolves to 35%', () => {
    expect(resolveSnapPoints('xs', undefined)).toEqual(['35%']);
  });

  it('sm preset resolves to 45%', () => {
    expect(resolveSnapPoints('sm', undefined)).toEqual(['45%']);
  });

  it('md preset resolves to 60%', () => {
    expect(resolveSnapPoints('md', undefined)).toEqual(['60%']);
  });

  it('lg preset resolves to 75%', () => {
    expect(resolveSnapPoints('lg', undefined)).toEqual(['75%']);
  });

  it('xl preset resolves to 85%', () => {
    expect(resolveSnapPoints('xl', undefined)).toEqual(['85%']);
  });

  it('xxl preset resolves to 95%', () => {
    expect(resolveSnapPoints('xxl', undefined)).toEqual(['95%']);
  });

  // --- default fallback ---

  it('defaults to lg (75%) when size is undefined', () => {
    expect(resolveSnapPoints(undefined, undefined)).toEqual(['75%']);
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

  // --- snapPoints accept size tokens (new) ---

  it('snapPoints size token resolves to its percentage', () => {
    expect(resolveSnapPoints(undefined, ['sm'])).toEqual(['45%']);
  });

  it('multi-stop size tokens resolve each', () => {
    expect(resolveSnapPoints(undefined, ['sm', 'xl'])).toEqual(['45%', '85%']);
  });

  it('mixed size token + raw percentage', () => {
    expect(resolveSnapPoints('lg', ['xs', '92%'])).toEqual(['35%', '92%']);
  });

  it('pixel-number snap points pass through', () => {
    expect(resolveSnapPoints(undefined, [400])).toEqual([400]);
  });
});
