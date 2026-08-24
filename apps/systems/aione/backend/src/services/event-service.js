import { randomUUID } from "node:crypto";

export function makeId(prefix) {
  return `${prefix}_${randomUUID()}`;
}

export async function recordBusinessEvent(client, {
  eventType,
  objectType,
  objectId,
  context = {},
  payload = {},
  actorKind,
  actorAiRef,
  correlationId,
  causationId
}) {
  const id = makeId("evt");
  await client.query(
    `INSERT INTO public.business_events
      (id, event_type, object_type, object_id, actor_kind, actor_person_id, actor_ai_ref, correlation_id, causation_id, payload, source_system)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)`,
    [
      id,
      eventType,
      objectType,
      objectId,
      actorKind || context.actorKind || "system",
      context.personId || null,
      actorAiRef || null,
      correlationId || context.correlationId || null,
      causationId || null,
      JSON.stringify(payload || {}),
      context.sourceSystem || "aione"
    ]
  );
  return id;
}
