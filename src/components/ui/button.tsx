import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button as HButton, Spinner, cn, type ButtonSize, type ButtonVariant } from 'heroui-native';
import React from 'react';
import { StyleSheet, type PressableProps } from 'react-native';

import { Colors, Size } from '@/constants/theme';
import { GoldTokens, SemanticTokens } from '@/constants/theme_tokens';

import { resolveButtonContent, resolveFlatRadius } from './button.content';

// CTAs are Sora (.claude/rules/ui.md; mockup `.cta` uses the display face at 600) — HeroUI's own label ships Inter medium.
const CTA_LABEL_FONT = 'font-sora-semibold';

interface ButtonBaseProps extends Omit<PressableProps, 'children' | 'disabled'> {
  size?: ButtonSize;
  label: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  /** RN convention. When set and `isDisabled` is not, maps to HeroUI Native's `isDisabled`. */
  disabled?: boolean;
  /** When `isLoading`, replaces `Strings.loading` as the button text. */
  loadingLabel?: string;
  /** Leading glyph before the label — the flat secondary's plus (mockup `.cta.sec svg`); renders foreground. */
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  className?: string;
}

// `flat` is the redesigned screens' treatment at Radius.cta — primary: accent fill, no gradient; secondary: foreground label (mockup `.cta`/`.cta.sec`; spec.md § Known disagreements 1).
/** Only the flat secondary paints `tone` (the account detail's Archive), so the union stops every other shape naming it. */
export type ButtonProps = ButtonBaseProps &
  (
    | { variant: 'secondary'; flat: true; tone?: 'danger' }
    | { variant?: ButtonVariant; flat?: boolean; tone?: never }
  );

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  isDisabled,
  disabled,
  label,
  loadingLabel,
  flat,
  icon,
  tone,
  className,
  ...props
}: ButtonProps) {
  const disabledState = isDisabled ?? disabled;
  const { text, showSpinner, spinnerColor } = resolveButtonContent({
    variant,
    label,
    isLoading,
    loadingLabel,
  });

  if (variant === 'primary' && flat) {
    return (
      <HButton
        variant="primary"
        size={size}
        isDisabled={disabledState}
        className={className}
        {...props}
        style={resolveFlatRadius({ variant, flat })}
      >
        {showSpinner ? <Spinner size="sm" color={spinnerColor} /> : null}
        <HButton.Label className={CTA_LABEL_FONT}>{text}</HButton.Label>
      </HButton>
    );
  }

  if (variant === 'primary') {
    return (
      <HButton
        variant="primary"
        size={size}
        isDisabled={disabledState}
        className={cn('overflow-hidden bg-transparent', className)}
        {...props}
      >
        <LinearGradient
          colors={[GoldTokens[400], GoldTokens[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 13 }]}
          pointerEvents="none"
        />
        {showSpinner ? <Spinner size="sm" color={spinnerColor} /> : null}
        <HButton.Label className={cn(CTA_LABEL_FONT, 'text-accent-foreground')}>
          {text}
        </HButton.Label>
      </HButton>
    );
  }

  const flatSecondary = flat === true && variant === 'secondary';
  const isDanger = flatSecondary && tone === 'danger';
  return (
    <HButton
      variant={variant}
      size={size}
      isDisabled={disabledState}
      className={className}
      {...props}
      style={resolveFlatRadius({ variant, flat })}
      // A glyph sibling stops RN deriving the label from the text child — restate it.
      accessibilityLabel={icon ? text : undefined}
    >
      {showSpinner ? <Spinner size="sm" color={spinnerColor} /> : null}
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={Size.iconSm}
          color={isDanger ? SemanticTokens.negative : Colors.dark.text1}
        />
      ) : null}
      <HButton.Label
        className={cn(
          CTA_LABEL_FONT,
          isDanger ? 'text-danger' : flatSecondary ? 'text-foreground' : undefined,
        )}
      >
        {text}
      </HButton.Label>
    </HButton>
  );
}
