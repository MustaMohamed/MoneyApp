import {
  DETAIL_HERO_BADGE_GAP,
  DETAIL_HERO_CAPTION_GAP,
  DETAIL_HERO_OVERLINE_GAP,
  DETAIL_HERO_PADDING,
  DETAIL_HERO_SHELL_STYLE,
  DETAIL_HERO_TILE_GAP,
  resolveDetailHeroGeometry,
} from '@/components/ui/detail_hero.geometry';

export const COMMITMENT_DETAIL_SKELETON_SHELL_STYLE = DETAIL_HERO_SHELL_STYLE;
export const COMMITMENT_DETAIL_SKELETON_HERO_PADDING = DETAIL_HERO_PADDING;
export const COMMITMENT_DETAIL_SKELETON_TILE_GAP = DETAIL_HERO_TILE_GAP;
export const COMMITMENT_DETAIL_SKELETON_BADGE_GAP = DETAIL_HERO_BADGE_GAP;
export const COMMITMENT_DETAIL_SKELETON_OVERLINE_GAP = DETAIL_HERO_OVERLINE_GAP;
export const COMMITMENT_DETAIL_SKELETON_CAPTION_GAP = DETAIL_HERO_CAPTION_GAP;

interface CommitmentDetailSkeletonHero {
  titleLineHeight: number;
  badgeHeight: number;
  overlineLineHeight: number;
  amountHeight: number;
  captionLineHeight: number;
}

/** The hero's bar heights at `fontScale`, read from the shared hero so the skeleton stands as tall as the loaded hero. */
export function resolveCommitmentDetailSkeletonHero(
  fontScale: number,
): CommitmentDetailSkeletonHero {
  const hero = resolveDetailHeroGeometry(fontScale);
  return {
    titleLineHeight: hero.titleLineHeight,
    badgeHeight: hero.badgeHeight,
    overlineLineHeight: hero.overlineLineHeight,
    amountHeight: hero.amountHeight,
    captionLineHeight: hero.captionLineHeight,
  };
}
