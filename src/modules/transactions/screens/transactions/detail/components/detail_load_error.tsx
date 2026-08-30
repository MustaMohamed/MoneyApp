import { LoadErrorAlert } from '@/components/ui/load_error_alert';
import { Strings } from '@/constants/strings';

import { resolveDetailLoadErrorTitle } from './detail_load_error.helpers';

interface DetailLoadErrorProps {
  floating?: boolean;
  onRetry: () => void;
}

export function DetailLoadError({
  floating = false,
  onRetry,
}: DetailLoadErrorProps): React.ReactElement {
  return (
    <LoadErrorAlert
      mode={floating ? 'floating' : 'fill'}
      title={resolveDetailLoadErrorTitle(floating)}
      retryLabel={Strings.detailLoadRetry}
      onRetry={onRetry}
      testID="detail-load-error"
    />
  );
}
