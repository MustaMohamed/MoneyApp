/**
 * Fixture for `moneyapp/no-formstate-off-prop`. Not application code.
 *
 * Every line that must produce a diagnostic carries a trailing `// EXPECT-ERROR`
 * marker; `__tests__/oxlint_no_formstate_off_prop.test.ts` reads those markers
 * and asserts the rule's output matches them exactly — so a case added here
 * without a matching diagnostic, or a diagnostic on an unmarked line, fails.
 *
 * Excluded from `npm run lint` (`.oxlintrc.json` → ignorePatterns) and from
 * `npm run typecheck` (`tsconfig.json` → exclude), because it violates on purpose.
 */
import { useFormState, type Control, type UseFormReturn } from 'react-hook-form';

interface Values {
  name: string;
}

interface Props {
  form: UseFormReturn<Values>;
}

declare function useZodForm(): UseFormReturn<Values>;
declare function usePaySheet(): { form: UseFormReturn<Values> };
declare function useStore(): { saving: boolean };

// ─── Must flag ────────────────────────────────────────────────────────────────

// The MA-007 shape: `form` is a prop, read through a member chain.
export function MemberOffProp({ form }: Props) {
  return form.formState.errors.name?.message; // EXPECT-ERROR
}

// The MA-007 shape as originally written: destructured off the prop.
export function DestructureOffProp({ form }: Props) {
  const {
    formState: { errors }, // EXPECT-ERROR
  } = form;
  return errors.name?.message;
}

// Renamed parameter — the binding, not the identifier text, is what matters.
export function RenamedParam({ form: f }: Props) {
  return f.formState.errors.name?.message; // EXPECT-ERROR
}

// Whole-props parameter, reached through two member hops.
export function WholePropsParam(props: Props) {
  return props.form.formState.errors.name?.message; // EXPECT-ERROR
}

// Aliased out of props first, then read — prop-derived-ness propagates.
export function AliasedFromProps(props: Props) {
  const { form } = props;
  return form.formState.errors.name?.message; // EXPECT-ERROR
}

// Read inside a nested callback still sits in the parameter's scope.
export function NestedCallback({ form }: Props) {
  return [1].map(() => form.formState.errors.name?.message); // EXPECT-ERROR
}

// ─── Must not flag ────────────────────────────────────────────────────────────

// Owns the form: the read happens during the render that created it.
export function OwnsUseForm() {
  const form = useZodForm();
  return form.formState.errors.name?.message;
}

// Destructured straight off the hook call.
export function DestructuredOffHookCall() {
  const {
    formState: { errors },
  } = useZodForm();
  return errors.name?.message;
}

// The PaySheet shape: a screen hook calls `useZodForm` and returns the form.
// The hook runs inside this component's render, so the read subscribes here.
export function FormFromScreenHook() {
  const { form } = usePaySheet();
  return form.formState.errors.name?.message;
}

// The fix: subscribe directly. `control` off the prop is fine — it is the ref.
export function TheFix({ form }: Props) {
  const { control } = form;
  const { errors } = useFormState({ control });
  return errors.name?.message;
}

// `control` passed as its own prop, subscribed locally.
export function ControlProp({ control }: { control: Control<Values> }) {
  const { errors } = useFormState({ control });
  return errors.name?.message;
}

// An unrelated local that merely happens to be named `formState`.
export function UnrelatedFormStateLocal() {
  const formState = useStore();
  return formState.saving;
}

// Destructuring a prop for something other than `formState`.
export function OtherFieldOffProp({ form }: Props) {
  const { control } = form;
  return control;
}
