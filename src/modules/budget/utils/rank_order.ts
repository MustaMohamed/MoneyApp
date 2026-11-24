export interface RankKey {
  amount: number;
  spent: number;
  name: string;
  id: string;
}

/** Amount desc, then spent desc, then name and id by `<`. */
export function rankedBy<T>(key: (row: T) => RankKey): (left: T, right: T) => number {
  return (leftRow, rightRow) => {
    const left = key(leftRow);
    const right = key(rightRow);
    if (left.amount !== right.amount) return right.amount - left.amount;
    if (left.spent !== right.spent) return right.spent - left.spent;
    if (left.name < right.name) return -1;
    if (left.name > right.name) return 1;
    if (left.id < right.id) return -1;
    if (left.id > right.id) return 1;
    return 0;
  };
}
