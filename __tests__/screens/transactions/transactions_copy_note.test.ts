import { Strings } from '@/constants/strings';

describe('the two departures from the Copy note', () => {
  it("keeps no string that reads Original amount, per #543's Rule 26", () => {
    expect(
      Object.values(Strings).filter(
        (value) => typeof value === 'string' && value.includes('Original amount'),
      ),
    ).toEqual([]);
  });
});
