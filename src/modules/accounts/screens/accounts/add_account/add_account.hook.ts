import { useRouter } from 'expo-router';

import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';

import { useAccountForm } from '../../../components/account_form/use_account_form.hook';

export function useAddAccountApp() {
  const router = useRouter();
  const { form, submit, state } = useAccountForm({
    initialCurrency: Currency.EGP,
    saveErrorMessage: Strings.errAccountSaveFailed,
    onSaved: () => router.back(),
  });

  return { form, handleSave: submit, onBack: () => router.back(), state };
}
