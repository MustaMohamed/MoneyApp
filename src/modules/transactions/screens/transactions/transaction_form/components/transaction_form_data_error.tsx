import { Alert } from 'heroui-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Strings } from '@/constants/strings';

interface Props {
  onRetry: () => void;
}

export function TransactionFormDataError({ onRetry }: Props): React.ReactElement {
  return (
    <View className="flex-1 justify-center px-4">
      <Alert status="danger" className="w-full">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{Strings.addTxDataLoadError}</Alert.Title>
        </Alert.Content>
        <Button
          variant="secondary"
          size="sm"
          label={Strings.addTxDataLoadRetry}
          onPress={onRetry}
        />
      </Alert>
    </View>
  );
}
