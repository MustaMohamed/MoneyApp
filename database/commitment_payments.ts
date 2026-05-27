// Backward-compat stub — canonical in modules/commitments/
export {
  getPaymentsByMonth,
  getPaymentsByCommitment,
  getPaymentById,
  addPayments,
  updatePaymentStatus,
  deleteUnpaidPaymentsByCommitment,
  getLastPaidPayment,
  getPaidCountByCommitment,
  getExistingDueDates,
  markCommitmentAsPaid,
} from '@/modules/commitments/database/commitment_payments';
export type { MarkAsPaidDetails } from '@/modules/commitments/database/commitment_payments';
