function globToRegExp(glob) {
  let source = '';
  for (let index = 0; index < glob.length; ) {
    if (glob.slice(index, index + 3) === '**/') {
      source += '(?:[^/]+/)*';
      index += 3;
    } else if (glob.slice(index, index + 2) === '**') {
      source += '.*';
      index += 2;
    } else if (glob[index] === '*') {
      source += '[^/]*';
      index += 1;
    } else {
      source += glob[index].replace(/[.+^${}()|[\]\\]/g, '\\$&');
      index += 1;
    }
  }
  return new RegExp(`^${source}$`);
}

function matchesAny(file, globs) {
  return globs.some((glob) => globToRegExp(glob).test(file));
}

const SIGNALS_REFERENCE =
  /@preact\/signals-react(?:-transform)?|preact\s+signals|signals(?:-react)?\s+transform|signals\s+migration\s+shape/i;
const UNQUALIFIED_SIGNALS_REFERENCE = /\bSignals\b/gi;
const SIGNALS_STATE_GUIDANCE_CONTEXT = /\b(?:state|store|migration|hook)s?\b/i;
const SIGNALS_PREFIX_RESTRICTION =
  /(?:\b(?:do\s+not|don't|never|cannot|can't)\s+(?:use|adopt|enable|install|migrat\w*(?:\s+to)?)|\b(?:avoid|forbid|prohibit|disallow|remove|disable)(?:\s+(?:using|adopting|enabling|installing))?|\b(?:unsupported|forbidden|prohibited|removed|absent)(?:\s+(?:package|dependency|stack))?\s*:?)\s*$/i;
const SIGNALS_SUFFIX_RESTRICTION =
  /^\s*(?:(?:package|dependency)\s+)?(?:and\s+its\s+(?:Babel\s+)?transform\s+)?(?:(?:is|are|was|were|remains?)\s+(?:not\s+(?:installed|supported|allowed|permitted|part\s+of\s+(?:the\s+)?(?:current|supported)\s+stack)|unsupported|absent|removed|prohibited|forbidden|disabled|out\s+of\s+(?:the\s+)?scope|outside(?:\s+of)?\s+(?:the\s+)?(?:scope|supported\s+stack))|(?:isn't|aren't|wasn't|weren't)\s+(?:installed|supported|allowed|permitted)|(?:has|have|had)\s+been\s+(?:removed|disabled|prohibited|forbidden)|(?:may|must|should|can|will)\s+(?:not|never)\s+be\s+(?:used|adopted|enabled|installed))\b/i;
const SIGNALS_REINTRODUCTION_PREFIX = /\b(?:reintroduc\w*|reintroduction\s+of)\s*$/i;
const SIGNALS_EXPLICIT_APPROVAL =
  /^\s*(?:requires?|needs?)\b.*\b(?:explicit\s+approval|(?:a\s+|an\s+)?(?:new\s+)?approved\s+plan)\b/i;
const SIGNALS_DIRECTIVE =
  /\b(?:use|prefer|recommend|enforce|adopt|choose|enable|install|migrat\w*)\b/i;
const SIGNALS_ACTIVE_FOLLOW_UP =
  /\b(?:use|prefer|recommend|enforce|adopt|choose|enable|install)\s+it\b|\bmigrat\w*\s+to\s+it\b/i;
const SIGNALS_PASSIVE_FOLLOW_UP =
  /\b(?:should|must|can|may|will)\s+be\s+(?:used|preferred|recommended|enforced|adopted|enabled|installed)\b|\b(?:is|are|was|were|remains?)\s+(?:preferred|recommended|required)\b/i;
const SIGNALS_IMPLICIT_ACTIVE_FOLLOW_UP =
  /^(?:use|prefer|recommend|enforce|adopt|choose|enable|install)(?:\s+(?:when|if|as)\b|$)/i;
const SIGNALS_INSTALLED_CLAIM = /\b(?:installed|enabled|configured)\b/i;
const SIGNALS_NEITHER_PREDICATE =
  /^(?:is|are|was|were)\s+(?:used|adopted|enabled|installed|supported|allowed|permitted)$/i;
const REQUIRED_RULE_IDS = [
  'AUTH-USER-INTEGRATION',
  'GATE-SPEC-SIGNOFF',
  'GATE-DEVICE-QA',
  'GATE-CRITICAL-TRIGGER',
  'LEAD-PLAN-APPROVAL',
  'LEAD-REVIEW-VERDICT',
  'STACK-ZUSTAND',
  'STACK-NO-SIGNALS',
  'PATH-SRC-CANONICAL',
  'UI-HEROUI',
  'PERSONA-SARAH-OWNERSHIP',
  'PERSONA-MARCUS-OWNERSHIP',
  'PERSONA-LAYLA-OWNERSHIP',
  'PERSONA-TARIQ-OWNERSHIP',
  'PERSONA-DEV-OWNERSHIP',
];

