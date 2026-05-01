import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { ms, msFont } from '@/utils/responsive';

interface Props {
  label: string;
}

export function DateHeader({ label }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.dark.bg,
    paddingHorizontal: Spacing.md,
    paddingVertical: ms(6),
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  text: {
    fontFamily: FontFamily.interSemi,
    fontSize: msFont(10),
    color: Colors.dark.text2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
