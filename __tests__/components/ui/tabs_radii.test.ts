import {
  SOLID_GOLD_SELECTED_RADIUS,
  SOLID_GOLD_TRACK_RADIUS,
  resolveSolidGoldRadii,
} from '@/components/ui/tabs';
import { Radius } from '@/constants/theme';

describe('resolveSolidGoldRadii', () => {
  it('leaves the compact pill track to HeroUI and rounds its fill to Radius.lg', () => {
    expect(resolveSolidGoldRadii({ isCompact: true, corners: 'pill' })).toEqual({
      track: undefined,
      selected: Radius.lg,
    });
  });

  it('gives a compact form track the account form corners', () => {
    expect(resolveSolidGoldRadii({ isCompact: true, corners: 'form' })).toEqual({
      track: SOLID_GOLD_TRACK_RADIUS,
      selected: SOLID_GOLD_SELECTED_RADIUS,
    });
  });

  it('keeps the default density on the form corners, whichever opt-in it passes', () => {
    expect(resolveSolidGoldRadii({ isCompact: false, corners: 'pill' })).toEqual({
      track: SOLID_GOLD_TRACK_RADIUS,
      selected: SOLID_GOLD_SELECTED_RADIUS,
    });
    expect(resolveSolidGoldRadii({ isCompact: false, corners: 'form' })).toEqual({
      track: SOLID_GOLD_TRACK_RADIUS,
      selected: SOLID_GOLD_SELECTED_RADIUS,
    });
  });
});