function splitGuidanceClauses(text) {
  return text
    .split(
      /\r?\n|[.!?]+(?:\s+|$)|[;,]|\b(?:but|however|yet)\b|\band\b(?=\s+(?:do\s+not|never|avoid|use|prefer|recommend|enforce|adopt|choose|enable|install|migrat\w*|must|should|can|may|will|(?:is|are)\s+(?:preferred|recommended|required))\b)/gi,
    )
    .map((clause) => clause.trim())
    .filter(Boolean);
}

function hasPositiveSignalsFollowUp(clause) {
  return SIGNALS_ACTIVE_FOLLOW_UP.test(clause) || SIGNALS_PASSIVE_FOLLOW_UP.test(clause);
}

function findSignalsReferences(clause) {
  const explicitReferences = [...clause.matchAll(new RegExp(SIGNALS_REFERENCE.source, 'gi'))];
  if (!SIGNALS_STATE_GUIDANCE_CONTEXT.test(clause)) return explicitReferences;

  const unqualifiedReferences = [...clause.matchAll(UNQUALIFIED_SIGNALS_REFERENCE)].filter(
    (candidate) =>
      !explicitReferences.some(
        (explicit) =>
          candidate.index >= explicit.index &&
          candidate.index < explicit.index + explicit[0].length,
      ),
  );
  return [...explicitReferences, ...unqualifiedReferences].sort(
    (left, right) => left.index - right.index,
  );
}

// Signals references fail closed unless rollback language is bound to the matched reference.
function isSignalsReferenceRestricted(clause, reference) {
  const beforeReference = clause.slice(0, reference.index).replace(/[`*_~]+\s*$/, '');
  const afterReference = clause
    .slice(reference.index + reference[0].length)
    .replace(/^\s*[`*_~]+/, '');
  if (SIGNALS_PREFIX_RESTRICTION.test(beforeReference)) return true;
  if (/\bkeep\s*$/i.test(beforeReference) && /^\s+disabled\b/i.test(afterReference)) {
    return true;
  }
  if (
    SIGNALS_REINTRODUCTION_PREFIX.test(beforeReference) &&
    SIGNALS_EXPLICIT_APPROVAL.test(afterReference)
  ) {
    return true;
  }

  const suffixRestriction = SIGNALS_SUFFIX_RESTRICTION.exec(afterReference);
  if (!suffixRestriction) return false;
  return !hasPositiveSignalsFollowUp(afterReference.slice(suffixRestriction[0].length));
}

