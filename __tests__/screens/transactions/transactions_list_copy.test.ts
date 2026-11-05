import { Strings } from '@/constants/strings';

describe('transactions list copy (MA-093)', () => {
  it('no string keeps the old delete failure wording', () => {
    const texts: string[] = [];
    for (const value of Object.values(Strings)) {
      if (typeof value === 'string') texts.push(value);
    }

    expect(texts.filter((text) => text.includes('Could not delete transaction'))).toEqual([]);
  });
});
