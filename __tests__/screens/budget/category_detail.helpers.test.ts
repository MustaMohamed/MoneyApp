import { Strings } from '@/constants/strings';
import {
  BUDGET_CATEGORY_DETAIL_LOAD_ERROR_COPY,
  type CategoryDetailViewState,
  categoryDetailShowsBody,
  resolveCategoryDetailViewState,
} from '@/modules/budget/screens/budget/category_detail/category_detail.helpers';

describe('resolveCategoryDetailViewState', () => {
  it.each([
    [{ hasLoaded: false, hasCategory: false, loadError: false }, 'loading'],
    [{ hasLoaded: false, hasCategory: true, loadError: false }, 'loading'],
    [{ hasLoaded: false, hasCategory: false, loadError: true }, 'firstLoadError'],
    [{ hasLoaded: false, hasCategory: true, loadError: true }, 'firstLoadError'],
    [{ hasLoaded: true, hasCategory: false, loadError: false }, 'notFound'],
    [{ hasLoaded: true, hasCategory: false, loadError: true }, 'firstLoadError'],
    [{ hasLoaded: true, hasCategory: true, loadError: true }, 'refreshErrorWithData'],
    [{ hasLoaded: true, hasCategory: true, loadError: false }, 'ready'],
  ] as const)('reads %o as %s', (input, expected) => {
    expect(resolveCategoryDetailViewState(input)).toBe(expected);
  });
});

describe('categoryDetailShowsBody', () => {
  it.each([
    ['loading', false],
    ['notFound', false],
    ['firstLoadError', false],
    ['refreshErrorWithData', true],
    ['ready', true],
  ] as const satisfies ReadonlyArray<readonly [CategoryDetailViewState, boolean]>)(
    'draws the body on %s: %s',
    (viewState, expected) => {
      expect(categoryDetailShowsBody(viewState)).toBe(expected);
    },
  );
});

describe('BUDGET_CATEGORY_DETAIL_LOAD_ERROR_COPY', () => {
  it('titles the first load with its own key, not the tab load string', () => {
    expect(BUDGET_CATEGORY_DETAIL_LOAD_ERROR_COPY.loadTitle).toEqual(expect.any(String));
    expect(BUDGET_CATEGORY_DETAIL_LOAD_ERROR_COPY.loadTitle).not.toBe(Strings.budgetLoadError);
    expect(BUDGET_CATEGORY_DETAIL_LOAD_ERROR_COPY.loadTitle).not.toBe(
      BUDGET_CATEGORY_DETAIL_LOAD_ERROR_COPY.refreshTitle,
    );
  });
});
