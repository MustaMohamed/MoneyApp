import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Alert } from 'heroui-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

const ICON_CONTAINER_SIZE = ms(56);
const ICON_SIZE = ms(28);

interface ConfirmSheetProps {
  isOpen: boolean;
  /**
   * Called on ALL close paths (swipe, overlay, close button, programmatic).
   * When busy=true this is a no-op — the sheet cannot be closed.
   */
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  errorMessage?: string;
  /**
   * When true: trash-can icon in dangerBg circle + danger (red) confirm button.
   * Default false — retains the existing amber warning-circle + primary button.
   * Existing callers (commitments SkipConfirmSheet) are untouched because they
   * do not pass this prop.
   */
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
  // Q2 guard: when busy, suppress all close paths so the sheet stays open
  // while an async operation is in flight. Same semantics as the legacy
  // onClose={() => {}} guard — now applied to all-path onOpenChange.
  // Callers are responsible for wiring cancel logic into onOpenChange
  // (e.g. onOpenChange={(open) => { if (!open) onCancel(); }}).
  const handleOpenChange = (open: boolean) => {
    if (busy) return;
    onOpenChange(open);
  };

  const iconContainerBg = destructive ? Colors.dark.dangerBg : Colors.dark.warningBg;
  const iconColor = destructive ? Colors.dark.negative : Colors.dark.warning;
  const iconName = destructive ? 'trash-can-outline' : 'alert-circle-outline';

  return (
    // fitContent: sheet hugs content height — no wasted space for a ~120px
    // decision sheet. No title prop: we render our own centered header below.
    // No X close button: Cancel + swipe + overlay-tap handle all dismiss paths.
    <Sheet isOpen={isOpen} onOpenChange={handleOpenChange} fitContent>
      <View
        className="items-center"
        style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg }}
      >
        {/* Icon in tinted circular container — warning (amber) or danger (red) */}
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

        {/* Title — Sora semibold, centered */}
        <Text
          style={{
            fontFamily: FontFamily.soraSemi,
            fontSize: Type.subhead,
            textAlign: 'center',
            marginBottom: Spacing.xs,
          }}
          className="text-foreground"
        >
          {title}
        </Text>

        {/* Body — Inter, muted, centered */}
        <Text
          style={{
            fontFamily: FontFamily.interRegular,
            fontSize: Type.body,
            textAlign: 'center',
            lineHeight: Type.body * 1.5,
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

        {/* Cancel / Confirm button row */}
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
