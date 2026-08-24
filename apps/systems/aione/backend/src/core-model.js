export const CORE_RESOURCES = Object.freeze({
  organizations: {
    table: "organizations",
    prefix: "org",
    required: ["orgType", "code", "name"],
    writable: {
      parentId: "parent_id", orgType: "org_type", code: "code", name: "name", status: "status",
      validFrom: "valid_from", validTo: "valid_to", metadata: "metadata"
    },
    filters: { parentId: "parent_id", orgType: "org_type", status: "status", code: "code" },
    defaultSort: "created_at DESC"
  },
  businesses: {
    table: "businesses",
    prefix: "biz",
    required: ["code", "name"],
    writable: {
      companyOrgId: "company_org_id", parentBusinessId: "parent_business_id", code: "code", name: "name",
      lifecycleStatus: "lifecycle_status", goalSummary: "goal_summary", launchConditionSummary: "launch_condition_summary",
      plannedAt: "planned_at", launchedAt: "launched_at", closedAt: "closed_at", metadata: "metadata"
    },
    filters: { companyOrgId: "company_org_id", lifecycleStatus: "lifecycle_status", code: "code" },
    defaultSort: "created_at DESC"
  },
  positions: {
    table: "positions",
    prefix: "pos",
    required: ["code", "name"],
    writable: {
      organizationId: "organization_id", businessId: "business_id", code: "code", name: "name",
      positionType: "position_type", status: "status", headcountStatus: "headcount_status", headcountLimit: "headcount_limit",
      responsibilitySummary: "responsibility_summary", capabilityRequirements: "capability_requirements",
      compensationPlan: "compensation_plan", metadata: "metadata"
    },
    filters: { organizationId: "organization_id", businessId: "business_id", positionType: "position_type", status: "status", headcountStatus: "headcount_status" },
    defaultSort: "created_at DESC"
  },
  assignments: {
    table: "assignments",
    prefix: "asg",
    required: ["personId", "positionId", "effectiveFrom"],
    writable: {
      personId: "person_id", positionId: "position_id", organizationId: "organization_id", businessId: "business_id",
      assignmentType: "assignment_type", status: "status", isPrimary: "is_primary", responsibilitySummary: "responsibility_summary",
      businessScope: "business_scope", effectiveFrom: "effective_from", effectiveTo: "effective_to", endedReason: "ended_reason", metadata: "metadata"
    },
    filters: { personId: "person_id", positionId: "position_id", businessId: "business_id", status: "status", assignmentType: "assignment_type" },
    defaultSort: "effective_from DESC"
  },
  "ai-talents": {
    table: "ai_talents", prefix: "ait", required: ["code", "name"],
    writable: { code:"code", name:"name", talentType:"talent_type", status:"status", version:"version", provider:"provider", model:"model", responsibilitySummary:"responsibility_summary", capabilityProfile:"capability_profile", costProfile:"cost_profile", metadata:"metadata" },
    filters: { code:"code", talentType:"talent_type", status:"status", provider:"provider", model:"model" },
    defaultSort: "created_at DESC"
  },
  "ai-offices": {
    table: "ai_offices", prefix: "aio", required: ["code", "name"],
    writable: { code:"code", name:"name", officeType:"office_type", status:"status", humanOwnerPositionId:"human_owner_position_id", humanOwnerPersonId:"human_owner_person_id", aiSecretaryTalentId:"ai_secretary_talent_id", scopeSummary:"scope_summary", responsibilitySummary:"responsibility_summary", metadata:"metadata" },
    filters: { code:"code", officeType:"office_type", status:"status", humanOwnerPersonId:"human_owner_person_id", aiSecretaryTalentId:"ai_secretary_talent_id" },
    defaultSort: "created_at DESC"
  },
  "ai-assignments": {
    table: "ai_assignments", prefix: "aiasg", required: ["aiTalentId", "aiOfficeId"],
    writable: { aiTalentId:"ai_talent_id", aiOfficeId:"ai_office_id", aiPositionId:"ai_position_id", assignmentType:"assignment_type", status:"status", humanOwnerPersonId:"human_owner_person_id", responsibilitySummary:"responsibility_summary", effectiveFrom:"effective_from", effectiveTo:"effective_to", metadata:"metadata" },
    filters: { aiTalentId:"ai_talent_id", aiOfficeId:"ai_office_id", aiPositionId:"ai_position_id", status:"status", humanOwnerPersonId:"human_owner_person_id" },
    defaultSort: "created_at DESC"
  },
  "object-registry": {
    table: "object_registry",
    prefix: "obj",
    required: ["objectType", "objectId"],
    writable: {
      objectType: "object_type", objectId: "object_id", canonicalTable: "canonical_table", displayName: "display_name",
      lifecycleStatus: "lifecycle_status", businessId: "business_id", ownerPersonId: "owner_person_id", metadata: "metadata"
    },
    filters: { objectType: "object_type", objectId: "object_id", lifecycleStatus: "lifecycle_status", businessId: "business_id", ownerPersonId: "owner_person_id" },
    defaultSort: "created_at DESC"
  },
  "work-items": {
    table: "work_items",
    prefix: "wrk",
    required: ["title", "workType"],
    writable: {
      title: "title", workType: "work_type", status: "status", priority: "priority", businessId: "business_id",
      ownerPersonId: "owner_person_id", ownerAssignmentId: "owner_assignment_id", workbenchCode: "workbench_code",
      relatedObjectType: "related_object_type", relatedObjectId: "related_object_id", goalSummary: "goal_summary",
      description: "description", platformCode: "platform_code", moneyStatus: "money_status", expectedResult: "expected_result",
      resultSummary: "result_summary", dueAt: "due_at", startedAt: "started_at", completedAt: "completed_at", metadata: "metadata"
    },
    filters: { ownerPersonId: "owner_person_id", businessId: "business_id", status: "status", priority: "priority", workType: "work_type", relatedObjectType: "related_object_type", relatedObjectId: "related_object_id" },
    defaultSort: "created_at DESC"
  }
});