function hasSharedSignalsRestriction(clause, references) {
  if (references.length < 2) return false;

  const normalizeBoundary = (text) => text.replace(/[`*_~]/g, '').trim();
  const firstReference = references[0];
  const lastReference = references.at(-1);
  const beforeFirst = clause.slice(0, firstReference.index);
  const afterLast = clause.slice(lastReference.index + lastReference[0].length);
  const coordinators = references
    .slice(1)
    .map((reference, index) =>
      normalizeBoundary(
        clause.slice(references[index].index + references[index][0].length, reference.index),
      ),
    );

  if (
    /\bneither\s*$/i.test(normalizeBoundary(beforeFirst)) &&
    coordinators.every((coordinator) => /^nor(?:\s+the)?$/i.test(coordinator)) &&
    SIGNALS_NEITHER_PREDICATE.test(normalizeBoundary(afterLast))
  ) {
    return true;
  }

  if (!coordinators.every((coordinator) => /^(?:and|or)(?:\s+the)?$/i.test(coordinator))) {
    return false;
  }
  if (
    SIGNALS_PREFIX_RESTRICTION.test(beforeFirst.replace(/[`*_~]+\s*$/, '')) &&
    normalizeBoundary(afterLast) === ''
  ) {
    return true;
  }
  if (!/^(?:-\s*)?(?:both)?$/i.test(normalizeBoundary(beforeFirst))) return false;

  const afterLastReference = afterLast.replace(/^\s*[`*_~]+/, '');
  const suffixRestriction = SIGNALS_SUFFIX_RESTRICTION.exec(afterLastReference);
  return (
    suffixRestriction !== null &&
    normalizeBoundary(afterLastReference.slice(suffixRestriction[0].length)) === ''
  );
}

function classifyPositiveSignalsGuidance(text) {
  const clauses = splitGuidanceClauses(text);
  let previousClauseReferencedSignals = false;
  for (const clause of clauses) {
    const references = findSignalsReferences(clause);
    if (references.length === 0) {
      if (
        previousClauseReferencedSignals &&
        (hasPositiveSignalsFollowUp(clause) || SIGNALS_IMPLICIT_ACTIVE_FOLLOW_UP.test(clause))
      ) {
        return { kind: 'directive', text: clause };
      }
      previousClauseReferencedSignals = false;
      continue;
    }
    previousClauseReferencedSignals = true;
    if (
      references.every((reference) => isSignalsReferenceRestricted(clause, reference)) ||
      hasSharedSignalsRestriction(clause, references)
    ) {
      continue;
    }
    const kind = SIGNALS_DIRECTIVE.test(clause)
      ? 'directive'
      : SIGNALS_INSTALLED_CLAIM.test(clause)
        ? 'installed claim'
        : 'stack claim';
    return { kind, text: clause };
  }
  return undefined;
}

function isSafeRuleGlob(glob) {
  if (
    typeof glob !== 'string' ||
    glob.length === 0 ||
    glob.includes('\\') ||
    glob.startsWith('/') ||
    /^[A-Za-z]:/.test(glob) ||
    glob.normalize('NFC') !== glob
  ) {
    return false;
  }
  return glob.split('/').every((segment) => {
    if (segment.length === 0 || segment === '.' || segment === '..') return false;
    if (segment === '**') return true;
    const hasControlCharacter = [...segment].some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint <= 31 || codePoint === 127;
    });
    return !segment.includes('**') && !/[?[\]{}]/.test(segment) && !hasControlCharacter;
  });
}

function validateRuleRegistry(rules, options = {}) {
  const errors = [];
  const addError = (message) =>
    errors.push({
      ruleId: 'SEMANTIC-RULE-REGISTRY',
      file: 'harness/rules/semantics.json',
      message,
    });
  if (!Array.isArray(rules)) {
    addError('rules must be an array');
    return errors;
  }

  const seenIds = new Set();
  for (const [index, rule] of rules.entries()) {
    if (typeof rule !== 'object' || rule === null || Array.isArray(rule)) {
      addError(`rule ${index} must be an object`);
      continue;
    }
    if (typeof rule.id !== 'string' || rule.id.length === 0) {
      addError(`rule ${index} id must be a non-empty string`);
    } else if (seenIds.has(rule.id)) {
      addError(`duplicate rule id: ${rule.id}`);
    } else {
      seenIds.add(rule.id);
    }
    if (
      !Array.isArray(rule.files) ||
      rule.files.length === 0 ||
      !rule.files.every(isSafeRuleGlob)
    ) {
      addError(`rule ${rule.id || index} files must be non-empty safe globs`);
    }
    for (const key of ['require', 'forbid']) {
      if (
        !Array.isArray(rule[key]) ||
        !rule[key].every((claim) => typeof claim === 'string' && claim.length > 0)
      ) {
        addError(`rule ${rule.id || index} ${key} must be an array of non-empty strings`);
      }
    }
    if (
      Object.hasOwn(rule, 'forbidPositiveSignalsGuidance') &&
      typeof rule.forbidPositiveSignalsGuidance !== 'boolean'
    ) {
      addError(`rule ${rule.id || index} Signals flag must be boolean`);
    }
    if (rule.id === 'STACK-NO-SIGNALS' && rule.forbidPositiveSignalsGuidance !== true) {
      addError('STACK-NO-SIGNALS must enable positive Signals guidance validation');
    }
  }

  if (options.requireAll) {
    const requiredIds = new Set(REQUIRED_RULE_IDS);
    for (const id of REQUIRED_RULE_IDS) {
      if (!seenIds.has(id)) addError(`missing required rule id: ${id}`);
    }
    for (const id of seenIds) {
      if (!requiredIds.has(id)) addError(`unexpected rule id: ${id}`);
    }
  }
  return errors;
}

function evaluateRules(rules, files, options = {}) {
  const errors = validateRuleRegistry(rules, { requireAll: options.requireCompleteScope === true });
  if (errors.length > 0) return errors;
  for (const rule of rules) {
    const scoped = Object.entries(files).filter(([file]) => matchesAny(file, rule.files));
    if (options.requireCompleteScope && scoped.length === 0) {
      errors.push({ ruleId: rule.id, file: '<scope>', message: 'no matching live files' });
      continue;
    }
    for (const [file, text] of scoped) {
      const normalized = text.toLowerCase();
      for (const claim of rule.require || []) {
        if (!normalized.includes(claim.toLowerCase())) {
          errors.push({ ruleId: rule.id, file, message: `missing claim: ${claim}` });
        }
      }
      for (const claim of rule.forbid || []) {
        if (normalized.includes(claim.toLowerCase())) {
          errors.push({ ruleId: rule.id, file, message: `forbidden claim: ${claim}` });
        }
      }
      if (rule.forbidPositiveSignalsGuidance) {
        const guidance = classifyPositiveSignalsGuidance(text);
        if (guidance) {
          errors.push({
            ruleId: rule.id,
            file,
            message: `forbidden positive Signals ${guidance.kind}: ${guidance.text}`,
          });
        }
      }
    }
  }
  return errors;
}

module.exports = {
  classifyPositiveSignalsGuidance,
  evaluateRules,
  globToRegExp,
  validateRuleRegistry,
};
