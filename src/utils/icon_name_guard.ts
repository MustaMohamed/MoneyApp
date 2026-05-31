import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * Cast a string stored in the database to the MaterialCommunityIcons IconName
 * union type. The DB schema enforces that icon values are written through this
 * app (via the icon-picker UI), so every stored value is a valid member of the
 * union. A full 7 000-entry runtime lookup is impractical; this helper
 * centralises the cast with a clear audit trail.
 */
export function toIconName(icon: string | null | undefined, fallback: IconName): IconName {
  if (!icon) return fallback;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- icon values are written exclusively through this app's icon-picker UI; all stored strings are valid IconName members
  return icon as IconName;
}
