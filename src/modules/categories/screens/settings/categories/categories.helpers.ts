type CategoriesPresentationInput = {
  hasLoaded: boolean;
  loadError: boolean;
  isEmpty: boolean;
};

type CategoriesContent = 'loading' | 'initialError' | 'empty' | 'list';

export function resolveCategoriesPresentation({
  hasLoaded,
  loadError,
  isEmpty,
}: CategoriesPresentationInput): {
  content: CategoriesContent;
  showRefreshError: boolean;
} {
  if (!hasLoaded) {
    return {
      content: loadError ? 'initialError' : 'loading',
      showRefreshError: false,
    };
  }

  return {
    content: isEmpty ? 'empty' : 'list',
    showRefreshError: loadError,
  };
}
