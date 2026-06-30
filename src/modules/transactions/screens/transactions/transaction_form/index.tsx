/**
 * §7 Add / Edit Transaction sheets.
 *
 * Uses the HeroUI-backed `Sheet` primitive at `components/ui/sheet.tsx`.
 * The primitive provides: title + close button + sticky footer slot +
 * declarative `isOpen`/`onOpenChange` API. No refs, no imperative `.show()`
 * calls (V1's source of jank).
 *
 * PortalHost prerequisite (see spec §4.2.9): `app/_layout.tsx` mounts
 * `<PortalHost />` so `Sheet.Portal` has a host to render into. This was
 * the root cause of the "sheet won't open" symptom caught in Wave 1 QA.
 */
import { router } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AccountPickerSheet } from '@/modules/accounts/components/account_picker_sheet';
import { CategoryPickerSheet } from '@/modules/categories/components/category_picker_sheet';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

import { useAddTransaction } from './add_transaction.hook';
import { NoAccountsEmpty } from './components/no_accounts_empty';
import { useEditTransaction } from './edit_transaction.hook';
import { TransactionFormBody } from './transaction_form_body';

interface AddProps {
  visible: boolean;
  onClose: () => void;
}

const ADD_TRANSACTION_CLOSE_UNMOUNT_DELAY_MS = 350;

