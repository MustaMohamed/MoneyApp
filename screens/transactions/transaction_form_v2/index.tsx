import { BottomSheet } from 'heroui-native';
import { BottomSheetFooter } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { useCallback } from 'react';

import { Strings } from '@/constants/strings';
import type { Transaction } from '@/database/entities/transaction.entity';

import { useAddTransaction } from './add_transaction.hook';
import { useEditTransaction } from './edit_transaction.hook';
import { AccountPickerSheet } from './components/account_picker_sheet';
import { CategoryPickerSheet } from './components/category_picker_sheet';
import { NoAccountsEmpty } from './components/no_accounts_empty';
import { SaveCta } from './components/save_cta';
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
      <BottomSheet isOpen={visible} onOpenChange={(open) => !open && onClose()}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            snapPoints={['92%']}
            enableOverDrag={false}
            enableDynamicSizing={false}
            contentContainerClassName="h-full"
            footerComponent={(fp: any) =>
              hook.state.hasAccounts ? (
                <BottomSheetFooter {...fp} bottomInset={0}>
                  <SaveCta
                    saving={hook.state.saving}
                    onPress={hook.handleSave}
                    label={Strings.addTxSaveCta}
                  />
                </BottomSheetFooter>
              ) : (
                <></>
              )
            }
          >
            <BottomSheet.Close />
            <BottomSheet.Title>{Strings.addTxTitle}</BottomSheet.Title>
            {hook.state.hasAccounts ? (
              <TransactionFormBody
                locked={false}
                type={hook.state.type}
                onSelectType={hook.setType}
                amountStr={hook.state.amountStr}
                handleNumpad={hook.handleNumpad}
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
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

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
      <BottomSheet isOpen={visible} onOpenChange={(open) => !open && onClose()}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            snapPoints={['92%']}
            enableOverDrag={false}
            enableDynamicSizing={false}
            contentContainerClassName="h-full"
            footerComponent={(fp: any) => (
              <BottomSheetFooter {...fp} bottomInset={0}>
                <SaveCta
                  saving={hook.state.saving}
                  onPress={hook.handleSave}
                  label={Strings.editTxSaveCta}
                />
              </BottomSheetFooter>
            )}
          >
            <BottomSheet.Close />
            <BottomSheet.Title>{Strings.editTxTitle}</BottomSheet.Title>
            <TransactionFormBody
              locked={true}
              type={hook.state.type}
              onSelectType={() => {}}
              amountStr={hook.state.amountStr}
              handleNumpad={hook.handleNumpad}
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
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

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
