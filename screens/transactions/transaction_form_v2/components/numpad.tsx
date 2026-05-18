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
        <View key={ri} style={{ flexDirection: 'row' }} className="gap-2 mt-2">
          {row.map((key) => {
            if (key === 'decimal') {
              return (
                <Pressable
                  key="decimal"
                  testID="numpad-key-decimal"
                  onPress={() => onPress('decimal')}
                  className="flex-1 h-14 rounded-md bg-default items-center justify-center"
                >
                  <Text className="font-sora font-semibold text-[20px] text-foreground">.</Text>
                </Pressable>
              );
            }
            if (key === 'backspace') {
              return (
                <Pressable
                  key="backspace"
                  testID="numpad-key-backspace"
                  onPress={() => onPress('backspace')}
                  className="flex-1 h-14 rounded-md bg-default items-center justify-center"
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
                className="flex-1 h-14 rounded-md bg-default items-center justify-center"
              >
                <Text className="font-sora font-semibold text-[20px] text-foreground">{key}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
