import { type ScaledTextStyle, scaledTextStyleAboveOne } from '@/components/ui/text_scale.geometry';
import { Size, Type } from '@/constants/theme';

export interface CommitmentHeaderGeometry {
  height: number;
  title: ScaledTextStyle | undefined;
}

/** The header token is the height at scale 1 and the floor above it; the hairline is the `border-b` drawn inside the box, and `title` is `undefined` at or below scale 1, where the OS scales the class size. */
export function resolveCommitmentHeaderGeometry(
  fontScale: number,
  large: boolean,
): CommitmentHeaderGeometry {
  const title = scaledTextStyleAboveOne(large ? Type.pageTitle : Type.emptyTitle, fontScale);
  return {
    height: Math.max(Size.commitmentHeaderHeight, (title?.lineHeight ?? 0) + Size.hairline),
    title,
  };
}
