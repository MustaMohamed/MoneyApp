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
// 1.0 (theme.ts:118-121). Aliasing or re-exporting the identifier still warns — only the
// verbatim token is recognized, and the message below says so, because the natural "fix"
// (wrapping the alias in `lineHeightFor(...)`) is the exact break this carve-out prevents.
// (b) an object that is itself the value of a React Navigation option key (headerTitleStyle,
// headerLargeTitleStyle, tabBarLabelStyle — e.g. settings/_layout.tsx:31) is skipped
// outright: those style objects are not run through this codebase's Text line-height
// contract. The set is trimmed to these three TextStyle-capable keys, not the fuller
// React Navigation option list: `headerStyle` and `contentStyle` are ViewStyle keys (a
// `fontSize` inside one is already a typecheck error) whose generic names are exactly the
// kind that collides with unrelated objects — 13 non-nav uses existed at the site that
// prompted the trim (account_detail.anim.ts:14) — so keeping them bought carve-out
// coverage for a shape that cannot legally occur, at the cost of a real collision surface.
// Known out-of-scope, both zero sites and both left uncovered deliberately rather than
// silently: a spread property standing in for `fontSize` (`{ ...base, fontSize: 14 }`'s
// `fontSize` is still a literal named property here and IS covered; a spread that means
// to alias a nav-option key is not) and a computed key (`{ [key]: 14 }` — statically
// unknowable which key it is, so `!p.computed` excludes it rather than guess). A quoted
// key (`'fontSize'`) is not a distinct case: `oxfmt` rewrites it to bare on every commit
// this repo's `format:check` gates, so it never reaches the AST this rule sees as quoted.
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
  'tabBarLabelStyle',
]);

/**
 * @param {Array<Record<string, any>>} properties an ObjectExpression's `properties` array
 * @param {string} name the property key to find (never computed)
 * @returns {Record<string, any> | undefined} the matching `Property` node, if any
 */
function findNamedProperty(properties, name) {
  return properties.find(
    (p) =>
      p.type === 'Property' && !p.computed && p.key.type === 'Identifier' && p.key.name === name,
  );
}

/**
 * @param {Record<string, any>} value the `lineHeight` property's `value` node
 * @returns {boolean} true for a `lineHeightFor(...)` call
 */
function isLineHeightForCall(value) {
  return (
    value.type === 'CallExpression' &&
    value.callee.type === 'Identifier' &&
    value.callee.name === 'lineHeightFor'
  );
}

/**
 * @param {Record<string, any>} value the `lineHeight` property's `value` node
 * @returns {boolean} true for the verbatim `FIELD_MESSAGE_TEXT_LINE_HEIGHT` identifier —
 *   an alias or re-export of it is a different identifier name and returns false
 */
function isFieldMessageIdentifier(value) {
  return value.type === 'Identifier' && value.name === 'FIELD_MESSAGE_TEXT_LINE_HEIGHT';
}

/**
 * Carve-out (b): true when `node` is written directly as `<navOptionKey>: { ... }` —
 * nothing upstream of the object's own parent is inspected, so this is blind to an
 * object nested another level deeper (e.g. inside an array), which no site in this
 * codebase does today.
 * @param {Record<string, any>} node the `ObjectExpression` node under inspection
 * @returns {boolean}
 */
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
