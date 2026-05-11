import { cn } from '@/utils/cn';

describe('cn', () => {
  it('returns a single class unchanged', () => {
    expect(cn('bg-bg')).toBe('bg-bg');
  });

  it('merges multiple classes', () => {
    expect(cn('flex-1', 'bg-surface')).toBe('flex-1 bg-surface');
  });

  it('deduplicates conflicting Tailwind classes (later wins)', () => {
    expect(cn('bg-bg', 'bg-surface')).toBe('bg-surface');
  });

  it('handles undefined and null gracefully', () => {
    expect(cn('bg-bg', undefined, null as unknown as undefined)).toBe('bg-bg');
  });

  it('handles conditional classes via object syntax', () => {
    expect(cn({ 'bg-bg': true, 'bg-surface': false })).toBe('bg-bg');
  });

  it('returns empty string when given no args', () => {
    expect(cn()).toBe('');
  });
});
