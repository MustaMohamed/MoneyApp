import { cn } from 'heroui-native';
import { View } from 'react-native';

import { DangerRing } from '@/components/ui/danger_ring';

type FormFactCellProps = { children: React.ReactNode; divider?: boolean } & (
  | { fault?: never; ringTestID?: never }
  | { fault: string | undefined; ringTestID: string }
);

/** No HeroUI primitive fits: a `ListCard` cell that holds any row and rings it while `fault` stands. */
export function FormFactCell(props: FormFactCellProps): React.ReactElement {
  return (
    // Canvas `.fact`: 16 inset, a hairline under every fact but the last (Note).
    <View className={cn('px-4', props.divider !== false && 'border-separator border-b')}>
      {props.children}
      {props.fault !== undefined ? <DangerRing testID={props.ringTestID} /> : null}
    </View>
  );
}
