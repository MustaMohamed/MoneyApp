import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { useSettings } from './settings.hook';

export default function SettingsScreen() {
  const { goToCurrency, goToCategories, goBack } = useSettings();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={Size.iconBack}
            color={Colors.dark.text2}
          />
        </Pressable>
        <Text style={styles.title}>{Strings.settingsTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.group}>
        <Pressable onPress={goToCurrency} style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons
                name="currency-usd"
                size={Size.iconSm}
                color={Colors.shared.cairoGold}
              />
            </View>
            <View>
              <Text style={styles.rowTitle}>{Strings.settingsCurrencyRow}</Text>
              <Text style={styles.rowSub}>{Strings.settingsCurrencyDesc}</Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={Size.iconSm}
            color={Colors.dark.text2}
          />
        </Pressable>

        <View style={styles.divider} />

        <Pressable onPress={goToCategories} style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons
                name="tag-multiple"
                size={Size.iconSm}
                color={Colors.shared.cairoGold}
              />
            </View>
            <View>
              <Text style={styles.rowTitle}>{Strings.settingsCategoriesRow}</Text>
              <Text style={styles.rowSub}>{Strings.settingsCategoriesDesc}</Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={Size.iconSm}
            color={Colors.dark.text2}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    height: Size.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  backBtn: {
    width: Size.backBtn,
    height: Size.backBtn,
    borderRadius: Spacing.sm,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  group: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginLeft: Spacing.md + Size.typeIconBox + Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBox: {
    width: Size.typeIconBox,
    height: Size.typeIconBox,
    borderRadius: Radius.sm,
    backgroundColor: Colors.dark.surfaceEl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  headerSpacer: { width: Size.backBtn, height: Size.backBtn },
  rowSub: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    marginTop: 2,
  },
});
