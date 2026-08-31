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

module.exports = {
  meta: { name: 'moneyapp' },
  rules: {
    'font-size-pairs-line-height': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'An object literal setting fontSize must pair lineHeight via lineHeightFor(...) (theme.ts:106) in the same object.',
        },
        messages: {
          missing:
            'fontSize has no lineHeight in this object — pair it with lineHeightFor(...) (theme.ts:106) or the className line-height drifts from it.',
          unpaired:
            'lineHeight here is not lineHeightFor(...) (theme.ts:106) or the verbatim FIELD_MESSAGE_TEXT_LINE_HEIGHT — a hand-written value can drift from fontSize. An aliased or re-exported reference to that constant still warns (only the exact identifier is recognized): revert the alias, do not wrap it in lineHeightFor(...) — that wrap is the drift this carve-out exists to prevent.',
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
            if (
              isLineHeightForCall(lineHeightProp.value) ||
              isFieldMessageIdentifier(lineHeightProp.value)
            ) {
              return;
            }
            context.report({ node: fontSizeProp, messageId: 'unpaired' });
          },
        };
      },
    },
  },
};
