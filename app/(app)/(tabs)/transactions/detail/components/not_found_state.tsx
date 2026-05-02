import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';

export function NotFoundState() {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={Size.iconHero}
          color={Colors.dark.text2}
        />
      </View>
      <Text style={styles.title}>{Strings.detailNotFoundHeadline}</Text>
      <Pressable style={styles.cta} onPress={() => router.back()}>
        <Text style={styles.ctaText}>{Strings.detailNotFoundCta}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  iconBox: {
    width: Size.iconHero * 1.5,
    height: Size.iconHero * 1.5,
    borderRadius: Size.iconHero * 0.75,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.title,
    color: Colors.dark.text1,
    textAlign: 'center',
  },
  cta: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.cta,
    backgroundColor: Colors.shared.cairoGold,
  },
  ctaText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.shared.midnightBlue,
  },
});
