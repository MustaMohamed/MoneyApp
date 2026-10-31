import { Strings } from '@/constants/strings';

describe('commitment form copy (MA-255)', () => {
  it('ships the add and edit titles byte-exact, the transaction date sheet keeping its own', () => {
    expect({
      add: Strings.commitmentsAddTitle,
      edit: Strings.commitmentsEditTitle,
      transactionDateSheet: Strings.addTxDatePickerTitle,
    }).toEqual({
      add: 'Add commitment',
      edit: 'Edit commitment',
      transactionDateSheet: 'Choose transaction date',
    });
  });

  it('ships the seven row labels byte-exact, in row order', () => {
    expect([
      Strings.commitmentsFieldName,
      Strings.commitmentsFieldCategory,
      Strings.commitmentsFieldRecurrence,
      Strings.commitmentsFieldStartDate,
      Strings.commitmentsFieldDuration,
      Strings.commitmentsFieldCurrency,
      Strings.commitmentsFieldNotes,
    ]).toEqual(['Name', 'Category', 'Repeats', 'Starts', 'Ends', 'Currency', 'Note']);
  });

  it('ships the Name, Category and Note placeholders byte-exact', () => {
    expect({
      name: Strings.commitmentsNamePlaceholder,
      category: Strings.addTxPickCategoryTitle,
      note: Strings.addTxNotePlaceholder,
    }).toEqual({
      name: 'Rent',
      category: 'Select category',
      note: 'Add a note (optional)',
    });
  });

  it('ships the Ends row no-end value and the Stop link byte-exact', () => {
    expect({
      never: Strings.commitmentsEndsRowNever,
      stop: Strings.commitmentsStopLink,
    }).toEqual({
      never: 'Never',
      stop: 'Stop this commitment',
    });
  });
});

describe('commitment form footer copy (MA-256)', () => {
  it('ships the Save button and its failure byte-exact', () => {
    expect({
      save: Strings.commitmentsSave,
      failed: Strings.commitmentsSaveError,
    }).toEqual({
      save: 'Save',
      failed: "Couldn't save this commitment. Nothing was changed. Try again.",
    });
  });

  it('ships the status track lines byte-exact', () => {
    expect({
      add: Strings.commitmentsFirstPaymentDue('Sun 1 Nov'),
      edit: Strings.commitmentsEditScheduleFootnote,
    }).toEqual({
      add: 'First payment due Sun 1 Nov.',
      edit: 'Upcoming payments follow the new schedule. Paid ones stay.',
    });
  });

  it('ships the Ends earlier than Starts message byte-exact', () => {
    expect(Strings.commitmentsErrEndsBeforeStarts).toBe('End date must be on or after start date');
  });

  it('ships the toasts byte-exact', () => {
    expect({
      added: Strings.commitmentsAddedToast,
      updated: Strings.commitmentsUpdatedToast,
    }).toEqual({
      added: 'Commitment added',
      updated: 'Commitment updated',
    });
  });
});
