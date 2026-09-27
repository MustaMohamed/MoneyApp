import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';

/** The line box RN lays out at an OS font scale: it scales `lineHeight` as SP (TextAttributes.kt:83), never past linear. */
export function scaledLineHeight(fontSize: number, fontScale: number): number {
  return lineHeightFor(fontSize) * fontScale;
}

export interface SearchTallyGeometry {
  slotHeight: number;
  lineHeight: number;
}

export function resolveSearchTallyGeometry(fontScale: number): SearchTallyGeometry {
  const lineHeight = scaledLineHeight(Type.micro, fontScale);
  return { slotHeight: Spacing.xxs + lineHeight, lineHeight };
}

export interface TransactionsHeroGeometry {
  header: number;
  amount: number;
  columns: number;
  rail: number;
  caption: number;
}

// Each loaded row takes its text's line box, so the skeleton's bars match it to the dp at every scale.
export function resolveTransactionsHeroGeometry(fontScale: number): TransactionsHeroGeometry {
  return {
    header: scaledLineHeight(Type.overline, fontScale),
    amount: scaledLineHeight(Type.hero, fontScale),
    columns:
      scaledLineHeight(Type.micro, fontScale) +
      Spacing.xxxs +
      scaledLineHeight(Type.body, fontScale),
    rail: Size.progressThin,
    caption: scaledLineHeight(Type.chip, fontScale),
  };
}
