export function computeBalanceDelta(oldEgp: number, newEgp: number): number {
  return newEgp - oldEgp;
}

export function computeCCPaymentReversal(
  oldEgp: number,
  minimumPayment: number | null,
): { balanceDelta: number; revolvingDelta: number } {
  const installmentDue = minimumPayment ?? 0;
  const installmentCovered = Math.min(oldEgp, installmentDue);
  const revolvingDelta = Math.max(0, oldEgp - installmentCovered);
  return { balanceDelta: oldEgp, revolvingDelta };
}

export function computeCCPaymentForward(
  newEgp: number,
  minimumPayment: number | null,
  currentRevolving: number,
): { balanceDelta: number; newRevolving: number } {
  const installmentDue = minimumPayment ?? 0;
  const installmentCovered = Math.min(newEgp, installmentDue);
  const revolvingReduction = Math.max(0, newEgp - installmentCovered);
  const newRevolving = Math.max(0, currentRevolving - revolvingReduction);
  return { balanceDelta: newEgp, newRevolving };
}
