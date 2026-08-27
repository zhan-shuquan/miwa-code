import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeWorkAttention, getWorkAttentionReason } from "../js/services/work-attention-service.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const me = "86000";
const now = Date.parse("2026-08-26T08:00:00Z");
const items = [
  { id:"pending-mine", status:"pending", ownerPersonId:me, createdByPersonId:"x" },
  { id:"active-mine", status:"in_progress", ownerPersonId:me, createdByPersonId:"x" },
  { id:"waiting-review", status:"waiting", ownerPersonId:"x", createdByPersonId:me },
  { id:"waiting-owner-only", status:"waiting", ownerPersonId:me, createdByPersonId:"x" },
  { id:"blocked-mine", status:"blocked", ownerPersonId:me, createdByPersonId:"x" },
  { id:"overdue-active", status:"in_progress", ownerPersonId:me, createdByPersonId:"x", dueAt:"2026-08-25T00:00:00Z" },
  { id:"future-active", status:"in_progress", ownerPersonId:me, createdByPersonId:"x", dueAt:"2026-08-27T00:00:00Z" },
  { id:"completed-mine", status:"completed", ownerPersonId:me, createdByPersonId:me, dueAt:"2026-08-20T00:00:00Z" },
  { id:"pending-other", status:"pending", ownerPersonId:"other", createdByPersonId:me }
];

assert.equal(getWorkAttentionReason(items[0], me, now), "pending");
assert.equal(getWorkAttentionReason(items[1], me, now), "");
assert.equal(getWorkAttentionReason(items[2], me, now), "waiting");
assert.equal(getWorkAttentionReason(items[3], me, now), "");
assert.equal(getWorkAttentionReason(items[4], me, now), "blocked");
assert.equal(getWorkAttentionReason(items[5], me, now), "overdue");
assert.equal(getWorkAttentionReason(items[7], me, now), "");

const attention = computeWorkAttention(items, me, now);
assert.equal(attention.count, 4);
assert.deepEqual(attention.breakdown, { pending:1, waiting:1, overdue:1, blocked:1 });

const service = read("js/services/work-attention-service.js");
const system = read("js/miwa-system.js");
const header = read("js/shell/header.js");
const workHome = read("js/pages/miwa-work-home.js");
const aiClient = read("js/ai/ai-secretary-client.js");
const index = read("index.html");
const deploy = read("../../../infra/gcp/cloud-shell/RUN_E_ENABLE_LIVE_MIWAAI.sh");

assert.ok(service.includes('const POLL_MS = 60 * 1000'), "60 second poll is required");
assert.ok(service.includes('window.addEventListener("focus"') && service.includes('visibilitychange'), "focus and visibility refresh are required");
assert.ok(service.includes('aione:work-items-changed') && service.includes('aione:work-attention-updated'), "work change event bus is required");
assert.ok(system.includes('initWorkAttentionSync') && system.includes('Work Attention Sync'), "global sync must initialize after Header");
assert.ok(header.includes('setWorkCount(count)'), "Header must expose a dedicated work badge setter");
assert.ok(workHome.includes('computeWorkAttention') && workHome.includes('m.attention'), "Work Home badge must use attention count, not all open work");
assert.ok(workHome.includes('work-started') && workHome.includes('work-completion-submitted') && workHome.includes('work-completion-approved'), "work status changes must announce immediately");
assert.ok(aiClient.includes('ai-proposal-confirmed') && aiClient.includes('announceWorkItemsChanged'), "AI proposal confirmation must trigger immediate work badge refresh");
assert.ok(index.includes('v1.9.30.2-work-attention') || index.includes('v1.9.37-work-home-structure-finalization'), "browser bootstrap cache must preserve Work Attention or use a newer validated bootstrap marker");
assert.ok(deploy.includes('v1.9.30.2'), "deployment image tag must target V1.9.30.2");

console.log("V1.9.30.2 Work Home attention realtime sync validation passed.");
