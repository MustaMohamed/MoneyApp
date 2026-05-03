import { FadeInRight } from 'react-native-reanimated';

export function useMoreAccountsAnim() {
  return {
    rowEntering: (index: number, isInitialMount: boolean) =>
      isInitialMount ? FadeInRight.delay(index * 80).duration(300) : FadeInRight.duration(250),
  };
}
