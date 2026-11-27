import assert from "node:assert/strict";
import { selectionReadScope } from "../src/http/selection-owner-policy.js";
assert.throws(
  () =>
    selectionReadScope({
      query: {},
      headers: { "x-aione-person-id": "victim" },
    }),
  /authenticated_actor_required/,
);
assert.deepEqual(
  selectionReadScope({
    aioneIdentity: { personId: "employee" },
    query: { scope: "all", ownerPersonId: "victim" },
  }),
  { scope: "mine", ownerId: "employee" },
);
assert.deepEqual(
  selectionReadScope({
    aioneIdentity: {
      subjectType: "admin",
      identitySource: "canonical_database",
      personId: "person",
    },
    query: { scope: "all" },
  }),
  { scope: "mine", ownerId: "person" },
);
assert.deepEqual(
  selectionReadScope({
    aioneIdentity: {
      subjectType: "admin",
      identitySource: "legacy_admin_bridge",
    },
    query: {},
  }),
  { scope: "all", ownerId: null },
);
assert.deepEqual(
  selectionReadScope({
    aioneIdentity: {
      subjectType: "admin",
      identitySource: "legacy_admin_bridge",
    },
    query: { ownerPersonId: "person" },
  }),
  { scope: "all", ownerId: "person" },
);
assert.throws(() =>
  selectionReadScope({
    aioneIdentity: {
      subjectType: "admin",
      identitySource: "legacy_admin_bridge",
    },
    query: { scope: "mine" },
  }),
);
console.log("6 selection ownership policy checks passed");
