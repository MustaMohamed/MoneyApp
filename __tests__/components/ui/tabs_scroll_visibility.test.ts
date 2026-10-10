import { getVisibleScrollOffset } from '@/components/ui/scroll_reveal.geometry';
import { getSegmentScrollBox } from '@/components/ui/tabs.hook';

describe('getSegmentScrollBox', () => {
  it('MA-165: the first tab starts where the scroll content starts, and the content is as wide as its tabs', () => {
    expect(getSegmentScrollBox(0, 96, 7)).toEqual({
      itemX: 0,
      itemWidth: 96,
      contentWidth: 7 * 96,
    });
  });

  it('MA-165: revealing the first tab from the end of the row scrolls the row to its start', () => {
    expect(
      getVisibleScrollOffset({
        currentOffset: 7 * 96 - 300,
        viewportWidth: 300,
        ...getSegmentScrollBox(0, 96, 7),
      }),
    ).toBe(0);
  });
});

describe('getVisibleScrollOffset', () => {
  it('does not scroll when the selected item is already fully visible', () => {
    expect(
      getVisibleScrollOffset({
        currentOffset: 100,
        viewportWidth: 300,
        itemX: 140,
        itemWidth: 96,
        contentWidth: 660,
      }),
    ).toBeUndefined();
  });

  it('scrolls left just enough to reveal the selected item start', () => {
    expect(
      getVisibleScrollOffset({
        currentOffset: 240,
        viewportWidth: 300,
        itemX: 110,
        itemWidth: 96,
        contentWidth: 660,
      }),
    ).toBe(110);
  });

  it('scrolls right just enough to reveal the selected item end', () => {
    expect(
      getVisibleScrollOffset({
        currentOffset: 0,
        viewportWidth: 300,
        itemX: 330,
        itemWidth: 96,
        contentWidth: 660,
      }),
    ).toBe(126);
    expect(
      getVisibleScrollOffset({
        currentOffset: 0,
        viewportWidth: 300,
        ...getSegmentScrollBox(6, 96, 7),
      }),
    ).toBe(7 * 96 - 300);
  });

  it('clamps the scroll offset to the end of the content', () => {
    expect(
      getVisibleScrollOffset({
        currentOffset: 0,
        viewportWidth: 300,
        itemX: 590,
        itemWidth: 96,
        contentWidth: 660,
      }),
    ).toBe(360);
  });

  it('returns the end of an item cut on the right less the viewport, with no upper clamp, when no content width is given', () => {
    expect(
      getVisibleScrollOffset({
        currentOffset: 0,
        viewportWidth: 300,
        itemX: 590,
        itemWidth: 96,
      }),
    ).toBe(386);
  });

  it('returns the start of an item cut on the left, floored at 0, when no content width is given', () => {
    expect(
      getVisibleScrollOffset({
        currentOffset: 240,
        viewportWidth: 300,
        itemX: 110,
        itemWidth: 96,
      }),
    ).toBe(110);
    expect(
      getVisibleScrollOffset({
        currentOffset: 40,
        viewportWidth: 300,
        itemX: -16,
        itemWidth: 96,
      }),
    ).toBe(0);
  });

  it('returns undefined for an item whole in view when no content width is given', () => {
    expect(
      getVisibleScrollOffset({
        currentOffset: 100,
        viewportWidth: 300,
        itemX: 140,
        itemWidth: 96,
      }),
    ).toBeUndefined();
  });
});
