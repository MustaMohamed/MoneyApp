import { ListGroup, Separator, Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { SuccessChip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty_state';
import { ScreenScroll } from '@/components/ui/screen';
import { Strings } from '@/constants/strings';
import { Radius, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
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

/**
 * Both headline lines share one text style — the mockup draws them as a single
 * `.b-headline` split by a `<br>` (mockup.html:2014). `Math.round` matches
 * `lineHeightFor`'s own rounding (theme.ts:124-126) and avoids a sub-pixel
 * line box.
 */
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
  const { introEntering, listEntering } = useMoreAccountsAnim();

  const onBackPress = () => {
    // onBack and handleContinue below both catch their own failure inside
    // runOnboardingTransition and resolve; void discards no rejection.
    void onBack();
  };

  /**
   * E3, the honest dead end — mockup § E frame E3. No ghost numeral, no gold
   * rule, no success chip and no headline block: the Broadsheet composition
   * belongs to the populated screen (S14). The shell keeps its header, back
   * chevron and progress rail. The early return sits after both hooks so the
   * rules of hooks hold; the entering values simply go unused, which is what
   * "E3 skips the animations" means — it has no blocks, not no hook.
   */
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
          {/* Block 1 — chip, gold rule, headline, body. */}
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

          {/* Block 2 — count slab, list group, secondary action. The list
              itself never animates (S6). */}
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
              {/* n3ListLabel, not n3HeaderTitle — the two are byte-identical
                  today and mean different things; the header title is passed
                  to the shell above. */}
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

            {/* The Surface trap (§5.2), invisible to every CI check. ListGroup
                is Surface-based and `.surface__root` resolves to `p-4
                rounded-3xl shadow-surface overflow-hidden` with no border,
                ever — so the border, the radius and `p-0` are each required.
                `shadow-none` loses to the custom --shadow-surface token; the
                `elevation`/`shadowOpacity` pair below does not beat it either,
                because uniwind keys that token as `boxShadow`, a separate RN
                pipeline (measured on device). Kept for consistency with the
                other Surface call sites (debt:quality #246). */}
            <ListGroup
              className="border-separator p-0"
              style={{
                borderWidth: Size.hairline,
                borderRadius: Radius.lg,
                elevation: 0,
                shadowOpacity: 0,
              }}
            >
              {accounts.map((account, index) => (
                <React.Fragment key={account.id}>
                  {/* Full bleed, and drawn by the parent: with `index` gone from
                      AccountRow the row cannot know it is first. `thickness`
                      pins Size.hairline over the variant class's
                      hairlineWidth(), which is ~0.33dp on a 3x device against
                      the group border's 1. */}
                  {index > 0 ? <Separator thickness={Size.hairline} /> : null}
                  <AccountRow account={account} />
                </React.Fragment>
              ))}
            </ListGroup>

            {/* 48pt button centred in a reserved 52 slot — the shape the scope
                spec already settled for the footer CTA, reused rather than
                forcing a height onto the primitive. */}
            <View
              style={{
                height: Size.ctaHeight,
                justifyContent: 'center',
                marginTop: Spacing.md,
              }}
            >
              <Button variant="secondary" label={Strings.n3AddAnother} onPress={handleAddAnother} />
            </View>
          </Animated.View>
        </ScreenScroll>
      </>
    </OnboardingShell>
  );
}
