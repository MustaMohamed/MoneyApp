type RankKey = [amount: number, spent: number, name: string, id: string];
const byText = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);
/** Amount desc, then spent desc, then name and id by `<`. */
export const rankedBy =
  <T>(key: (row: T) => RankKey) =>
  (leftRow: T, rightRow: T): number => {
    const [amountL, spentL, nameL, idL] = key(leftRow);
    const [amountR, spentR, nameR, idR] = key(rightRow);
    if (amountL !== amountR) return amountR - amountL;
    if (spentL !== spentR) return spentR - spentL;
    return byText(nameL, nameR) || byText(idL, idR);
  };
