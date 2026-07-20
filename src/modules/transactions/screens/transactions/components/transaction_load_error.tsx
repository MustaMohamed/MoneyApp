import { Alert } from 'heroui-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Strings } from '@/constants/strings';

interface TransactionLoadErrorProps {
  variant: 'initial' | 'refresh' | 'totals' | 'pagination';
  onRetry: () => void;
}

const ERROR_TITLES: Record<TransactionLoadErrorProps['variant'], string> = {
  initial: Strings.transactionsLoadError,
  refresh: Strings.transactionsRefreshError,
  totals: Strings.transactionsTotalsLoadError,
  pagination: Strings.transactionsLoadMoreError,
};

export function TransactionLoadError({
  variant,
  onRetry,
}: TransactionLoadErrorProps): React.ReactElement {
  const alert = (
    <Alert status="danger" className="w-full">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{ERROR_TITLES[variant]}</Alert.Title>
      </Alert.Content>
      <Button
        variant="secondary"
        size="sm"
        label={Strings.transactionsLoadRetry}
        accessibilityLabel={Strings.transactionsLoadRetry}
        onPress={onRetry}
      />
    </Alert>
  );

  if (variant === 'initial') {
    return (
      <View testID="transaction-load-error" className="flex-1 items-center justify-center px-4">
        {alert}
      </View>
    );
  }

  if (variant === 'pagination') {
    return (
      <View testID="transaction-load-error" className="px-4 py-3">
        {alert}
      </View>
    );
  }

  return (
    <View testID="transaction-load-error" className="absolute right-4 bottom-24 left-4 z-50">
      {alert}
    </View>
  );
}
