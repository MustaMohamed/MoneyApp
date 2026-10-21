import { resolveSwipeTileColors } from '@/components/ui/swipeable_row';
import { Colors } from '@/constants/theme';

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => ({
  __esModule: true,
  default: () => null,
}));

// The white the coloured tiles draw today, kept as the literal `swipeable_row.tsx` holds.
const TILE_WHITE = '#FFFFFF';

describe('resolveSwipeTileColors', () => {
  it('draws the success tile in the positive colour with its icon and label in the background colour', () => {
    expect(resolveSwipeTileColors('success')).toEqual({
      background: Colors.dark.positive,
      icon: Colors.dark.bg,
      label: Colors.dark.bg,
    });
  });

  it.each([
    ['neutral', Colors.dark.surfaceEl, Colors.dark.text1],
    ['info', Colors.shared.transferBlue, TILE_WHITE],
    ['destructive', Colors.dark.negative, TILE_WHITE],
  ] as const)('keeps the %s tile as it is', (variant, background, foreground) => {
    expect(resolveSwipeTileColors(variant)).toEqual({
      background,
      icon: foreground,
      label: foreground,
    });
  });
});
