import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function toIconName(icon: string | null | undefined, fallback: IconName): IconName {
  if (!icon) return fallback;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- icon values are written exclusively through this app's icon-picker UI; all stored strings are valid IconName members
  return icon as IconName;
}
