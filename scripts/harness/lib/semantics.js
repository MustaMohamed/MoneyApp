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

const REQUIRED_RULE_IDS = [
  'AUTH-USER-INTEGRATION',
  'GATE-SPEC-SIGNOFF',
  'GATE-DEVICE-QA',
  'GATE-CRITICAL-TRIGGER',
  'LEAD-PLAN-APPROVAL',
  'LEAD-REVIEW-VERDICT',
  'STACK-ZUSTAND',
  'PATH-SRC-CANONICAL',
  'UI-HEROUI',
  'PERSONA-SARAH-OWNERSHIP',
  'PERSONA-MARCUS-OWNERSHIP',
  'PERSONA-LAYLA-OWNERSHIP',
  'PERSONA-TARIQ-OWNERSHIP',
  'PERSONA-DEV-OWNERSHIP',
];

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
    }
  }
  return errors;
}

module.exports = {
  evaluateRules,
  globToRegExp,
  validateRuleRegistry,
};