export const IMMUTABLE_FACT_RESOURCES = Object.freeze({
  "object-relations": {
    table: "object_relations", prefix: "rel", required: ["fromObjectType", "fromObjectId", "toObjectType", "toObjectId", "relationType"],
    writable: {
      fromObjectType: "from_object_type", fromObjectId: "from_object_id", toObjectType: "to_object_type", toObjectId: "to_object_id",
      relationType: "relation_type", validFrom: "valid_from", validTo: "valid_to", metadata: "metadata"
    },
    filters: { fromObjectType: "from_object_type", fromObjectId: "from_object_id", toObjectType: "to_object_type", toObjectId: "to_object_id", relationType: "relation_type" }
  },
  "work-sessions": {
    table: "work_sessions", prefix: "wss", required: ["personId", "sessionType", "startedAt"],
    writable: {
      personId: "person_id", assignmentId: "assignment_id", workItemId: "work_item_id", businessId: "business_id",
      sessionType: "session_type", sourcePlatform: "source_platform", startedAt: "started_at", endedAt: "ended_at",
      activeSeconds: "active_seconds", detectionMethod: "detection_method", confidence: "confidence", metadata: "metadata"
    },
    filters: { personId: "person_id", workItemId: "work_item_id", businessId: "business_id", sessionType: "session_type" }
  },
  "work-evidence": {
    table: "work_evidence", prefix: "wev", required: ["evidenceType"],
    writable: {
      workItemId: "work_item_id", personId: "person_id", assignmentId: "assignment_id", businessId: "business_id",
      relatedObjectType: "related_object_type", relatedObjectId: "related_object_id", evidenceType: "evidence_type",
      actionCode: "action_code", happenedAt: "happened_at", durationSeconds: "duration_seconds", resultCode: "result_code",
      summary: "summary", evidenceUri: "evidence_uri", sourceSystem: "source_system", payload: "payload"
    },
    filters: { personId: "person_id", workItemId: "work_item_id", businessId: "business_id", evidenceType: "evidence_type", relatedObjectType: "related_object_type", relatedObjectId: "related_object_id" }
  },
  "money-events": {
    table: "money_events", prefix: "mny", required: ["direction", "moneyType", "amount", "occurredAt"],
    writable: {
      direction: "direction", moneyType: "money_type", amount: "amount", currency: "currency", status: "status",
      businessId: "business_id", workItemId: "work_item_id", personId: "person_id", relatedObjectType: "related_object_type",
      relatedObjectId: "related_object_id", occurredAt: "occurred_at", sourceSystem: "source_system", externalRef: "external_ref",
      evidenceUri: "evidence_uri", metadata: "metadata"
    },
    filters: { direction: "direction", status: "status", businessId: "business_id", workItemId: "work_item_id", personId: "person_id" }
  },
  results: {
    table: "result_facts", prefix: "res", required: ["resultType"],
    writable: {
      resultType: "result_type", status: "status", businessId: "business_id", workItemId: "work_item_id", personId: "person_id",
      relatedObjectType: "related_object_type", relatedObjectId: "related_object_id", metricCode: "metric_code",
      numericValue: "numeric_value", textValue: "text_value", unit: "unit", observedAt: "observed_at", evidenceId: "evidence_id", metadata: "metadata"
    },
    filters: { resultType: "result_type", status: "status", businessId: "business_id", workItemId: "work_item_id", personId: "person_id", metricCode: "metric_code" }
  },
  events: {
    table: "business_events", prefix: "evt", required: ["eventType", "objectType", "objectId"],
    writable: {
      eventType: "event_type", objectType: "object_type", objectId: "object_id", actorKind: "actor_kind",
      actorPersonId: "actor_person_id", actorAiRef: "actor_ai_ref", correlationId: "correlation_id", causationId: "causation_id",
      happenedAt: "happened_at", payload: "payload", sourceSystem: "source_system"
    },
    filters: { eventType: "event_type", objectType: "object_type", objectId: "object_id", actorPersonId: "actor_person_id", actorKind: "actor_kind" }
  },
  "knowledge-routes": {
    table: "knowledge_routes", prefix: "knr", required: ["routeKind", "knowledgeId"],
    writable: {
      objectType: "object_type", objectId: "object_id", fieldCode: "field_code", routeKind: "route_kind", knowledgeId: "knowledge_id",
      anchorId: "anchor_id", status: "status", validFrom: "valid_from", validTo: "valid_to", metadata: "metadata"
    },
    filters: { objectType: "object_type", objectId: "object_id", fieldCode: "field_code", routeKind: "route_kind", knowledgeId: "knowledge_id", status: "status" }
  },
  "ai-executions": {
    table: "ai_executions", prefix: "aix", required: ["objective"],
    writable: {
      officeCode: "office_code", aiSecretaryCode: "ai_secretary_code", requestedByPersonId: "requested_by_person_id",
      workItemId: "work_item_id", objective: "objective", status: "status", provider: "provider", model: "model",
      startedAt: "started_at", completedAt: "completed_at", toolCallCount: "tool_call_count", inputTokens: "input_tokens",
      outputTokens: "output_tokens", estimatedCost: "estimated_cost", currency: "currency", resultSummary: "result_summary",
      evidenceId: "evidence_id", metadata: "metadata"
    },
    filters: { requestedByPersonId: "requested_by_person_id", workItemId: "work_item_id", status: "status", officeCode: "office_code" }
  }
});
