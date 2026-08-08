/**
 * Local oxlint JS plugin for MoneyApp-specific defect classes.
 *
 * Rules here exist because a defect got through review at least once and no
 * existing rule would have caught it. Each one names the incident.
 */

/**
 * Walks a binding pattern and collects every identifier it introduces.
 * Handles the shapes a React component's parameter list actually takes:
 * `(props)`, `({ form })`, `({ form: f })`, `({ form = x })`, `([a, b])`, `(...rest)`.
 */
function collectPatternNames(node, out) {
  if (!node) return out;
  switch (node.type) {
    case 'Identifier':
      out.add(node.name);
      break;
    case 'ObjectPattern':
      for (const prop of node.properties) {
        collectPatternNames(prop.type === 'RestElement' ? prop.argument : prop.value, out);
      }
      break;
    case 'ArrayPattern':
      for (const el of node.elements) collectPatternNames(el, out);
      break;
    case 'AssignmentPattern':
      collectPatternNames(node.left, out);
      break;
    case 'RestElement':
      collectPatternNames(node.argument, out);
      break;
    case 'TSParameterProperty':
      collectPatternNames(node.parameter, out);
      break;
    default:
      break;
  }
  return out;
}

/** Resolves `a.b.c` down to the root `a`; returns null for anything not rooted in an identifier. */
function rootIdentifier(node) {
  let cur = node;
  while (cur && (cur.type === 'MemberExpression' || cur.type === 'TSNonNullExpression')) {
    cur = cur.type === 'MemberExpression' ? cur.object : cur.expression;
  }
  return cur && cur.type === 'Identifier' ? cur : null;
}

function isFormStateKey(node) {
  if (!node) return false;
  if (node.type === 'Identifier') return node.name === 'formState';
  if (node.type === 'Literal') return node.value === 'formState';
  return false;
}

/**
 * Reading `formState` off a `UseFormReturn` that arrived as a prop does not
 * subscribe the reading component to form-state changes.
 *
 * `formState` is a Proxy on RHF's `_formControl.current` — a ref whose identity
 * never changes. The subscription is created by the Proxy's getter *in the
 * component that owns `useForm`*. A child reading through the prop registers
 * nothing, and with React Compiler on (`app.json` → `reactCompiler: true`) the
 * memoized child element is skipped entirely on a formState-only update. The
 * fields render stale: validation still blocks the submit, but no error is shown.
 *
 * Incident: MA-007 (PR #220), caught on the emulator at step 7 after passing
 * two local review rounds and a full CI chain. No Jest test can catch it —
 * `babel-preset-expo` gates React Compiler on `caller.supportsReactCompiler`,
 * which Metro sets and `jest.config.js` does not, so a render test behaves
 * identically before and after the fix.
 *
 * Fix: `const { errors } = useFormState({ control })` in the reading component,
 * which subscribes it directly.
 *
 * Not flagged: `formState` off a value produced by a call in the same component
 * (`useZodForm(...)`, or a screen hook that calls it). Those reads happen during
 * the owning component's own render, which is what creates the subscription.
 */
const noFormstateOffProp = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow reading `formState` off a `UseFormReturn` received as a prop; use `useFormState({ control })` instead',
    },
    schema: [],
    messages: {
      formStateOffProp:
        '`{{name}}` is a prop, so reading `formState` off it does not subscribe this component — with React Compiler on, field errors render stale while validation still blocks the submit (MA-007). Destructure `control` instead and call `useFormState({ control })` here.',
    },
  },
  create(context) {
    /** Stack of Sets: identifiers in scope that originate from a parameter. */
    const scopes = [];

    const isPropDerived = (name) => scopes.some((s) => s.has(name));

    const report = (node, name) => {
      context.report({ node, messageId: 'formStateOffProp', data: { name } });
    };

    const enterFunction = (node) => {
      const names = new Set();
      for (const param of node.params ?? []) collectPatternNames(param, names);
      scopes.push(names);
    };
    const exitFunction = () => {
      scopes.pop();
    };

    return {
      FunctionDeclaration: enterFunction,
      'FunctionDeclaration:exit': exitFunction,
      FunctionExpression: enterFunction,
      'FunctionExpression:exit': exitFunction,
      ArrowFunctionExpression: enterFunction,
      'ArrowFunctionExpression:exit': exitFunction,

      VariableDeclarator(node) {
        // Propagate prop-derived-ness through plain aliases only:
        //   const { form } = props;        → `form` is prop-derived
        //   const form = props.form;       → `form` is prop-derived
        //   const { form } = usePaySheet() → NOT prop-derived; a call in this
        //                                    component owns the subscription.
        const init = node.init;
        if (!init) return;
        if (init.type !== 'Identifier' && init.type !== 'MemberExpression') return;

        const root = rootIdentifier(init);
        if (!root || !isPropDerived(root.name)) return;

        // `const { formState: { errors } } = form;` — the destructure itself is the read.
        if (node.id.type === 'ObjectPattern') {
          for (const prop of node.id.properties) {
            if (prop.type !== 'RestElement' && isFormStateKey(prop.key)) {
              report(prop, root.name);
            }
          }
        }

        const current = scopes[scopes.length - 1];
        if (current) collectPatternNames(node.id, current);
      },

      MemberExpression(node) {
        // `form.formState.errors.x` — flag at the `form.formState` link.
        if (node.computed && node.property.type !== 'Literal') return;
        if (!isFormStateKey(node.property)) return;

        const root = rootIdentifier(node.object);
        if (!root || !isPropDerived(root.name)) return;

        report(node, root.name);
      },
    };
  },
};

export default {
  meta: { name: 'moneyapp' },
  rules: {
    'no-formstate-off-prop': noFormstateOffProp,
  },
};
