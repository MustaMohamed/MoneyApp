const MAX_LOAD_ATTEMPTS = 2;

export async function ensureTransactionFormPrerequisite(
  isReady: () => boolean,
  load: () => Promise<void>,
): Promise<void> {
  for (let attempt = 0; attempt < MAX_LOAD_ATTEMPTS; attempt += 1) {
    if (isReady()) return;
    await load();
  }
  if (!isReady()) throw new Error('Transaction form prerequisite did not publish its data');
}
