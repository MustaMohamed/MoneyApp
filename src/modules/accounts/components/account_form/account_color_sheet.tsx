import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { RadioGroup, Typography } from 'heroui-native';
import React, { useRef } from 'react';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Sheet, SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { Strings } from '@/constants/strings';
import { Radius, Size, Spacing } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { findAccountColor } from '@/modules/accounts/constants/account_palette';
import { ms } from '@/utils/responsive';

import {
  ACCOUNT_COLOR_CELL_PADDING,
  ACCOUNT_COLOR_CELL_RING_WIDTH,
  ACCOUNT_COLOR_GRID_METRICS,
  accountColorSwatchLabel,
  resolveAccountColorGrid,
} from './account_color_sheet.geometry';
import { useAccountColorSheetState } from './account_color_sheet.state';

export interface AccountColorSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (hex: string) => void;
}

const { cellWidth, cellHeight, hitSlopX } = ACCOUNT_COLOR_GRID_METRICS;
const gridBlocks = resolveAccountColorGrid();

/**
 * The 32-colour bottom sheet (MA-006). fitContent per plan step 0.1 — the
 * grid's content height is nearly fixed across supported widths, and every
 * `size` percentage clips it somewhere in that range. Nothing scrolls: no
 * @gorhom/bottom-sheet import appears in this file.
 */
export function AccountColorSheet({ isOpen, onOpenChange, onConfirm }: AccountColorSheetProps) {
  const stagedColor = useAccountColorSheetState((s) => s.stagedColor);
  const stage = useAccountColorSheetState.getState().stage;

  // Keep the last staged colour visible while the sheet animates out. close()
  // clears stagedColor synchronously in the store (its own unit-tested
  // contract — account_color_sheet.state.test.ts), but the sheet keeps
  // rendering for the length of the dismiss animation. Without this the grid
  // deselects and the preview row falls into its findAccountColor miss
  // branch mid-dismiss. Plan step 5 / plan review point 8.
  const lastStagedRef = useRef<string | undefined>(stagedColor);
  if (stagedColor !== undefined) lastStagedRef.current = stagedColor;
  const staged = isOpen ? stagedColor : lastStagedRef.current;

  // Commit from the live store, not from `staged` — `staged` is a display
  // value that deliberately survives close() so the grid does not visibly
  // deselect during the dismiss animation (see the ref above). The footer
  // stays mounted and touchable for the length of that animation (heroui
  // only early-returns the Overlay on !isOpen), so a tap landing there must
  // still be guarded by the store's own cleared state, or a discarded colour
  // can be committed. Round 1 implementation review, defect D1.
  const handleConfirm = () => {
    if (stagedColor !== undefined) onConfirm(stagedColor);
    onOpenChange(false);
  };

  const handleCloseComplete = () => {
    lastStagedRef.current = undefined;
  };

  const previewEntry = findAccountColor(staged ?? '');
  const previewCaption = gridBlocks.find((block) => block.tone === previewEntry?.tone)?.caption;

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onCloseComplete={handleCloseComplete}
      title={Strings.accountColorSheetTitle}
      fitContent
      footer={
        <Button variant="primary" label={Strings.accountColorSheetCta} onPress={handleConfirm} />
      }
    >
      <Box
        style={{
          paddingHorizontal: Spacing.md,
          paddingTop: Spacing.xs,
          paddingBottom: SHEET_FOOTER_CLEARANCE,
        }}
      >
        {/* Preview row */}
        <Box
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
            borderWidth: 1,
            borderRadius: Radius.md,
            padding: Spacing.sm,
            marginBottom: Spacing.md,
          }}
          className="bg-surface-secondary border-border"
        >
          <Box
            style={{
              width: Size.typeIconBox,
              height: Size.typeIconBox,
              borderRadius: Radius.sm,
              backgroundColor: staged,
            }}
          />
          <Box style={{ flex: 1 }} accessibilityLiveRegion="polite">
            <Typography className="font-sora-semibold text-foreground text-[16px]">
              {previewEntry?.familyLabel ?? Strings.accountColorCustom}
            </Typography>
            {previewEntry ? (
              <Typography className="font-inter text-content-secondary mt-1 text-[11.5px]">
                {previewCaption}
              </Typography>
            ) : null}
          </Box>
        </Box>

        <RadioGroup value={staged} onValueChange={stage} style={{ gap: Spacing.md }}>
          {gridBlocks.map((block) => (
            <Box key={block.tone}>
              <Box
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  gap: Spacing.xs,
                  marginBottom: 6,
                }}
              >
                <Typography className="font-inter-semibold text-foreground text-[11.5px]">
                  {block.label}
                </Typography>
                <Typography className="font-inter text-content-secondary text-[11px]">
                  {block.hint}
                </Typography>
              </Box>
              <Box style={{ gap: Spacing.xxs }}>
                {block.rows.map((row, rowIndex) => (
                  <Box
                    key={`${block.tone}-row-${rowIndex}`}
                    style={{ flexDirection: 'row', gap: Spacing.xxs }}
                  >
                    {row.map((entry) => (
                      <RadioGroup.Item
                        key={entry.hex}
                        value={entry.hex}
                        testID={`color-swatch-${entry.family}-${entry.tone}`}
                        accessibilityLabel={accountColorSwatchLabel(entry)}
                        hitSlop={{ left: hitSlopX, right: hitSlopX, top: 0, bottom: 0 }}
                        style={{
                          width: cellWidth,
                          height: cellHeight,
                          padding: ACCOUNT_COLOR_CELL_PADDING,
                        }}
                      >
                        {({ isSelected }) => (
                          <>
                            <Box
                              style={{
                                flex: 1,
                                alignSelf: 'stretch',
                                borderRadius: Radius.sm,
                                backgroundColor: entry.hex,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {isSelected ? (
                                <MaterialCommunityIcons
                                  name="check-bold"
                                  size={ms(15)}
                                  color={entry.tickColor}
                                />
                              ) : null}
                            </Box>
                            {isSelected ? (
                              <Box
                                pointerEvents="none"
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  borderRadius: Radius.md,
                                  borderWidth: ACCOUNT_COLOR_CELL_RING_WIDTH,
                                  borderColor: CoreTokens.text1,
                                }}
                              />
                            ) : null}
                          </>
                        )}
                      </RadioGroup.Item>
                    ))}
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </RadioGroup>
      </Box>
    </Sheet>
  );
}
