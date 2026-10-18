import {
  HEADER_ACTION_HIT_SLOP,
  NATIVE_HEADER_BACK_PADDING,
  resolveHeaderTextActionGeometry,
  resolveStackHeaderGeometry,
} from '@/components/ui/stack_header.geometry';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { lineHeightFor, Size, Type } from '@/constants/theme';

describe('resolveStackHeaderGeometry', () => {
  it('shrinks the title and keeps the header at its token height at font scale 0.85', () => {
    expect(resolveStackHeaderGeometry(0.85)).toEqual({
      title: scaledTextStyle(Type.title, 0.85),
      height: Size.headerHeight,
    });
  });

  it('is the title token pair and the header token height at font scale 1', () => {
    expect(resolveStackHeaderGeometry(1)).toEqual({
      title: { fontSize: Type.title, lineHeight: lineHeightFor(Type.title) },
      height: Size.headerHeight,
    });
  });

  it('scales the title at font scale 2 in a header no lower than its line box or the token', () => {
    const title = scaledTextStyle(Type.title, 2);
    const geometry = resolveStackHeaderGeometry(2);

    expect(geometry.title).toEqual(title);
    expect(geometry.height).toBeGreaterThanOrEqual(title.lineHeight);
    expect(geometry.height).toBeGreaterThanOrEqual(Size.headerHeight);
  });

  it('grows past the token at font scale 3, to the title line box plus the bottom border', () => {
    const title = scaledTextStyle(Type.title, 3);
    const geometry = resolveStackHeaderGeometry(3);

    expect(geometry.title).toEqual(title);
    expect(geometry.height).toBe(title.lineHeight + Size.hairline);
    expect(geometry.height).toBeGreaterThan(Size.headerHeight);
  });
});

describe('resolveHeaderTextActionGeometry', () => {
  // The literal, not the token: a drifted `headerActionTrack` must fail here, not on a device.
  it.each([0.85, 1])(
    'is the 36 box with a `Type.micro` label the OS scales at font scale %s',
    (fontScale) => {
      expect(resolveHeaderTextActionGeometry(fontScale)).toEqual({
        label: { fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) },
        allowFontScaling: true,
        minWidth: 36,
        height: 36,
      });
    },
  );

  it('scales the label at font scale 2 in a box no smaller than at 1.0', () => {
    const label = scaledTextStyle(Type.micro, 2);
    const geometry = resolveHeaderTextActionGeometry(2);

    expect(geometry.label).toEqual(label);
    expect(geometry.allowFontScaling).toBe(false);
    expect(geometry.height).toBeGreaterThanOrEqual(label.lineHeight);
    expect(geometry.height).toBeGreaterThanOrEqual(36);
    expect(geometry.minWidth).toBe(36);
  });

  it('grows the box past 36 high at font scale 3 and keeps its 36 floor on width', () => {
    const geometry = resolveHeaderTextActionGeometry(3);

    expect(geometry.allowFontScaling).toBe(false);
    expect(geometry.height).toBe(scaledTextStyle(Type.micro, 3).lineHeight + 2 * Size.hairline);
    expect(geometry.height).toBeGreaterThan(36);
    expect(geometry.minWidth).toBe(36);
  });
});

describe('HEADER_ACTION_HIT_SLOP', () => {
  // The literal, not the token: a drifted `headerActionSlop` must fail here, not on a device.
  it('takes taps 8 dp past every side of a header action or back button box', () => {
    expect(HEADER_ACTION_HIT_SLOP).toEqual({ top: 8, bottom: 8, left: 8, right: 8 });
  });
});

describe('NATIVE_HEADER_BACK_PADDING', () => {
  // The literal, not the token: the native header clips its left item, so this padding is the settings back button's tap band.
  it('takes taps 8 dp above, below and right of the native header back button, and none left', () => {
    expect(NATIVE_HEADER_BACK_PADDING).toEqual({
      paddingLeft: 0,
      paddingRight: 8,
      paddingVertical: 8,
    });
  });
});
