import {
  resolveHeaderActionGeometry,
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

  it('is the title and header height drawn today at font scale 1', () => {
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

describe('resolveHeaderActionGeometry', () => {
  // The literal, not the token: a drifted `headerActionTrack` must fail here, not on a device.
  it.each([0.85, 1])('is the 36 box with a label the OS scales at font scale %s', (fontScale) => {
    expect(resolveHeaderActionGeometry(fontScale)).toEqual({
      label: undefined,
      minWidth: 36,
      height: 36,
    });
  });

  it('scales the label at font scale 2 in a box no smaller than at 1.0', () => {
    const label = scaledTextStyle(Type.micro, 2);
    const geometry = resolveHeaderActionGeometry(2);

    expect(geometry.label).toEqual(label);
    expect(geometry.height).toBeGreaterThanOrEqual(label.lineHeight);
    expect(geometry.height).toBeGreaterThanOrEqual(36);
    expect(geometry.minWidth).toBe(36);
  });

  it('grows the box past 36 high at font scale 3 and keeps its 36 floor on width', () => {
    const geometry = resolveHeaderActionGeometry(3);

    expect(geometry.height).toBeGreaterThan(36);
    expect(geometry.minWidth).toBe(36);
  });
});
