import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import pg from "pg";
import { allocateSelectionNo } from "../src/services/selection-number-service.js";
import {
  parseShareText,
  parseIntakeWorkbook,
  sourceIdentity,
} from "../src/services/selection-intake-contract.js";
const base = "http://127.0.0.1:8765";
let checks = 0;
const cookies = {};
const check = (value) => {
  assert(value);
  checks++;
};
for (const account of ["manager", "employeeA", "employeeB", "admin"]) {
  const r = await fetch(base + "/__preview/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ account }),
  });
  cookies[account] = r.headers.get("set-cookie").split(";")[0];
}
async function api(
  who,
  path,
  body,
  status = 200,
  method = body ? "POST" : "GET",
) {
  const r = await fetch(base + "/api/v1/selection-workspace" + path, {
    method,
    headers: { cookie: cookies[who], "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const j = await r.json();
  assert.equal(r.status, status, JSON.stringify(j));
  checks++;
  return j;
}
check(
  sourceIdentity("https://detail.1688.com/offer/123456.html?spm=x").key ===
    sourceIdentity("https://detail.1688.com/offer/123456.html").key,
);
check(
  parseShareText("甲\nhttps://example.com/a\n乙\nhttps://example.com/b")
    .length === 2,
);
check(parseShareText("分享口令 ABC").length === 1);
const workbook = await parseIntakeWorkbook(
  await readFile(
    "D:/产品(Products)/86000占树全选品-zsq/zsq111/1688-global-selection-1794128743463.xlsx",
  ),
  "real.xlsx",
);
check(workbook.rows.length === 1);
check(workbook.rows[0].images.length > 0);
check(workbook.rows[0].source.platformId === "1065657004887");
check(workbook.rows[0].referencePrice !== null);
check(!!workbook.rows[0].sourceFacts.image);
const db = new pg.Pool({
  connectionString:
    "postgres://aione_test:isolated-local-test-only@127.0.0.1:55432/aione_selection",
});
const c = await db.connect();
try {
  await c.query("BEGIN");
  await c.query(
    "INSERT INTO selection_number_counters(selection_date,last_number) VALUES('2099-01-02',999) ON CONFLICT(selection_date) DO UPDATE SET last_number=999",
  );
  const n = await allocateSelectionNo(c, "2099-01-01T15:00:00Z");
  check(n.selectionNo === "xp9901021000");
  await c.query("ROLLBACK");
} finally {
  c.release();
}
const key = crypto.randomUUID(),
  text =
    "验收 " + key + "\nhttps://detail.1688.com/offer/" + Date.now() + ".html";
const body = { text, requestKey: key };
const first = await api("manager", "/pool/collect", body, 201);
const again = await api("manager", "/pool/collect", body, 201);
check(first.items[0].id === again.items[0].id);
const id = first.items[0].id;
await api(
  "employeeA",
  "/pool/collect",
  { text, requestKey: crypto.randomUUID() },
  403,
);
await api("employeeA", "/pool/records?scope=all", null, 403);
const duplicate = await api(
  "manager",
  "/pool/collect",
  { text, requestKey: crypto.randomUUID() },
  201,
);
check(duplicate.items[0].state === "duplicate");
const outcomes = await Promise.all(
  ["employeeA", "employeeB"].map(async (who) => {
    const r = await fetch(base + "/api/v1/selection-workspace/pool/action", {
      method: "POST",
      headers: { cookie: cookies[who], "content-type": "application/json" },
      body: JSON.stringify({ action: "claim", ids: [id] }),
    });
    return { who, status: r.status };
  }),
);
check(outcomes.filter((r) => r.status === 200).length === 1);
check(outcomes.filter((r) => r.status === 409).length === 1);
const winner = outcomes.find((r) => r.status === 200).who,
  loser = outcomes.find((r) => r.status === 409).who;
await api(loser, "/records/" + encodeURIComponent(id), null, 404);
const claimed = await api(winner, "/records/" + encodeURIComponent(id));
check(claimed.selector === "86990");
check(claimed.selectionNo === first.items[0].selectionNo);
await api("manager", "/pool/action", {
  action: "assign",
  ids: [id],
  owner: loser === "employeeA" ? "86991" : "86992",
});
await api(winner, "/records/" + encodeURIComponent(id), null, 404);
const reassigned = await api(loser, "/records/" + encodeURIComponent(id));
check(reassigned.selector === "86990");
const tasks = await api(loser, "/pool/tasks");
check(
  tasks.items.filter((t) => t.metadata.selectionNo === reassigned.selectionNo)
    .length === 1,
);
await api(
  loser,
  "/pool/action",
  { action: "abandon", ids: [id], reason: "" },
  400,
);
await api(loser, "/pool/action", { action: "return", ids: [id] });
await api('employeeA','/pool/people/prefix',{memberId:'86991',prefix:'qat'},410);
const prefix=await api('employeeA','/pool/people');
check(prefix.employee.memberId==='86991' && prefix.employee.prefix==='qat');
check(prefix.canEdit===false);
const pending = await api(
  "manager",
  "/pool/records?scope=pending&sort=selectionNo&direction=asc&limit=1",
);
check(pending.total > pending.items.length);
const png = workbook.rows[0].images[0];
const imageRecord = await api(
  "manager",
  "/pool/collect",
  {
    candidates: [{ title: "真实1688图片验收", images: [png] }],
    requestKey: crypto.randomUUID(),
  },
  201,
);
check(["created", "duplicate"].includes(imageRecord.items[0].state));
if (imageRecord.items[0].state === "created") {
  const list = await api(
    "manager",
    "/pool/records?scope=all&q=" +
      encodeURIComponent(imageRecord.items[0].selectionNo),
  );
  check(list.items[0].assets.length === 1);
  const r = await fetch(
    base +
      "/api/v1/selection-workspace/pool/records/" +
      encodeURIComponent(list.items[0].id) +
      "/assets/" +
      list.items[0].assets[0].id +
      "?size=thumbnail",
    { headers: { cookie: cookies.manager } },
  );
  check(r.ok);
  check((await r.arrayBuffer()).byteLength > 100);
}
const english = parseShareText(
  "First\nhttps://example.com/a\nSecond\nhttps://example.com/b",
);
check(
  english[0].source.url === "https://example.com/a" &&
    english[1].title === "Second",
);
check(
  parseShareText("商品\nhttps://detail.1688.com/offer/\n123456.html")[0].source
    .platformId === "123456",
);
await api(
  "employeeA",
  "/records",
  { data: { sourceUrl: first.items[0].source.url } },
  409,
);
const sourceCheck = await api("employeeA", "/source-check", {
  sourceUrl: first.items[0].source.url,
});
check(sourceCheck.duplicates.length === 1 && !sourceCheck.duplicates[0].id);
const csvUrl = "https://example.com/pool-test/" + crypto.randomUUID();
const csv =
  "商品标题,商品链接,商品价格\n有效," +
  csvUrl +
  ",12\n重复," +
  csvUrl +
  ",12\n异常,https://example.com/bad-price,not-a-number";
const partial = await api(
  "manager",
  "/pool/collect",
  {
    file: {
      filename: "partial.csv",
      base64: Buffer.from(csv).toString("base64"),
    },
    requestKey: crypto.randomUUID(),
  },
  201,
);
check(
  partial.items.map((i) => i.state).join(",") === "created,duplicate,invalid",
);
const snsId = "pool_" + crypto.randomUUID().replaceAll("-", "");
await api(
  "manager",
  "/pool/collect",
  {
    text: "收纳盒\nhttps://www.instagram.com/p/" + snsId + "/",
    requestKey: crypto.randomUUID(),
  },
  201,
);
const sns = await api("manager", "/pool/preflight", {
  text: "同一视频里的挂钩\nhttps://www.instagram.com/reel/" + snsId + "/",
});
check(sns.suspected === 1);
const original = (
  await db.query(
    "SELECT raw_text FROM selection_intake_requests WHERE actor_id=$1 AND request_key=$2",
    ["86990", key],
  )
).rows[0];
check(original.raw_text === text);
await db.end();
const result = {
  checks,
  verifiedAt: new Date().toISOString(),
  concurrency: outcomes,
  realWorkbookRows: workbook.rows.length,
};
await writeFile(
  new URL("../../../../../.local/pool-test-result.json", import.meta.url),
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result));
