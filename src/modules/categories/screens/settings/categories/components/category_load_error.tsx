import { LoadErrorAlert } from '@/components/ui/load_error_alert';
import { Strings } from '@/constants/strings';

import { resolveCategoryLoadErrorTitle } from './category_load_error.helpers';

interface CategoryLoadErrorProps {
  floating?: boolean;
  onRetry: () => void;
}

export function CategoryLoadError({ floating = false, onRetry }: CategoryLoadErrorProps) {
  return (
    <LoadErrorAlert
      mode={floating ? 'floating' : 'fill'}
      title={resolveCategoryLoadErrorTitle(floating)}
      retryLabel={Strings.categoriesLoadRetry}
      onRetry={onRetry}
      testID="category-load-error"
    />
  );
}
