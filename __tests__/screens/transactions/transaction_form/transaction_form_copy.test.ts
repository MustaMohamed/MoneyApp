import { Strings } from '@/constants/strings';

describe('add and edit sheet copy', () => {
  it('drops the dead edit title key', () => {
    expect(Object.hasOwn(Strings, 'editTransaction')).toBe(false);
  });
});

describe('MA-105 footer status track copy', () => {
  it('keeps no string that still reads Could not save this transaction', () => {
    const stale = Object.entries(Strings).filter(
      ([, value]) => typeof value === 'string' && value.includes('Could not save this transaction'),
    );

    expect(stale).toEqual([]);
  });
});

describe('MA-106 saved toast and prerequisite state copy', () => {
  it('keeps no string that still reads Could not load the accounts and categories', () => {
    const stale = Object.entries(Strings).filter(
      ([, value]) =>
        typeof value === 'string' && value.includes('Could not load the accounts and categories'),
    );

    expect(stale).toEqual([]);
  });
});

describe('MA-097 budget lookup copy and the approved failure strings', () => {
  it('keeps no string that still reads the old budget lookup failure or its retry', () => {
    const stale = Object.entries(Strings).filter(
      ([, value]) =>
        typeof value === 'string' &&
        (value.includes('Could not load matching budgets') ||
          value.includes('Retry matching budget lookup')),
    );

    expect(stale).toEqual([]);
  });
});
