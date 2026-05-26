/**
 * Sheet snap-point resolver — pure-function tests.
 *
 * resolveSnapPoints is exported from components/ui/bottom_sheet.tsx
 * (the new HeroUI-backed primitive). After Wave 5 (git mv bottom_sheet → sheet),
 * update this import to '@/components/ui/sheet'.
 */
import { resolveSnapPoints } from '@/components/ui/bottom_sheet';

describe('resolveSnapPoints', () => {
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

  it('defaults to lg when size is undefined', () => {
    expect(resolveSnapPoints(undefined, undefined)).toEqual(['92%']);
  });

  it('explicit snapPoints override size', () => {
    expect(resolveSnapPoints('sm', ['40%'])).toEqual(['40%']);
  });

  it('explicit multi-stop snapPoints are preserved', () => {
    expect(resolveSnapPoints('lg', ['45%', '92%'])).toEqual(['45%', '92%']);
  });

  it('explicit snapPoints override when size is undefined', () => {
    expect(resolveSnapPoints(undefined, ['60%'])).toEqual(['60%']);
  });
});
