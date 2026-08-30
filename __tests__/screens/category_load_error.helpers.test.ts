import { Strings } from '@/constants/strings';
import { resolveCategoryLoadErrorTitle } from '@/modules/categories/screens/settings/categories/components/category_load_error.helpers';

const ROWS = [
  [false, Strings.categoriesLoadError],
  [true, Strings.categoriesRefreshError],
] as const;

describe('resolveCategoryLoadErrorTitle', () => {
  it.each(ROWS)('floating=%s -> its own title', (floating, expected) => {
    expect(resolveCategoryLoadErrorTitle(floating)).toBe(expected);
  });

  it('the two titles are distinct', () => {
    expect(new Set(ROWS.map(([, title]) => title)).size).toBe(ROWS.length);
  });
});
