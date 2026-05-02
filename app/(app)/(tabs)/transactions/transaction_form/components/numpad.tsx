import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

type NumpadAction = 'digit' | 'decimal' | 'backspace';

interface Props {
  onPress: (action: NumpadAction, value?: string) => void;
}

const ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['.', '0', '⌫'],
];

export function Numpad({ onPress }: Props) {
  function handleKey(key: string) {
    if (key === '⌫') onPress('backspace');
    else if (key === '.') onPress('decimal');
    else onPress('digit', key);
  }

  return (
    <View style={styles.grid}>
      {ROWS.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((key) => (
            <Pressable
              key={key}
              style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
              onPress={() => handleKey(key)}
              hitSlop={4}
            >
              {key === '⌫' ? (
                <MaterialCommunityIcons
                  name="backspace-outline"
                  size={ms(22)}
                  color={Colors.dark.text1}
                />
              ) : (
                <Text style={styles.keyLabel}>{key}</Text>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: Spacing.xs },
  row: { flexDirection: 'row', gap: Spacing.xs },
  key: {
    flex: 1,
    height: ms(52),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
  },
  keyPressed: { opacity: 0.6 },
  keyLabel: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.title,
    color: Colors.dark.text1,
  },
});
