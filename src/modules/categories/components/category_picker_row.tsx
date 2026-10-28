import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { FormPickerRow } from '@/components/ui/form_picker_row';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Category } from '@/modules/categories/entities/category.entity';
import { toIconName } from '@/utils/icon_name_guard';

interface CategoryPickerRowProps {
  label: string;
  category: Category | undefined;
  onPress: () => void;
  testID: string;
  disabled?: boolean;
  accessibilityHint?: string;
}

/** A form card's Category row in its cell: the chosen category's icon and name, or the pick prompt, then a chevron. */
export function CategoryPickerRow({
  label,
  category,
  onPress,
  testID,
  disabled,
  accessibilityHint,
}: CategoryPickerRowProps): React.ReactElement {
  return (
    <FormPickerRow
      testID={testID}
      divider={false}
      onPress={onPress}
      disabled={disabled}
      label={label}
      accessibilityHint={accessibilityHint}
      value={category?.name ?? Strings.addTxPickCategoryTitle}
      prefix={
        <MaterialCommunityIcons
          name={category ? toIconName(category.icon, 'tag') : 'tag-outline'}
          size={Size.filterSegmentIcon}
          color={category?.color ?? CoreTokens.text1}
        />
      }
      suffix={
        <MaterialCommunityIcons name="chevron-right" size={Size.iconSm} color={CoreTokens.text2} />
      }
    />
  );
}
