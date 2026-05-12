import React from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Separator } from 'heroui-native';

import { Text } from '@/components/ui/text';
import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

export type SettingsTrailing = 'chevron' | 'toggle' | 'none';

export interface SettingsSectionItem {
  label: string;
  /** MaterialCommunityIcons name. Omit to hide the leading icon. */
  icon?: string;
  /** Displayed as trailing value text (e.g. "USD"). */
  value?: string;
  onPress: () => void;
  /** Renders label in text-danger; hides leading icon. */
  destructive?: boolean;
  trailing?: SettingsTrailing;
  /** Required when trailing === 'toggle'. */
  toggleValue?: boolean;
}

export interface SettingsSectionProps {
  /** Section header label (uppercase). Omit to render rows without a header. */
  title?: string;
  items: SettingsSectionItem[];
}

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function SettingsSection({ title, items }: SettingsSectionProps) {
  return (
    <View>
      {title !== undefined && (
        <View testID="settings-section-header" style={styles.header}>
          <Text style={styles.headerText}>{title}</Text>
        </View>
      )}

      {items.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          <SettingsSectionRow item={item} />
          {index < items.length - 1 && <Separator />}
        </React.Fragment>
      ))}
    </View>
  );
}

function SettingsSectionRow({ item }: { item: SettingsSectionItem }) {
  const trailing = item.trailing ?? 'none';

  return (
    <Pressable onPress={item.onPress} style={styles.row} accessibilityRole="button">
      {item.icon !== undefined && !item.destructive && (
        <View testID="leading-icon" style={styles.leadingIcon}>
          <MaterialCommunityIcons
            name={item.icon as MCIName}
            size={ms(20)}
            color={Colors.dark.text2}
          />
        </View>
      )}

      {item.destructive ? (
        <Text testID="destructive-label" style={[styles.label, styles.destructiveLabel]}>
          {item.label}
        </Text>
      ) : (
        <Text style={styles.label}>{item.label}</Text>
      )}

      <View style={styles.trailingContainer}>
        {item.value !== undefined && trailing !== 'chevron' && trailing !== 'toggle' && (
          <Text style={styles.valueText}>{item.value}</Text>
        )}
        {trailing === 'chevron' && (
          <MaterialCommunityIcons
            testID="trailing-chevron"
            name="chevron-right"
            size={ms(20)}
            color={Colors.dark.text2}
          />
        )}
        {trailing === 'toggle' && (
          <Switch
            testID="trailing-toggle"
            value={item.toggleValue ?? false}
            onValueChange={item.onPress}
            trackColor={{ false: Colors.dark.border, true: Colors.dark.gold }}
            thumbColor={Colors.dark.text1}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingLeft: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  headerText: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ms(52),
    paddingHorizontal: Spacing.md,
  },
  leadingIcon: {
    width: ms(28),
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  label: {
    flex: 1,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.bodyStrong,
    color: Colors.dark.text1,
  },
  destructiveLabel: {
    color: Colors.dark.negative,
  },
  trailingContainer: {
    marginLeft: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
});
