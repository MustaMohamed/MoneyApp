import { resolveCategoriesPresentation } from '@/modules/categories/screens/settings/categories/categories.helpers';

describe('resolveCategoriesPresentation', () => {
  it.each([
    [false, false, true, 'loading', false],
    [false, true, true, 'initialError', false],
    [true, false, true, 'empty', false],
    [true, false, false, 'list', false],
    [true, true, false, 'list', true],
  ] as const)(
    'resolves loaded=%s error=%s empty=%s to %s',
    (hasLoaded, loadError, isEmpty, content, showRefreshError) => {
      expect(resolveCategoriesPresentation({ hasLoaded, loadError, isEmpty })).toEqual({
        content,
        showRefreshError,
      });
    },
  );
});
