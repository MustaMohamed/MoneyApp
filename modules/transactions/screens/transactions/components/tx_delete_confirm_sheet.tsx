/**
 * Re-exports the transaction delete confirm sheet for use from the
 * transactions list swipe action. Both list and detail now use the same
 * underlying ConfirmSheet so the UI is identical on both surfaces.
 */
export { DeleteConfirmDialog as TxDeleteConfirmSheet } from '../detail/components/delete_confirm_dialog';
