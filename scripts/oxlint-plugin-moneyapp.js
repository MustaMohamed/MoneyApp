// oxlint JS plugins are alpha; re-verify the registration and `-f json` shapes on any oxlint bump.
const path = require('node:path');

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
const LETTER = /\p{L}/u;

/** Words held in place: a string or plain template literal with a letter in it, or a ternary, logical or `+` expression with one as a branch. */
function holdsLiteralText(node) {
  if (!node) return false;
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string' && LETTER.test(node.value);
    case 'TemplateLiteral':
      return (
        node.expressions.length === 0 &&
        node.quasis.some((quasi) => LETTER.test(quasi.value.cooked ?? quasi.value.raw))
      );
    case 'ConditionalExpression':
      return holdsLiteralText(node.consequent) || holdsLiteralText(node.alternate);
    case 'LogicalExpression':
      return holdsLiteralText(node.left) || holdsLiteralText(node.right);
    case 'BinaryExpression':
      return node.operator === '+' && (holdsLiteralText(node.left) || holdsLiteralText(node.right));
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

const SRC_ROOTS = new Set([
  'modules',
  'components',
  'store',
  'utils',
  'repositories',
  'database',
  'constants',
  'screens',
]);
const MODULE_SCREENS_TARGET = /^modules\/([^/]+)\/screens(?:\/|$)/;
const SHARED_FOLDER_FILE = /^(?:components\/|modules\/[^/]+\/(?:components|utils|domain)\/)/;

/** The path after the last `src/` segment, or undefined when the file is not under one of its eight children. */
function srcRelativePath(filename) {
  const normalized = filename.replace(/\\/g, '/');
  const marker = normalized.lastIndexOf('/src/');
  if (marker === -1) return undefined;
  const relative = normalized.slice(marker + '/src/'.length);
  return SRC_ROOTS.has(relative.split('/')[0]) ? relative : undefined;
}

/** The import target as a path under `src/`, or undefined for a bare package or a path that leaves `src/`. */
function resolveTarget(specifier, fileRelativePath) {
  if (specifier.startsWith('@/')) return specifier.slice(2);
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const dir = path.posix.dirname(fileRelativePath);
    const joined = path.posix.join(dir, specifier);
    return joined.startsWith('..') ? undefined : joined;
  }
  return undefined;
}

function moduleOf(relativePath) {
  const match = /^modules\/([^/]+)\//.exec(relativePath);
  return match ? match[1] : undefined;
}

function importSourceValue(source) {
  if (!source) return undefined;
  if (source.type !== 'Literal' && source.type !== 'StringLiteral') return undefined;
  return typeof source.value === 'string' ? source.value : undefined;
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
    'screens-import-boundary': {
      meta: {
        type: 'problem',
        docs: {
          description:
            "A file under src/ imports nothing from another module's screens folder, and a shared folder (src/components, a module's components, utils or domain) imports nothing from any screens folder; src/app and src/test_helpers are exempt.",
        },
        messages: {
          otherModule:
            "This file reads another module's screens folder: a piece another module reads lives in that module's store/, utils/, domain/ or components/ (docs/adr/2026-09-28-shared-helpers-leave-screen-folders.md §4). Import it from there.",
          sharedFolder:
            'A shared piece imports nothing from a screens folder, its own module included: a back import carries a screen-folder change into every reader of the shared piece (docs/adr/2026-10-18-transactions-pieces-leave-screen-folders.md §2). Move the piece it reads beside it.',
        },
      },
      create(context) {
        const fileRelativePath = srcRelativePath(context.filename);
        if (fileRelativePath === undefined) return {};
        const fileModule = moduleOf(fileRelativePath);
        const inSharedFolder = SHARED_FOLDER_FILE.test(fileRelativePath);

        function check(node, source) {
          const specifier = importSourceValue(source);
          if (specifier === undefined) return;
          const target = resolveTarget(specifier, fileRelativePath);
          if (target === undefined) return;
          const screensModule = MODULE_SCREENS_TARGET.exec(target)?.[1];
          const targetsScreens =
            screensModule !== undefined || target === 'screens' || target.startsWith('screens/');
          if (inSharedFolder && targetsScreens) {
            context.report({ node, messageId: 'sharedFolder' });
            return;
          }
          if (screensModule !== undefined && screensModule !== fileModule) {
            context.report({ node, messageId: 'otherModule' });
          }
        }

        return {
          ImportDeclaration(node) {
            check(node, node.source);
          },
          ExportNamedDeclaration(node) {
            check(node, node.source);
          },
          ExportAllDeclaration(node) {
            check(node, node.source);
          },
          ImportExpression(node) {
            check(node, node.source);
          },
          TSImportType(node) {
            check(node, node.source);
          },
        };
      },
    },
  },
};

// `validate-structural-guards.js` checks the set against `ls src`; a non-enumerable key keeps the plugin shape oxlint reads.
Object.defineProperty(module.exports, 'SRC_ROOTS', { value: SRC_ROOTS, enumerable: false });
