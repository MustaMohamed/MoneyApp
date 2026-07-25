const { validateArtifactReference: validateArtifactReferenceDefault } = require('./evidence');
const { loadEventHistory: loadEventHistoryDefault } = require('./store');
const { discoverInitiativeIds: discoverInitiativeIdsDefault } = require('./status');

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function activeArtifactReferences(projection) {
  if (!projection || projection.phase === 'cancelled') return [];
  const references = [
    projection?.spec?.current,
    projection?.plan?.current,
    projection?.review?.artifact,
    projection?.qa?.artifact,
  ].filter(Boolean);
  const seen = new Set();
  return references.filter((reference) => {
    const identity = `${reference.path}\0${reference.sha256}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function collectWorkflowValidationErrors({
  root,
  machine,
  discoverInitiativeIds = discoverInitiativeIdsDefault,
  loadEventHistory = loadEventHistoryDefault,
  validateArtifactReference = validateArtifactReferenceDefault,
}) {
  const errors = [];
  const initiativeIds = [...discoverInitiativeIds(root)].sort(compareCodeUnits);
  for (const initiativeId of initiativeIds) {
    const ledgerPath = `docs/superpowers/initiatives/${initiativeId}/events`;
    try {
      const history = loadEventHistory({ root, initiativeId, machine });
      for (const reference of activeArtifactReferences(history.projection)) {
        validateArtifactReference(root, reference);
      }
    } catch (error) {
      errors.push({
        ruleId: 'WORKFLOW-STATE',
        file: ledgerPath,
        message: error.message,
      });
    }
  }
  return errors;
}

module.exports = {
  activeArtifactReferences,
  collectWorkflowValidationErrors,
};
