import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Size, Type, lineHeightFor } from '@/constants/theme';
import { resolveCommitmentHeaderGeometry } from '@/modules/commitments/screens/commitments/components/commitment_header.geometry';
import { msFont } from '@/utils/responsive';

const titleToken = (large: boolean) => (large ? Type.pageTitle : Type.emptyTitle);

describe('commitment header tokens', () => {
  it('names the large title 20 and the header 56, the sizes their classes drew', () => {
    expect(Type.pageTitle).toBe(msFont(20));
    expect(Size.commitmentHeaderHeight).toBe(56);
  });
});

describe('resolveCommitmentHeaderGeometry', () => {
  it.each([true, false])(
    'at font scale 1 is the header token with a title the OS scales (large %s)',
    (large) => {
      const geometry = resolveCommitmentHeaderGeometry(1, large);
      expect(geometry.height).toBe(Size.commitmentHeaderHeight);
      expect(geometry.title).toBeUndefined();
    },
  );

  it('at font scale 2 scales the form title inside the header token, the floor', () => {
    const title = scaledTextStyle(Type.emptyTitle, 2);
    expect(title.lineHeight + Size.hairline).toBeLessThanOrEqual(Size.commitmentHeaderHeight);
    expect(resolveCommitmentHeaderGeometry(2, false)).toEqual({
      height: Size.commitmentHeaderHeight,
      title,
    });
  });

  it('at font scale 1.3 scales the large title inside the header token, the floor', () => {
    const title = scaledTextStyle(Type.pageTitle, 1.3);
    expect(title.lineHeight + Size.hairline).toBeLessThanOrEqual(Size.commitmentHeaderHeight);
    expect(resolveCommitmentHeaderGeometry(1.3, true)).toEqual({
      height: Size.commitmentHeaderHeight,
      title,
    });
  });

  it('at font scale 2 scales the large title in a header no lower than the token or its line box plus the bottom border', () => {
    const title = scaledTextStyle(Type.pageTitle, 2);
    const geometry = resolveCommitmentHeaderGeometry(2, true);

    expect(geometry.title).toEqual(title);
    expect(geometry.height).toBe(
      Math.max(Size.commitmentHeaderHeight, title.lineHeight + Size.hairline),
    );
  });

  it.each([true, false])(
    'at font scale 3 grows past the token, to the title line box plus the bottom border (large %s)',
    (large) => {
      const geometry = resolveCommitmentHeaderGeometry(3, large);

      expect(geometry.title).toEqual(scaledTextStyle(titleToken(large), 3));
      expect(geometry.height).toBe(lineHeightFor(3 * titleToken(large)) + Size.hairline);
      expect(geometry.height).toBeGreaterThan(Size.commitmentHeaderHeight);
    },
  );
});
