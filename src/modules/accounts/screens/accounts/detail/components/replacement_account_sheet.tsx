import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Radio, RadioGroup } from 'heroui-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { SHEET_FOOTER_CLEARANCE, Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { AccountColorTile } from '@/modules/accounts/components/account_color_tile';
import type { AccountCommitmentRef } from '@/modules/commitments/database/commitments';
import { resolveAccountName } from '@/utils/account_name';
import { formatCurrencyAmount } from '@/utils/format_amount';

import type { Account } from '../../../../store/account.store';
import {
  buildReplacementCommitmentRow,
  resolveMoveSheetCopy,
} from './replacement_account_sheet.helpers';
import { useReplacementAccountSheet } from './replacement_account_sheet.hook';

interface ReplacementAccountSheetProps {
  account: Account;
  commitments: Readonly<AccountCommitmentRef[]>;
  options: Account[];
}

const bodyStyle = { fontSize: Type.body, lineHeight: lineHeightFor(Type.body) };
const nameStyle = { fontSize: Type.bodyStrong, lineHeight: lineHeightFor(Type.bodyStrong) };
const captionStyle = { fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) };

export function ReplacementAccountSheet({
  account,
  commitments,
  options,
}: ReplacementAccountSheetProps) {
  const {
    state: { isOpen, selectedId, busy, errorMessage },
    selectReplacement: onSelect,
    closeReplacement: onCancel,
    handleMoveAndDelete,
  } = useReplacementAccountSheet({ account, commitments, options });
  const onConfirm = () => {
    void handleMoveAndDelete();
  };
  const { title, body } = resolveMoveSheetCopy({
    commitments,
    accountName: resolveAccountName(account),
  });

  const footer = (
    <View style={{ flexDirection: 'row' }} className="gap-3">
      <View style={{ flex: 1 }}>
        <Button
          variant="ghost"
          flat
          label={Strings.accountDetailCancel}
          onPress={onCancel}
          isDisabled={busy}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Button
          variant="danger"
          flat
          label={Strings.accountDetailMoveAndDelete}
          loadingLabel={Strings.accountDetailMoveAndDelete}
          isLoading={busy}
          isDisabled={busy}
          onPress={onConfirm}
        />
      </View>
    </View>
  );

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={title}
      size="lg"
      scrollable
      isDismissable={!busy}
      footer={footer}
    >
      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: SHEET_FOOTER_CLEARANCE }}
      >
        <View style={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs }}>
          <Text className="font-inter text-muted" style={bodyStyle}>
            {body}
          </Text>
          {errorMessage ? (
            <Text className="font-inter text-danger mt-2" style={bodyStyle}>
              {errorMessage}
            </Text>
          ) : null}
        </View>

        {commitments.map(buildReplacementCommitmentRow).map((row) => (
          <View
            key={row.id}
            testID={`replacement-commitment-row-${row.id}`}
            className="border-separator border-b px-4 py-3"
          >
            <Text
              className="font-sora-semibold text-foreground"
              style={nameStyle}
              numberOfLines={1}
            >
              {row.name}
            </Text>
            <Text className="font-inter text-muted" style={captionStyle}>
              {Strings.accountDetailMoveCommitmentCaption(row.amount, row.cadence, row.nextDate)}
            </Text>
          </View>
        ))}

        <RadioGroup value={selectedId} onValueChange={onSelect} isDisabled={busy}>
          {options.map((item) => (
            <RadioGroup.Item
              key={item.id}
              value={item.id}
              testID={`replacement-account-row-${item.id}`}
              className="border-separator min-h-14 gap-3 border-b px-4 py-3"
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <AccountColorTile
                color={item.color}
                type={item.type}
                size={Size.accountTile}
                glyphSize={Size.iconXs}
              />
              <View style={{ flex: 1 }}>
                <Text
                  className="font-sora-semibold text-foreground"
                  style={nameStyle}
                  numberOfLines={1}
                >
                  {resolveAccountName(item)}
                </Text>
                <Text className="font-inter text-muted" style={captionStyle}>
                  {formatCurrencyAmount(item.current_balance, item.currency)}
                </Text>
              </View>
              <Radio testID={`replacement-account-row-${item.id}-selected`} />
            </RadioGroup.Item>
          ))}
        </RadioGroup>
      </BottomSheetScrollView>
    </Sheet>
  );
}
