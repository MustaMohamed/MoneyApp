import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
}

export function SearchBar({ value, onChange, onClear }: Props) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name="magnify"
        size={ms(18)}
        color={Colors.dark.text2}
        style={styles.leadIcon}
      />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={Strings.searchTransactionsPlaceholder}
        placeholderTextColor={Colors.dark.text2}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable onPress={onClear} hitSlop={8} style={styles.clearBtn}>
          <MaterialCommunityIcons name="close-circle" size={ms(16)} color={Colors.dark.text2} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ms(40),
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: Radius.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  leadIcon: { marginRight: Spacing.xs },
  input: {
    flex: 1,
    // Stretch to the container's fixed height so textAlignVertical: 'center' has room to act.
    alignSelf: 'stretch',
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text1,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  clearBtn: { marginLeft: Spacing.xs },
});
