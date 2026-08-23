import { isTypeableMoneyText } from '@/utils/money_text';

describe('isTypeableMoneyText', () => {
  it.each([[''], ['0'], ['1.'], ['.5'], ['.'], ['0.005'], ['1234.56'], ['0.0000001']])(
    'accepts %p',
    (text) => {
      expect(isTypeableMoneyText(text)).toBe(true);
    },
  );

  // '1,500' is the 1000x case the mask exists for: parseDecimalText accepts
  // grouped thousands, so without the mask a typed comma turns 1.500 into
  // 1500. The mask is the only thing that refuses it at the field.
  it.each([
    [','],
    ['1,'],
    ['1,50'],
    ['1,500'],
    ['1,234.56'],
    ['1.2.3'],
    ['abc'],
    ['1e-7'],
    [' 12 '],
    ['-5'],
  ])('refuses %p', (text) => {
    expect(isTypeableMoneyText(text)).toBe(false);
  });
});
