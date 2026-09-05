/* ========================================
   AIONE Platform Capability Registry
   平台级公共能力唯一事实源。

   CURRENT｜2026-09-05
   回收站属于平台级对象生命周期能力：
   - 全系统只建设一个统一回收站。
   - 12之家不得分别建设独立回收站。
   - 各之家如需“已删除”入口，只能作为统一回收站的作用域过滤视图。
======================================== */

const capability = (id, label, options = {}) => Object.freeze({
  id,
  label,
  scope: options.scope || "global",
  status: options.status || "active",
  route: options.route || null,
  ownerLayer: options.ownerLayer || "platform",
  description: options.description || ""
});

export const RECYCLE_BIN_POLICY = Object.freeze({
  id: "global-recycle-bin",
  label: "回收站",
  scope: "global",
  lifecycle: Object.freeze({
    deleteMode: "soft-delete",
    restoreSupported: true,
    permanentDeleteRequiresExplicitConfirmation: true,
    retentionPolicy: "configurable",
    auditRequired: true
  }),
  sourceScope: Object.freeze({
    homes: "all",
    centers: "all",
    objectTypes: "registered-trashable-objects"
  }),
  homeBehavior: Object.freeze({
    independentRecycleBinAllowed: false,
    deletedViewAllowed: true,
    deletedViewMode: "filtered-global-recycle-bin"
  }),
  requiredFields: Object.freeze([
    "trash_id",
    "object_type",
    "object_id",
    "home_id",
    "center_id",
    "deleted_by",
    "deleted_at",
    "delete_reason",
    "original_parent",
    "original_relations",
    "restore_target",
    "retention_until",
    "status"
  ]),
  statuses: Object.freeze([
    "recoverable",
    "pending-permanent-delete",
    "permanently-deleted"
  ])
});

export const PLATFORM_CAPABILITIES = Object.freeze({
  recycleBin: capability("global-recycle-bin", "回收站", {
    scope: "global",
    ownerLayer: "platform-object-lifecycle",
    description: "统一承载AIONE各之家业务对象的软删除、恢复、保留期、永久删除与审计。"
  })
});

export function getPlatformCapability(capabilityId) {
  return Object.values(PLATFORM_CAPABILITIES).find((item) => item.id === capabilityId) || null;
}

export function getRecycleBinPolicy() {
  return RECYCLE_BIN_POLICY;
}

export function isIndependentHomeRecycleBinAllowed() {
  return RECYCLE_BIN_POLICY.homeBehavior.independentRecycleBinAllowed;
}
