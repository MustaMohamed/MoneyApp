// oxlint JS plugin (W1D c2, #230). One rule: an object literal that sets `fontSize` must
// pair it with `lineHeight` set to a `lineHeightFor(...)` call in the SAME object —
// HeroUI Typography/Label.Text keep their className's own line-height when a `style`
// override sets `fontSize` alone, so the two drift apart unless paired (theme.ts:106-121).
// A present-but-hand-written `lineHeight` (a raw number, `ms(...)`) reports too: the
// invariant is the pairing via `lineHeightFor`, not merely lineHeight's presence.
//
// Two carve-outs, both structural (property-name / identifier-name matching, never import
// tracing — cheap by design, per W1D spec §3.2): (a) `lineHeight: FIELD_MESSAGE_TEXT_LINE_
// HEIGHT` (the verbatim identifier) is a valid pairing — FieldMessageRail's zero-shift
// contract pairs a deliberately unscaled 20 against HeroUI FieldError's own unscaled CSS
// line-height, so routing it through `lineHeightFor` would break that equality off scale
// 1.0 (theme.ts:118-121). (b) an object that is itself the value of a React Navigation
// option key (headerTitleStyle, headerLargeTitleStyle, headerStyle, contentStyle,
// tabBarLabelStyle — e.g. settings/_layout.tsx:31) is skipped outright: those style
// objects are not run through this codebase's Text line-height contract.
//
// Array members never satisfy pairing for an object that sets `fontSize` elsewhere in the
// array (`style={[{ fontSize: X }, valueStyle]}` still reports) — the pairing belongs in
// the object that sets `fontSize` (W1D spec §3 Decision 1); a merge branch across array
// members would also admit mismatched fontSize/lineHeight pairs.
//
// Alpha risk: oxlint JS plugins are alpha and not subject to semver (oxc.rs js-plugins
// docs, embedded in .oxlintrc.json's own jsPlugins description). Re-verify this file's
// plugin/rule registration shape and the `-f json` diagnostic shape
// (__tests__/scripts/oxlint_font_size_rule.test.ts) on any oxlint version bump — see
// memory: project_oxlint_upgrade_traps for the last time an oxlint bump moved a contract
// out from under this repo silently.

const NAV_OPTION_STYLE_KEYS = new Set([
  'headerTitleStyle',
  'headerLargeTitleStyle',
  'headerStyle',
  'contentStyle',
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

function isFieldMessageIdentifier(value) {
  return value.type === 'Identifier' && value.name === 'FIELD_MESSAGE_TEXT_LINE_HEIGHT';
}

// Carve-out (b): true when `node` is written directly as `<navOptionKey>: { ... }` —
// nothing upstream of the object's own parent is inspected, so this is blind to an
// object nested another level deeper (e.g. inside an array), which no site in this
// codebase does today.
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
            'lineHeight here is not lineHeightFor(...) (theme.ts:106) or the verbatim FIELD_MESSAGE_TEXT_LINE_HEIGHT — a hand-written value can drift from fontSize.',
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
