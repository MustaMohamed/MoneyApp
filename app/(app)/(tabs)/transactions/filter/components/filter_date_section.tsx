import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DatePreset } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

interface Props {
  preset: DatePreset;
  customFrom: string | undefined;
  customTo: string | undefined;
  onSelectPreset: (p: DatePreset) => void;
  onOpenCustomPicker: () => void;
}

const PRESETS: { value: DatePreset; labelKey: keyof typeof Strings }[] = [
  { value: DatePreset.Today, labelKey: 'datePresetToday' },
  { value: DatePreset.ThisWeek, labelKey: 'datePresetThisWeek' },
  { value: DatePreset.ThisMonth, labelKey: 'datePresetThisMonth' },
  { value: DatePreset.LastMonth, labelKey: 'datePresetLastMonth' },
  { value: DatePreset.Last30Days, labelKey: 'datePresetLast30Days' },
  { value: DatePreset.ThisYear, labelKey: 'datePresetThisYear' },
  { value: DatePreset.AllTime, labelKey: 'datePresetAllTime' },
];

function formatRange(from: string | undefined, to: string | undefined): string {
  if (!from || !to) return '';
  // Display as "May 1, 2026 – May 31, 2026"
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  return `${fmt(from)} – ${fmt(to)}`;
}

export function FilterDateSection({
  preset,
  customFrom,
  customTo,
  onSelectPreset,
  onOpenCustomPicker,
}: Props) {
  const isCustom = preset === DatePreset.Custom;
  const customCaption = isCustom ? formatRange(customFrom, customTo) : '';

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>{Strings.filterSectionDate}</Text>
      <View style={styles.list}>
        {PRESETS.map((p) => (
          <PresetRow
            key={p.value}
            label={Strings[p.labelKey] as string}
            isActive={preset === p.value}
            onPress={() => onSelectPreset(p.value)}
          />
        ))}
        <Pressable
          onPress={onOpenCustomPicker}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={styles.radioWrap}>
            <View style={[styles.radio, isCustom && styles.radioActive]}>
              {isCustom && <View style={styles.radioDot} />}
            </View>
            <Text style={[styles.label, isCustom && styles.labelActive]}>
              {Strings.datePresetCustom}
            </Text>
          </View>
          {customCaption ? (
            <Text style={styles.caption} numberOfLines={1}>
              {customCaption}
            </Text>
          ) : (
            <MaterialCommunityIcons name="chevron-right" size={ms(18)} color={Colors.dark.text2} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function PresetRow({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.radioWrap}>
        <View style={[styles.radio, isActive && styles.radioActive]}>
          {isActive && <View style={styles.radioDot} />}
        </View>
        <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  sectionLabel: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
    paddingHorizontal: Spacing.md,
  },
  list: {
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  rowPressed: { opacity: 0.7 },
  radioWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  radio: {
    width: ms(18),
    height: ms(18),
    borderRadius: ms(9),
    borderWidth: 1.5,
    borderColor: Colors.dark.text2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: Colors.shared.cairoGold,
  },
  radioDot: {
    width: ms(10),
    height: ms(10),
    borderRadius: ms(5),
    backgroundColor: Colors.shared.cairoGold,
  },
  label: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  labelActive: {
    fontFamily: FontFamily.interSemi,
    color: Colors.dark.text1,
  },
  caption: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    flexShrink: 1,
  },
});
