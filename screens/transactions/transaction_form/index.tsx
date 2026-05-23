/**
 * §7 Add / Edit Transaction sheets.
 *
 * Spec originally targeted HeroUI Native's `BottomSheet` primitive. On-device
 * smoke test surfaced a "sheet won't open" symptom that we couldn't reproduce
 * in a controlled environment without device logs. Switched to the project's
 * `Sheet` wrapper at `components/ui/sheet.tsx` — the same wrapper §3-§6 sheets
 * use successfully. The HeroUI primitive remains available in node_modules
 * (`heroui-native`) for a future bundle that revisits portal setup.
 *
 * The Sheet wrapper provides: title + close button + sticky footer slot +
 * declarative `visible` prop. No refs, no ActionSheet ref-based imperative
 * `.show()` calls (V1's source of jank).
 */
import { router } from 'expo-router';
import { useCallback } from 'react';

import { Sheet } from '@/components/ui/sheet';
import { Strings } from '@/constants/strings';
import type { Transaction } from '@/database/entities/transaction.entity';

import { useAddTransaction } from './add_transaction.hook';
import { AccountPickerSheet } from './components/account_picker_sheet';
import { CategoryPickerSheet } from './components/category_picker_sheet';
import { NoAccountsEmpty } from './components/no_accounts_empty';
import { SaveCta } from './components/save_cta';
import { useEditTransaction } from './edit_transaction.hook';
import { TransactionFormBody } from './transaction_form_body';

interface AddProps {
  visible: boolean;
  onClose: () => void;
}

export function AddTransactionSheet({ visible, onClose }: AddProps): React.ReactElement | null {
  const hook = useAddTransaction(onClose);

  const handleAddAccount = useCallback(() => {
    onClose();
    router.push('/accounts/add' as any);
  }, [onClose]);

  return (
    <>
      <Sheet
        visible={visible}
        onClose={onClose}
        title={Strings.addTxTitle}
        size="lg"
        footer={
          hook.state.hasAccounts ? (
            <SaveCta
              saving={hook.state.saving}
              onPress={hook.handleSave}
              label={Strings.addTxSaveCta}
            />
          ) : undefined
        }
      >
        <Sheet.Body>
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
              currency={hook.state.selectedAccount?.currency ?? ('EGP' as any)}
            />
          ) : (
            <NoAccountsEmpty onAddAccount={handleAddAccount} />
          )}
        </Sheet.Body>
      </Sheet>

      <AccountPickerSheet
        visible={hook.state.showAccountPicker}
        title={
          hook.state.isTransferOrCC ? Strings.addTxPickFromTitle : Strings.addTxPickAccountTitle
        }
        accounts={hook.state.accountsForFrom}
        selectedId={hook.state.accountId}
        onSelect={hook.selectAccount}
        onClose={() => hook.setShowAccountPicker(false)}
      />
      <AccountPickerSheet
        visible={hook.state.showToPicker}
        title={Strings.addTxPickToTitle}
        accounts={hook.state.accountsForTo}
        selectedId={hook.state.toAccountId}
        excludeId={hook.state.accountId}
        onSelect={hook.selectToAccount}
        onClose={() => hook.setShowToPicker(false)}
      />
      <CategoryPickerSheet
        visible={hook.state.showCategoryPicker}
        title={Strings.addTxPickCategoryTitle}
        categories={hook.state.visibleCategories}
        selectedId={hook.state.categoryId}
        onSelect={hook.selectCategory}
        onClose={() => hook.setShowCategoryPicker(false)}
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
        visible={visible}
        onClose={onClose}
        title={Strings.editTxTitle}
        size="lg"
        footer={
          <SaveCta
            saving={hook.state.saving}
            onPress={hook.handleSave}
            label={Strings.editTxSaveCta}
          />
        }
      >
        <Sheet.Body>
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
            currency={hook.state.selectedAccount?.currency ?? ('EGP' as any)}
          />
        </Sheet.Body>
      </Sheet>

      <CategoryPickerSheet
        visible={hook.state.showCategoryPicker}
        title={Strings.addTxPickCategoryTitle}
        categories={hook.state.visibleCategories}
        selectedId={hook.state.categoryId}
        onSelect={hook.selectCategory}
        onClose={() => hook.setShowCategoryPicker(false)}
      />
    </>
  );
}
