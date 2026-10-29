import { orderByRank } from '@/utils/rank_order';

describe('orderByRank', () => {
  it('returns the keys by ascending rank when the record lists them out of rank order', () => {
    const rank = { third: 2, first: 0, fourth: 3, second: 1 };

    expect(orderByRank(rank)).toEqual(['first', 'second', 'third', 'fourth']);
  });

  it('leaves the record unchanged, its key order included', () => {
    const rank = { third: 2, first: 0, second: 1 };

    orderByRank(rank);

    expect(rank).toEqual({ third: 2, first: 0, second: 1 });
    expect(Object.keys(rank)).toEqual(['third', 'first', 'second']);
  });

  it('returns a new array on every call', () => {
    const rank = { second: 1, first: 0 };

    const once = orderByRank(rank);
    once.push('first');

    expect(orderByRank(rank)).toEqual(['first', 'second']);
  });

  it('throws, naming both keys and the rank, when two keys share a rank', () => {
    const rank = { paid: 0, overdue: 0, due: 1 };

    expect(() => orderByRank(rank)).toThrow('orderByRank: paid and overdue share rank 0');
  });
});
