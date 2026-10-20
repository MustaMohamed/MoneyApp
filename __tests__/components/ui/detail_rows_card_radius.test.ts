import { type Dimensions, PixelRatio } from 'react-native';

type Theme = typeof import('@/constants/theme');

// Theme tokens compute at module load, so each width loads its own copy of the theme.
function themeAt(width: number): Theme {
  let theme: Theme | undefined;
  jest.isolateModules(() => {
    const isolated = jest.requireActual<{ Dimensions: typeof Dimensions }>('react-native');
    jest
      .spyOn(isolated.Dimensions, 'get')
      .mockReturnValue({ width, height: 800, scale: PixelRatio.get(), fontScale: 1 });
    theme = jest.requireActual<Theme>('@/constants/theme');
  });
  if (theme === undefined) throw new Error(`the theme did not load on a ${width} dp window`);
  return theme;
}

describe('the detail rows card corner and border', () => {
  // `Radius.lg` is `ms(16)`: its value at each width proves the width mock reached `ms()`.
  it.each([
    [320, 14],
    [390, 16],
    [411, 17],
    [430, 18],
    [480, 18],
  ])(
    'MA-203: reads a 16 dp corner and a 1 dp border on a %s dp window, where the list card corner is %s',
    (width, listCardCorner) => {
      const { Radius, Size } = themeAt(width);

      expect(Radius.lg).toBe(listCardCorner);
      expect(Radius.detailCard).toBe(16);
      expect(Size.hairline).toBe(1);
    },
  );
});