export function AddTransactionSheet({ visible, onClose }: AddProps): React.ReactElement | null {
  const [readyToOpen, setReadyToOpen] = useState(false);
  const [shouldRenderInner, setShouldRenderInner] = useState(false);
  const [footer, setFooter] = useState<React.ReactNode | undefined>(undefined);

  useEffect(() => {
    if (!visible) {
      setReadyToOpen(false);
      const timer = setTimeout(() => {
        setShouldRenderInner(false);
      }, ADD_TRANSACTION_CLOSE_UNMOUNT_DELAY_MS);
      return () => clearTimeout(timer);
    }

    setReadyToOpen(false);
    const timer = setTimeout(() => {
      setShouldRenderInner(true);
      setReadyToOpen(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (!shouldRenderInner) setFooter(undefined);
  }, [shouldRenderInner]);

  if (!visible && !readyToOpen && !shouldRenderInner) return null;

  return (
    <Sheet
      isOpen={visible && readyToOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={Strings.addTxTitle}
      size="lg"
      scrollable
      footer={footer}
    >
      {shouldRenderInner ? (
        <AddTransactionSheetInner
          visible={visible && readyToOpen}
          onClose={onClose}
          setFooter={setFooter}
        />
      ) : null}
    </Sheet>
  );
}

type AddTransactionSheetInnerProps = AddProps & {
  setFooter: (footer: React.ReactNode | undefined) => void;
};

function AddTransactionSheetInner({
  visible,
  onClose,
  setFooter,
}: AddTransactionSheetInnerProps): React.ReactElement {
  const hook = useAddTransaction(onClose);
  const handleSaveRef = useRef(hook.handleSave);
  handleSaveRef.current = hook.handleSave;

  const handleAddAccount = useCallback(() => {
    onClose();
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- expo-router typed route string
    router.push('/accounts/add' as unknown as Parameters<typeof router.push>[0]);
  }, [onClose]);

  useLayoutEffect(() => {
    setFooter(
      hook.state.hasAccounts ? (
        <Button
          variant="primary"
          label={Strings.addTxSaveCta}
          isLoading={hook.state.saving}
          onPress={() => void handleSaveRef.current()}
        />
      ) : undefined,
    );
  }, [hook.state.hasAccounts, hook.state.saving, setFooter]);

  return (
    <>
      {hook.state.hasAccounts ? (
        <TransactionFormBody
          visible={visible}
          locked={false}
          type={hook.state.type}
          onSelectType={hook.setType}
          amountStr={hook.state.amountStr}
          setAmountStr={hook.setAmountStr}
          amountError={hook.state.errors.amount}
          selectedAccount={hook.state.selectedAccount}
          onOpenAccountPicker={() => hook.setShowAccountPicker(true)}
          accountError={hook.state.errors.account}
          selectedToAccount={hook.state.selectedToAccount}
          onOpenToPicker={() => hook.setShowToPicker(true)}
          toAccountError={hook.state.errors.toAccount}
          selectedCategory={hook.state.selectedCategory}
          onOpenCategoryPicker={() => hook.setShowCategoryPicker(true)}
          categoryError={hook.state.errors.category}
          isUSD={hook.state.isUSD}
          exchangeRate={hook.state.exchangeRate}
          setExchangeRate={hook.setExchangeRate}
          rateOverride={hook.state.rateOverride}
          toggleRateOverride={hook.toggleRateOverride}
          rateUpdatedAt={hook.state.rateUpdatedAt}
          rateError={hook.state.errors.rate}
          date={hook.state.date}
          setDate={hook.setDate}
          note={hook.state.note}
          setNote={hook.setNote}
          currency={hook.state.selectedAccount?.currency ?? Currency.EGP}
        />
      ) : (
        <NoAccountsEmpty onAddAccount={handleAddAccount} />
      )}

      <AccountPickerSheet
        isOpen={hook.state.showAccountPicker}
        title={
          hook.state.isTransferOrCC ? Strings.addTxPickFromTitle : Strings.addTxPickAccountTitle
        }
        accounts={hook.state.accountsForFrom}
        selectedId={hook.state.accountId}
        onSelect={hook.selectAccount}
        onOpenChange={() => hook.setShowAccountPicker(false)}
      />
      <AccountPickerSheet
        isOpen={hook.state.showToPicker}
        title={Strings.addTxPickToTitle}
        accounts={hook.state.accountsForTo}
        selectedId={hook.state.toAccountId}
        excludeId={hook.state.accountId}
        onSelect={hook.selectToAccount}
        onOpenChange={() => hook.setShowToPicker(false)}
      />
      <CategoryPickerSheet
        isOpen={hook.state.showCategoryPicker}
        title={Strings.addTxPickCategoryTitle}
        categories={hook.state.visibleCategories}
        selectedId={hook.state.categoryId}
        onSelect={hook.selectCategory}
        onOpenChange={() => hook.setShowCategoryPicker(false)}
      />
    </>
  );
}

interface EditProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
  tx: Transaction | null;
}

export function EditTransactionSheet({
  visible,
  onClose,
  onSaved,
  tx,
}: EditProps): React.ReactElement | null {
  if (!tx) return null;
  return <EditSheetInner visible={visible} tx={tx} onClose={onClose} onSaved={onSaved} />;
}

function EditSheetInner({
  visible,
  tx,
  onClose,
  onSaved,
}: {
  visible: boolean;
  tx: Transaction;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const hook = useEditTransaction(tx, onClose, onSaved);

  return (
    <>
      <Sheet
        isOpen={visible}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title={Strings.editTxTitle}
        size="lg"
        scrollable
        footer={
          <Button
            variant="primary"
            label={Strings.editTxSaveCta}
            isLoading={hook.state.saving}
            onPress={() => void hook.handleSave()}
          />
        }
      >
        <TransactionFormBody
          visible={visible}
          locked={true}
          type={hook.state.type}
          onSelectType={() => {}}
          amountStr={hook.state.amountStr}
          setAmountStr={hook.setAmountStr}
          amountError={hook.state.errors.amount}
          selectedAccount={hook.state.selectedAccount}
          onOpenAccountPicker={() => {}}
          accountError={undefined}
          selectedToAccount={hook.state.selectedToAccount}
          onOpenToPicker={() => {}}
          toAccountError={undefined}
          selectedCategory={hook.state.selectedCategory}
          onOpenCategoryPicker={() => hook.setShowCategoryPicker(true)}
          categoryError={hook.state.errors.category}
          isUSD={hook.state.isUSD}
          exchangeRate={hook.state.exchangeRate}
          setExchangeRate={hook.setExchangeRate}
          rateOverride={hook.state.rateOverride}
          toggleRateOverride={hook.toggleRateOverride}
          rateUpdatedAt={hook.state.rateUpdatedAt}
          rateError={hook.state.errors.rate}
          date={hook.state.date}
          setDate={hook.setDate}
          note={hook.state.note}
          setNote={hook.setNote}
          currency={hook.state.selectedAccount?.currency ?? Currency.EGP}
        />
      </Sheet>

      <CategoryPickerSheet
        isOpen={hook.state.showCategoryPicker}
        title={Strings.addTxPickCategoryTitle}
        categories={hook.state.visibleCategories}
        selectedId={hook.state.categoryId}
        onSelect={hook.selectCategory}
        onOpenChange={() => hook.setShowCategoryPicker(false)}
      />
    </>
  );
}
