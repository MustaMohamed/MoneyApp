// oxlint JS plugins are alpha; re-verify the registration and `-f json` shapes on any oxlint bump.

const NAV_OPTION_STYLE_KEYS = new Set([
  'headerTitleStyle',
  'headerLargeTitleStyle',
  'tabBarLabelStyle',
]);

function findNamedProperty(properties, name) {
  return properties.find(
    (p) =>
      p.type === 'Property' && !p.computed && p.key.type === 'Identifier' && p.key.name === name,
  );
}

function isLineHeightForCall(value) {
  return (
    value.type === 'CallExpression' &&
    value.callee.type === 'Identifier' &&
    value.callee.name === 'lineHeightFor'
  );
}

function sizeExpressionKey(node) {
  switch (node.type) {
    case 'Identifier':
      return node.name;
    case 'MemberExpression':
      return !node.computed &&
        node.object.type === 'Identifier' &&
        node.property.type === 'Identifier'
        ? `${node.object.name}.${node.property.name}`
        : null;
    case 'CallExpression': {
      if (node.callee.type !== 'Identifier') return null;
      const args = node.arguments.map(sizeExpressionKey);
      return args.every((a) => a !== null) ? `${node.callee.name}(${args.join(',')})` : null;
    }
    case 'Literal':
      return typeof node.value === 'number' ? String(node.value) : null;
    default:
      return null;
  }
}

// A shape the key cannot express, or a call that is not `lineHeightFor(oneArgument)`, keeps the callee-only behaviour.
function lineHeightForArgumentDiffers(call, fontSizeValue) {
  if (call.arguments.length !== 1) return false;
  const argumentKey = sizeExpressionKey(call.arguments[0]);
  const fontSizeKey = sizeExpressionKey(fontSizeValue);
  return argumentKey !== null && fontSizeKey !== null && argumentKey !== fontSizeKey;
}

// FieldMessageRail pairs an unscaled 20 with HeroUI FieldError's own unscaled CSS line-height.
function isFieldMessageIdentifier(value) {
  return value.type === 'Identifier' && value.name === 'FIELD_MESSAGE_TEXT_LINE_HEIGHT';
}

function isNavOptionStyleValue(node) {
  const parent = node.parent;
  return (
    parent.type === 'Property' &&
    parent.value === node &&
    !parent.computed &&
    parent.key.type === 'Identifier' &&
    NAV_OPTION_STYLE_KEYS.has(parent.key.name)
  );
}

const A11Y_TEXT_NAME = /[aA]ccessibility(?:Label|Hint)$/;

/** Words held in place: a non-empty string or plain template literal, or a ternary or logical expression with one as a branch. */
function holdsLiteralText(node) {
  if (!node) return false;
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string' && node.value.trim() !== '';
    case 'TemplateLiteral':
      return (
        node.expressions.length === 0 &&
        node.quasis.some((quasi) => (quasi.value.cooked ?? quasi.value.raw).trim() !== '')
      );
    case 'ConditionalExpression':
      return holdsLiteralText(node.consequent) || holdsLiteralText(node.alternate);
    case 'LogicalExpression':
      return holdsLiteralText(node.left) || holdsLiteralText(node.right);
    default:
      return false;
  }
}

function propertyKeyName(node) {
  if (node.computed) return undefined;
  if (node.key.type === 'Identifier') return node.key.name;
  if (node.key.type === 'Literal' && typeof node.key.value === 'string') return node.key.value;
  return undefined;
}

module.exports = {
  meta: { name: 'moneyapp' },
  rules: {
    'font-size-pairs-line-height': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'An object literal setting fontSize must pair lineHeight via lineHeightFor(...) (theme.ts:106) in the same object, called with the same expression fontSize takes.',
        },
        messages: {
          missing:
            'fontSize has no lineHeight in this object — pair it with lineHeightFor(...) (theme.ts:106) or the className line-height drifts from it.',
          unpaired:
            'lineHeight here is not lineHeightFor(...) (theme.ts:106) or the verbatim FIELD_MESSAGE_TEXT_LINE_HEIGHT — a hand-written value can drift from fontSize. An aliased or re-exported reference to that constant still warns (only the exact identifier is recognized): revert the alias, do not wrap it in lineHeightFor(...) — that wrap is the drift this carve-out exists to prevent.',
          mismatched:
            'lineHeightFor(...) is called with something other than the fontSize in this object, so the line box is sized for a different font — pass the same expression fontSize takes. A shape this rule cannot read (a ternary, a template literal, a spread) is not compared at all.',
        },
      },
      create(context) {
        return {
          ObjectExpression(node) {
            const fontSizeProp = findNamedProperty(node.properties, 'fontSize');
            if (!fontSizeProp) return;
            if (isNavOptionStyleValue(node)) return;

            const lineHeightProp = findNamedProperty(node.properties, 'lineHeight');
            if (!lineHeightProp) {
              context.report({ node: fontSizeProp, messageId: 'missing' });
              return;
            }
            if (isLineHeightForCall(lineHeightProp.value)) {
              if (lineHeightForArgumentDiffers(lineHeightProp.value, fontSizeProp.value)) {
                context.report({ node: fontSizeProp, messageId: 'mismatched' });
              }
              return;
            }
            if (isFieldMessageIdentifier(lineHeightProp.value)) return;
            context.report({ node: fontSizeProp, messageId: 'unpaired' });
          },
        };
      },
    },
    'no-literal-a11y-text': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'An accessibility label or hint, as a JSX attribute or an object key, reads its words from src/constants/strings.ts, never from a literal.',
        },
        messages: {
          literal:
            'This accessibility label or hint holds its words as a literal: read them from `src/constants/strings.ts` (CLAUDE.md Conventions, Strings).',
        },
      },
      create(context) {
        return {
          JSXAttribute(node) {
            if (node.name.type !== 'JSXIdentifier' || !A11Y_TEXT_NAME.test(node.name.name)) return;
            const value =
              node.value && node.value.type === 'JSXExpressionContainer'
                ? node.value.expression
                : node.value;
            if (holdsLiteralText(value)) context.report({ node, messageId: 'literal' });
          },
          Property(node) {
            const name = propertyKeyName(node);
            if (name === undefined || !A11Y_TEXT_NAME.test(name)) return;
            if (holdsLiteralText(node.value)) context.report({ node, messageId: 'literal' });
          },
        };
      },
    },
  },
};
