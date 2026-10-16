import { Typography } from 'heroui-native';
import { View, useWindowDimensions } from 'react-native';

import { LogoMark } from '@/components/ui/logo_mark';
import { StackHeader } from '@/components/ui/stack_header';
import { resolveStackHeaderGeometry } from '@/components/ui/stack_header.geometry';
import { Strings } from '@/constants/strings';
import { Spacing, Type, lineHeightFor } from '@/constants/theme';

/** A titled step always takes its back handler; omit both for the N1 brand header. */
export type OnboardingHeaderProps =
  | { title: string; onBack: () => void }
  | { title?: undefined; onBack?: undefined };

export function OnboardingHeader(props: OnboardingHeaderProps) {
  const { fontScale } = useWindowDimensions();

  if (props.title !== undefined) return <StackHeader title={props.title} onBack={props.onBack} />;

  const geometry = resolveStackHeaderGeometry(fontScale);

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', height: geometry.height }}
      className="border-separator justify-between border-b px-2"
    >
      {/* Grouping the mark and wordmark stops `justify-between` centring the wordmark. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
        <LogoMark />
        <Typography
          className="font-sora-bold"
          style={{ fontSize: Type.subhead, lineHeight: lineHeightFor(Type.subhead) }}
        >
          {Strings.appName}
        </Typography>
      </View>
      <Typography
        className="text-content-secondary"
        style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
      >
        {Strings.n1HeaderSetup}
      </Typography>
    </View>
  );
}
