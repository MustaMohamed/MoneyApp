import { isCategoryNameTaken } from '@/modules/categories/utils/category_name_taken';
import { makeTestCategory } from '@/test_helpers/transaction';

const categories = [
  makeTestCategory({ id: 'c1', name: 'Groceries' }),
  makeTestCategory({ id: 'c2', name: ' \tRent\r\n' }),
];

describe('isCategoryNameTaken', () => {
  it('is false against an empty list', () => {
    expect(isCategoryNameTaken([], 'Groceries')).toBe(false);
    expect(isCategoryNameTaken([], 'Groceries', 'c1')).toBe(false);
  });

  it('matches an exact name', () => {
    expect(isCategoryNameTaken(categories, 'Groceries')).toBe(true);
  });

  it('matches whatever the case is on either side', () => {
    expect(isCategoryNameTaken(categories, 'groceries')).toBe(true);
    expect(isCategoryNameTaken([makeTestCategory({ name: 'groceries' })], 'GROCERIES')).toBe(true);
  });

  it('strips spaces, tabs, carriage returns and newlines from the candidate and the stored name alike', () => {
    expect(isCategoryNameTaken(categories, '\r Groceries \n')).toBe(true);
    expect(isCategoryNameTaken(categories, 'Rent')).toBe(true);
  });

  it('keeps a non-breaking space significant', () => {
    expect(isCategoryNameTaken(categories, ' Groceries')).toBe(false);
  });

  it('compares a name that strips to empty like any other', () => {
    expect(isCategoryNameTaken([makeTestCategory({ name: '   ' })], '')).toBe(true);
  });

  it('is false on a name no category holds', () => {
    expect(isCategoryNameTaken(categories, 'Travel')).toBe(false);
  });

  it('does not count the excluded category against itself', () => {
    expect(isCategoryNameTaken(categories, 'Groceries', 'c1')).toBe(false);
  });

  it('still counts another category holding the name', () => {
    expect(isCategoryNameTaken(categories, 'Groceries', 'c2')).toBe(true);
  });
});
