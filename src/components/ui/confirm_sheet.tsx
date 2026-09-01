import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Alert } from 'heroui-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Colors, FontFamily, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

const ICON_CONTAINER_SIZE = ms(56);
const ICON_SIZE = ms(28);

interface ConfirmSheetProps {
  isOpen: boolean;
  /** Called on every close path (swipe, overlay, button, programmatic); a no-op while busy. */
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  errorMessage?: string;
  destructive?: boolean;
}

export function ConfirmSheet({
  isOpen,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy = false,
  errorMessage,
  destructive = false,
}: ConfirmSheetProps) {
  const handleOpenChange = (open: boolean) => {
    if (busy) return;
    onOpenChange(open);
  };

  const iconContainerBg = destructive ? Colors.dark.dangerBg : Colors.dark.warningBg;
  const iconColor = destructive ? Colors.dark.negative : Colors.dark.warning;
  const iconName = destructive ? 'trash-can-outline' : 'alert-circle-outline';

  return (
    <Sheet isOpen={isOpen} onOpenChange={handleOpenChange} fitContent>
      <View
        className="items-center"
        style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg }}
      >
        <View
          style={{
            width: ICON_CONTAINER_SIZE,
            height: ICON_CONTAINER_SIZE,
            borderRadius: ICON_CONTAINER_SIZE / 2,
            backgroundColor: iconContainerBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: Spacing.md,
          }}
        >
          <MaterialCommunityIcons name={iconName} size={ICON_SIZE} color={iconColor} />
        </View>

        <Text
          style={{
            fontFamily: FontFamily.soraSemi,
            fontSize: Type.subhead,
            lineHeight: lineHeightFor(Type.subhead),
            textAlign: 'center',
            marginBottom: Spacing.xs,
          }}
          className="text-foreground"
        >
          {title}
        </Text>

        <Text
          style={{
            fontFamily: FontFamily.interRegular,
            fontSize: Type.body,
            textAlign: 'center',
            lineHeight: lineHeightFor(Type.body),
          }}
          className="text-muted"
        >
          {body}
        </Text>

        {errorMessage ? (
          <Alert status="danger" className="mt-4 w-full">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{errorMessage}</Alert.Title>
            </Alert.Content>
          </Alert>
        ) : null}

        <View style={{ flexDirection: 'row', marginTop: Spacing.lg }} className="gap-3">
          <View style={{ flex: 1 }}>
            <Button variant="ghost" label={cancelLabel} onPress={onCancel} isDisabled={busy} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant={destructive ? 'danger' : 'primary'}
              label={confirmLabel}
              isLoading={busy}
              isDisabled={busy}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Sheet>
  );
}
