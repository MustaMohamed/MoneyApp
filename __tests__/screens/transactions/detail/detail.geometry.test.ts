import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Currency } from '@/constants/enums';
import { lineHeightFor } from '@/constants/theme';
import {
  buildDetailSkeletonGeometry,
  DETAIL_ACCOUNT_ROW_HEIGHT,
  DETAIL_ROW_HEIGHT,
  DETAIL_ROW_LABEL_FONT_SIZE,
  DETAIL_ROW_VALUE_FONT_SIZE,
  DETAIL_TRANSFER_AMOUNT_FONT_SIZE,
  DETAIL_TRANSFER_LABEL_FONT_SIZE,
  DETAIL_TRANSFER_MIN_HEIGHT,
  DETAIL_TRANSFER_NAME_FONT_SIZE,
  resolveDetailRowHeight,
  resolveTransferCardHeight,
  resolveTransferCellHeight,
  resolveTransferSkeletonCellHeight,
} from '@/modules/transactions/screens/transactions/detail/components/detail.geometry';
import { makeTestTransaction } from '@/test_helpers/transaction';

function lineBox(fontSize: number, fontScale: number): number {
  return lineHeightFor(scaledFontSize(fontSize, fontScale));
}

function rowLinesAt(fontScale: number): number {
  return (
    lineBox(DETAIL_ROW_LABEL_FONT_SIZE, fontScale) + lineBox(DETAIL_ROW_VALUE_FONT_SIZE, fontScale)
  );
}

function accountRowLinesAt(fontScale: number): number {
  return rowLinesAt(fontScale) + lineBox(DETAIL_ROW_LABEL_FONT_SIZE, fontScale);
}

function transferLinesAt(fontScale: number): number {
  return (
    lineBox(DETAIL_TRANSFER_LABEL_FONT_SIZE, fontScale) +
    lineBox(DETAIL_TRANSFER_NAME_FONT_SIZE, fontScale) +
    lineBox(DETAIL_TRANSFER_AMOUNT_FONT_SIZE, fontScale)
  );
}

describe('resolveDetailRowHeight', () => {
  it.each([0.85, 1])('keeps the 1.0 row and account row heights at font scale %s', (fontScale) => {
    expect(resolveDetailRowHeight(fontScale)).toBe(DETAIL_ROW_HEIGHT);
    expect(resolveDetailRowHeight(fontScale, true)).toBe(DETAIL_ACCOUNT_ROW_HEIGHT);
  });

  it.each([2, 3])('adds the grown line boxes to the row at font scale %s', (fontScale) => {
    const row = resolveDetailRowHeight(fontScale);

    expect(row).toBe(DETAIL_ROW_HEIGHT + rowLinesAt(fontScale) - rowLinesAt(1));
    expect(row).toBeGreaterThan(DETAIL_ROW_HEIGHT);
  });

  it.each([2, 3])(
    'adds the grown line boxes, the sublabel among them, to the account row at font scale %s',
    (fontScale) => {
      const accountRow = resolveDetailRowHeight(fontScale, true);

      expect(accountRow).toBe(
        DETAIL_ACCOUNT_ROW_HEIGHT + accountRowLinesAt(fontScale) - accountRowLinesAt(1),
      );
      expect(accountRow).toBeGreaterThan(DETAIL_ACCOUNT_ROW_HEIGHT);
    },
  );
});

describe('resolveTransferCellHeight', () => {
  // The literal 48: the cell's 36 tile and its 6, 4 and 2 gaps, none of which scales with text.
  it.each([0.85, 1, 2, 3])(
    'is the three line boxes plus the 48 of tile and gaps at font scale %s',
    (fontScale) => {
      expect(resolveTransferCellHeight(fontScale)).toBe(transferLinesAt(fontScale) + 48);
    },
  );
});

describe('resolveTransferCardHeight', () => {
  it.each([0.85, 1])('keeps the 1.0 card height at font scale %s', (fontScale) => {
    expect(resolveTransferCardHeight(fontScale)).toBe(DETAIL_TRANSFER_MIN_HEIGHT);
  });

  it.each([2, 3])('adds the grown line boxes to the card at font scale %s', (fontScale) => {
    const card = resolveTransferCardHeight(fontScale);

    expect(card).toBe(DETAIL_TRANSFER_MIN_HEIGHT + transferLinesAt(fontScale) - transferLinesAt(1));
    expect(card).toBeGreaterThan(DETAIL_TRANSFER_MIN_HEIGHT);
  });

  it('keeps one space around the cell at font scales 1, 2 and 3', () => {
    const spaceAt1 = resolveTransferCardHeight(1) - resolveTransferCellHeight(1);

    expect(resolveTransferCardHeight(2) - resolveTransferCellHeight(2)).toBe(spaceAt1);
    expect(resolveTransferCardHeight(3) - resolveTransferCellHeight(3)).toBe(spaceAt1);
  });
});

describe('resolveTransferSkeletonCellHeight', () => {
  // The literal 80: the `h-20` cell, which the skeleton keeps at 1.0 and below.
  it.each([0.85, 1])('is the literal 80, the `h-20` cell, at font scale %s', (fontScale) => {
    expect(resolveTransferSkeletonCellHeight(fontScale)).toBe(80);
  });

  it.each([2, 3])('is as tall as the loaded cell at font scale %s', (fontScale) => {
    expect(resolveTransferSkeletonCellHeight(fontScale)).toBe(resolveTransferCellHeight(fontScale));
  });
});

describe('buildDetailSkeletonGeometry', () => {
  it('gives a USD transaction with a budget and an exchange rate seven row heights at 2.0, the account row second', () => {
    const transaction = makeTestTransaction({
      currency: Currency.USD,
      budget_id: 'budget-1',
      exchange_rate: 48.5,
    });
    const row = resolveDetailRowHeight(2);
    const accountRow = resolveDetailRowHeight(2, true);

    expect(accountRow).toBeGreaterThan(row);
    expect(buildDetailSkeletonGeometry(transaction, 2).rowHeights).toEqual([
      row,
      accountRow,
      row,
      row,
      row,
      row,
      row,
    ]);
  });
});
