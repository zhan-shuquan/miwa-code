// Serialize versioned writes. Preserve edits made while a request is in flight.
export function mergeSavedDraft(submitted, current, saved) {
  const result = structuredClone(saved);
  for (const key of new Set([...Object.keys(submitted), ...Object.keys(current)])) {
    if (JSON.stringify(current[key]) === JSON.stringify(submitted[key])) continue;
    if (Object.hasOwn(current, key)) result[key] = structuredClone(current[key]);
    else delete result[key];
  }
  return result;
}

export function serializeDraftSaves(save) {
  let pending = Promise.resolve();
  return () => {
    const next = pending.then(save);
    pending = next.catch(() => {});
    return next;
  };
}

export function rebaseDraft(base, local, remote) {
  const merged = structuredClone(remote), conflicts = [];
  for (const key of new Set([...Object.keys(base), ...Object.keys(local)])) {
    const before = JSON.stringify(base[key]), after = JSON.stringify(local[key]);
    if (before === after) continue;
    if (JSON.stringify(remote[key]) !== before && JSON.stringify(remote[key]) !== after) {
      conflicts.push(key);
      continue;
    }
    if (Object.hasOwn(local, key)) merged[key] = structuredClone(local[key]);
    else delete merged[key];
  }
  return {merged, conflicts};
}
