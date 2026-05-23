import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { CoreTokens } from '@/constants/theme_tokens';

type NumpadAction = 'digit' | 'decimal' | 'backspace';

interface Props {
  onPress: (action: NumpadAction, value?: string) => void;
}

const ROWS: Array<Array<string | 'decimal' | 'backspace'>> = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['decimal', '0', 'backspace'],
];

export function Numpad({ onPress }: Props): React.ReactElement {
  return (
    <View className="px-4 pb-4">
      {ROWS.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row' }} className="mt-2 gap-2">
          {row.map((key) => {
            if (key === 'decimal') {
              return (
                <Pressable
                  key="decimal"
                  testID="numpad-key-decimal"
                  onPress={() => onPress('decimal')}
                  className="bg-default h-14 flex-1 items-center justify-center rounded-md"
                >
                  <Text className="font-sora text-foreground text-[20px] font-semibold">.</Text>
                </Pressable>
              );
            }
            if (key === 'backspace') {
              return (
                <Pressable
                  key="backspace"
                  testID="numpad-key-backspace"
                  onPress={() => onPress('backspace')}
                  className="bg-default h-14 flex-1 items-center justify-center rounded-md"
                >
                  <MaterialCommunityIcons
                    name="backspace-outline"
                    size={22}
                    color={CoreTokens.text1}
                  />
                </Pressable>
              );
            }
            return (
              <Pressable
                key={key}
                testID={`numpad-key-${key}`}
                onPress={() => onPress('digit', key)}
                className="bg-default h-14 flex-1 items-center justify-center rounded-md"
              >
                <Text className="font-sora text-foreground text-[20px] font-semibold">{key}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
