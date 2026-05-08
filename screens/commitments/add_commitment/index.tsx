import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import { CommitmentFormBody } from '../components/commitment_form_body';
import { useAddCommitment } from './add_commitment.hook';

export default function AddCommitmentScreen() {
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
  } = useAddCommitment();

  return (
    <View style={styles.container}>
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
        title={Strings.commitmentsAddTitle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
});
