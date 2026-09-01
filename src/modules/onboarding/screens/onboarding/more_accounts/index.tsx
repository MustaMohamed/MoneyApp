import { Separator, Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { SuccessChip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty_state';
import { ListCard } from '@/components/ui/list_card';
import { ScreenScroll } from '@/components/ui/screen';
import { Strings } from '@/constants/strings';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { OnboardingShell } from '@/modules/onboarding/components/onboarding_shell';
import {
  GhostNumeral,
  GoldRule,
} from '@/modules/onboarding/components/onboarding_shell/onboarding_broadsheet';
import { ms } from '@/utils/responsive';

import { AccountRow } from './components/account_row';
import { useMoreAccountsAnim } from './more_accounts.anim';
import { N3_HEADLINE_LINE_HEIGHT_RATIO, N3_HEADLINE_TRACKING_EM } from './more_accounts.geometry';
import { useMoreAccounts } from './more_accounts.hook';

/** mockup.html:2014, `.b-headline`; `Math.round` matches `lineHeightFor`'s own rounding. */
const N3_HEADLINE_TEXT_STYLE = {
  fontSize: Type.hero,
  lineHeight: Math.round(Type.hero * N3_HEADLINE_LINE_HEIGHT_RATIO),
  letterSpacing: Type.hero * N3_HEADLINE_TRACKING_EM,
} as const;

/** mockup.html:2015, `.t-body.dim { max-width: 290px }`. */
const N3_BODY_MAX_WIDTH = ms(290);

export default function MoreAccountsScreen() {
  const { accounts, handleAddAnother, handleAddFirstAccount, handleContinue, onBack, state } =
    useMoreAccounts();
  const { introEntering, listEntering } = useMoreAccountsAnim(accounts.length > 0);

  const onBackPress = () => {
    // `runOnboardingTransition` catches inside and resolves, so `void` discards no rejection.
    void onBack();
  };

  if (accounts.length === 0) {
    return (
      <OnboardingShell
        step={3}
        title={Strings.n3HeaderTitle}
        onBack={onBackPress}
        footnote={Strings.n3EmptyFootnote}
        statusMessage={state.statusMessage}
        cta={
          <Button
            variant="primary"
            flat
            label={Strings.n3EmptyCta}
            onPress={handleAddFirstAccount}
            isDisabled={state.busy}
          />
        }
      >
        <EmptyState variant="onboardingAccounts" />
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      step={3}
      title={Strings.n3HeaderTitle}
      onBack={onBackPress}
      footnote={Strings.n3Footnote}
      statusMessage={state.statusMessage}
      cta={
        <Button
          variant="primary"
          flat
          label={Strings.n3Cta}
          onPress={() => {
            void handleContinue();
          }}
          isDisabled={state.busy}
          isLoading={state.busy}
          loadingLabel={Strings.n3CtaBusy}
        />
      }
    >
      <>
        <GhostNumeral value={Strings.n3GhostNumeral} />
        <ScreenScroll
          contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg }}
        >
          <Animated.View entering={introEntering}>
            <SuccessChip label={Strings.n3SuccessChip} />

            <View style={{ marginTop: Spacing.sm }}>
              <GoldRule />
            </View>

            <View style={{ marginTop: Spacing.xs }}>
              <Typography className="text-foreground font-sora-bold" style={N3_HEADLINE_TEXT_STYLE}>
                {Strings.n3HeadlineLine1}
              </Typography>
              <Typography className="text-foreground font-sora-bold" style={N3_HEADLINE_TEXT_STYLE}>
                {Strings.n3HeadlineLine2}
              </Typography>
            </View>

            <Typography
              className="text-content-secondary font-inter"
              style={{
                fontSize: Type.body,
                lineHeight: lineHeightFor(Type.body),
                maxWidth: N3_BODY_MAX_WIDTH,
                marginTop: Spacing.xs,
              }}
            >
              {Strings.n3Body}
            </Typography>
          </Animated.View>

          <Animated.View entering={listEntering} style={{ marginTop: Spacing.lg }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: Spacing.xs,
                marginBottom: Spacing.xs,
              }}
            >
              {/* `n3ListLabel`, not `n3HeaderTitle`: byte-identical today, different meanings. */}
              <Typography
                className="text-content-secondary font-inter-semibold"
                style={{ fontSize: Type.detail, lineHeight: lineHeightFor(Type.detail) }}
              >
                {Strings.n3ListLabel}
              </Typography>
              <Typography
                className="text-content-secondary font-sora"
                style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
              >
                {String(accounts.length)}
              </Typography>
            </View>

            <ListCard>
              {/* Not virtualized: a `FlatList` nested in `ScreenScroll` virtualizes nothing. */}
              {accounts.map((account, index) => (
                <React.Fragment key={account.id}>
                  {/* `thickness` pins `Size.hairline` over `hairlineWidth()`, ~0.33dp at 3x. */}
                  {index > 0 ? <Separator thickness={Size.hairline} /> : null}
                  <AccountRow account={account} />
                </React.Fragment>
              ))}
            </ListCard>

            {/* The ratified 48 CTA track (spec disagreements 6), not ms(52) — same shape as the footer's. */}
            <View
              style={{
                height: Size.onboardingCtaTrack,
                justifyContent: 'center',
                marginTop: Spacing.md,
              }}
            >
              <Button
                variant="secondary"
                flat
                icon="plus"
                label={Strings.n3AddAnother}
                onPress={handleAddAnother}
              />
            </View>
          </Animated.View>
        </ScreenScroll>
      </>
    </OnboardingShell>
  );
}
