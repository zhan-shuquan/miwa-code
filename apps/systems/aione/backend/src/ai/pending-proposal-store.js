const DEFAULT_TTL_MS = 60 * 60 * 1000;
const pending = new Map();

function makeId() {
  return `prp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function actorKey({ requestContext = {}, contextSnapshot = {} } = {}) {
  return requestContext.personId || contextSnapshot?.user?.personId || "anonymous";
}

function now() { return Date.now(); }

function purgeExpired() {
  const current = now();
  for (const [id, item] of pending.entries()) {
    if (!item || item.expiresAt <= current) pending.delete(id);
  }
}

export function stagePendingProposals({ proposals = [], executionId = null, officeCode = "chairman", objective = "", requestContext = {}, contextSnapshot = {}, ttlMs = DEFAULT_TTL_MS } = {}) {
  purgeExpired();
  const owner = actorKey({ requestContext, contextSnapshot });
  return proposals.map((proposal) => {
    const id = proposal?.id || makeId();
    const staged = {
      ...proposal,
      id,
      status: "waiting_confirmation",
      createdAt: proposal?.createdAt || new Date().toISOString()
    };
    pending.set(id, {
      id,
      proposal: staged,
      executionId,
      officeCode,
      objective,
      owner,
      createdAt: now(),
      expiresAt: now() + ttlMs
    });
    return staged;
  });
}

export function getPendingProposal({ proposalId = null, officeCode = "chairman", requestContext = {}, contextSnapshot = {} } = {}) {
  purgeExpired();
  if (!proposalId) return null;
  const item = pending.get(proposalId) || null;
  if (!item) return null;
  const owner = actorKey({ requestContext, contextSnapshot });
  if (item.owner !== owner || item.officeCode !== officeCode) return null;
  return item;
}

export function getLatestPendingProposal({ officeCode = "chairman", requestContext = {}, contextSnapshot = {} } = {}) {
  purgeExpired();
  const owner = actorKey({ requestContext, contextSnapshot });
  let latest = null;
  for (const item of pending.values()) {
    if (item.owner !== owner || item.officeCode !== officeCode) continue;
    if (!latest || item.createdAt > latest.createdAt) latest = item;
  }
  return latest;
}

export function clearPendingProposal(proposalId) {
  if (!proposalId) return false;
  return pending.delete(proposalId);
}

export function getPendingProposalRuntimeStatus() {
  purgeExpired();
  return {
    pendingProposalStore: "backend_memory",
    pendingProposalTtlMinutes: Math.round(DEFAULT_TTL_MS / 60000),
    pendingProposalCount: pending.size
  };
}
