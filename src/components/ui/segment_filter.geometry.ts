import { Size } from '@/constants/theme';

export function resolveSegmentFilterWidth(fontScale: number): number {
  return Size.filterSegmentCompactWidth * Math.max(fontScale, 1);
}
