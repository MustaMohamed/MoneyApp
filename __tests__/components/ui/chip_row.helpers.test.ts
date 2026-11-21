import { buildChipRow, type ChipRowItem } from '@/components/ui/chip_row.helpers';
import { AccountType } from '@/constants/enums';

const ALL_LABEL = 'All';

const watch: ChipRowItem = {
  id: 'watch',
  label: 'Watch',
  accessibilityLabel: 'Watch chip',
  lead: { kind: 'dot', color: '#F5A623' },
};
const wallet: ChipRowItem = {
  id: 'wallet',
  label: 'Wallet',
  accessibilityLabel: 'Wallet chip',
  lead: { kind: 'tile', color: null, type: AccountType.Bank },
};
const draft: ChipRowItem = {
  id: 'draft',
  label: 'Draft',
  accessibilityLabel: 'Draft chip',
  lead: undefined,
};
const items = [watch, wallet, draft];

function litIds(selectedId: string | undefined): Array<string | undefined> {
  return buildChipRow(ALL_LABEL, items, selectedId)
    .filter((chip) => chip.selected)
    .map((chip) => chip.id);
}

describe('buildChipRow', () => {
  it('lights All only when no id is selected', () => {
    expect(litIds(undefined)).toEqual([undefined]);
  });

  it('lights the matching item and not All', () => {
    expect(litIds('wallet')).toEqual(['wallet']);
  });

  it('lights All when the selected id matches no item', () => {
    expect(litIds('gone')).toEqual([undefined]);
  });

  it('puts All first with no lead, then each item in input order with its lead passed through', () => {
    const chips = buildChipRow(ALL_LABEL, items, 'draft');

    expect(chips).toStrictEqual([
      {
        id: undefined,
        label: ALL_LABEL,
        accessibilityLabel: ALL_LABEL,
        lead: undefined,
        selected: false,
      },
      { ...watch, selected: false },
      { ...wallet, selected: false },
      { ...draft, selected: true },
    ]);
  });
});
