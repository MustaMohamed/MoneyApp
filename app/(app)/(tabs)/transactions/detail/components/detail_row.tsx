import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms, msFont } from '@/utils/responsive';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  icon: IconName;
  label: string;
  value: string;
  badge?: string;
  sublabel?: string;
  muted?: boolean;
  showDivider?: boolean;
}

export function DetailRow({
  icon,
  label,
  value,
  badge,
  sublabel,
  muted,
  showDivider = true,
}: Props) {
  return (
    <View style={[styles.row, !showDivider && styles.noDivider]}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name={icon} size={ms(16)} color={Colors.dark.text2} />
      </View>
      <View style={styles.center}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, muted && styles.valueMuted]} numberOfLines={2}>
          {value}
        </Text>
        {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
      </View>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  noDivider: { borderBottomWidth: 0 },
  iconBox: {
    width: ms(32),
    height: ms(32),
    borderRadius: Radius.sm,
    backgroundColor: Colors.dark.surfaceEl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1 },
  label: {
    fontFamily: FontFamily.interSemi,
    fontSize: msFont(11),
    color: Colors.dark.text2,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  value: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  valueMuted: { color: Colors.dark.text2 },
  sublabel: {
    fontFamily: FontFamily.interRegular,
    fontSize: msFont(11),
    color: Colors.dark.text2,
    marginTop: 2,
  },
  badge: {
    backgroundColor: Colors.dark.surfaceEl,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.pill,
  },
  badgeText: {
    fontFamily: FontFamily.interSemi,
    fontSize: msFont(10),
    color: Colors.dark.text2,
    letterSpacing: 0.3,
  },
});
