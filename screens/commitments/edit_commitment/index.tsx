import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import { CommitmentFormBody } from '../components/commitment_form_body';
import { useEditCommitment } from './edit_commitment.hook';
import { DeactivateDialog } from './components/deactivate_dialog';

export default function EditCommitmentScreen() {
  const {
    state,
    form,
    onSubmit,
    setAmountType,
    handleRecurrencePresetChange,
    handleDurationTypeChange,
    openCategoryPicker,
    closeCategoryPicker,
    openAccountPicker,
    closeAccountPicker,
    selectCategory,
    selectAccount,
    handleDeactivate,
    confirmDeactivate,
    cancelDeactivate,
  } = useEditCommitment();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <CommitmentFormBody
          form={form}
          amountType={state.amountType}
          recurrencePreset={state.recurrencePreset}
          durationType={state.durationType}
          onAmountTypeChange={setAmountType}
          onRecurrencePresetChange={handleRecurrencePresetChange}
          onDurationTypeChange={handleDurationTypeChange}
          onOpenCategoryPicker={openCategoryPicker}
          onCloseCategoryPicker={closeCategoryPicker}
          onOpenAccountPicker={openAccountPicker}
          onCloseAccountPicker={closeAccountPicker}
          onSelectCategory={selectCategory}
          onSelectAccount={selectAccount}
          categoryPickerVisible={state.categoryPickerVisible}
          accountPickerVisible={state.accountPickerVisible}
          categories={state.categories}
          accounts={state.accounts}
          selectedCategory={state.selectedCategory}
          selectedAccount={state.selectedAccount}
          saving={state.saving}
          onSubmit={onSubmit}
          title={Strings.commitmentsEditTitle}
        />
        <Pressable style={styles.deactivateBtn} onPress={handleDeactivate}>
          <Text style={styles.deactivateText}>{Strings.commitmentsDeactivate}</Text>
        </Pressable>
      </ScrollView>
      <DeactivateDialog
        visible={state.deactivateDialogVisible}
        busy={state.saving}
        onCancel={cancelDeactivate}
        onConfirm={confirmDeactivate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  deactivateBtn: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  deactivateText: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.negative,
  },
});
