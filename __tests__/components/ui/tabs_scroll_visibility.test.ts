import { getVisibleScrollOffset } from '@/components/ui/tabs.hook';

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
});
