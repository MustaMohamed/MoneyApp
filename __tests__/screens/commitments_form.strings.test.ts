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
