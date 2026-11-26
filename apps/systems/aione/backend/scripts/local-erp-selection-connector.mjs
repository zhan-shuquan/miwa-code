// Local ERP agent: outbound HTTPS on the Windows host, local Docker stdin only.
// This leaves the existing ERP network guard and all publishing workers untouched.
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const development = JSON.parse(await readFile(new URL('../config/local-development.json',import.meta.url),'utf8'));
const base = process.env.AIONE_CLOUD_URL || development.origin;
const url = new URL(base);
if (
  url.protocol !== "https:" &&
  !["127.0.0.1", "localhost"].includes(url.hostname)
)
  throw Error("HTTPS required");
const token = process.env.AIONE_CONNECTOR_TOKEN;
if (!token) throw Error("Connector token required");
const docker = process.env.DOCKER_EXE || "docker";
async function erp(filename, input) {
  const source = await readFile(resolve(here, filename));
  return new Promise((resolve, reject) => {
    const child = spawn(
      docker,
      [
        "exec",
        "-i",
        "-w",
        "/home/frappe/frappe-bench",
        "miwa-erp-dev-backend-1",
        "env/bin/python",
        "-c",
        `import base64; exec(base64.b64decode('${source.toString("base64")}'))`,
      ],
      { windowsHide: true },
    );
    let output = "",
      error = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(
        Error("ERP bridge timeout; unknown result, receipt remains idempotent"),
      );
    }, 60000);
    child.stdout.on("data", (d) => (output += d));
    child.stderr.on("data", (d) => (error += d));
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code) return reject(Error(error.slice(-2000)));
      try {
        resolve(JSON.parse(output));
      } catch {
        reject(Error("ERP response invalid"));
      }
    });
    child.stdin.end(input ? JSON.stringify(input) : "");
  });
}
async function api(path, body, binary = false) {
  const r = await fetch(base + "/api/v1/selection-workspace" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      "x-aione-connector-token": token,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw Error("AIONE " + r.status + ": " + (await r.text()));
  return binary ? Buffer.from(await r.arrayBuffer()) : r.json();
}
async function once() {
  // Personnel revocations must synchronize even when a changed cost rule awaits review.
  await api('/connector/employees',await erp('export-erp-employees.py'));
  const snapshot = await erp("export-erp-selection-snapshot.py");
  const version = await api("/connector/snapshot", snapshot);
  const commands = await api("/connector/commands/claim", {});
  for (const command of commands.jobs) {
    const result = await erp("erp-selection-numbering.py", {
      kind: command.kind,
      payload: command.payload,
    });
    await api("/connector/commands/" + command.id + "/result", {
      ...result,
      leaseToken: command.lease_token,
    });
  }
  const { jobs } = await api("/connector/claim", {});
  for (const job of jobs) {
    let result;
    if (job.payload.parameterVersion !== version.version)
      result = {
        status: "conflict",
        result: { message: "ERP参数变化，未覆盖员工确认数据" },
      };
    else {
      const assets = [];
      for (const a of job.payload.assets)
        assets.push({
          ...a,
          base64: (
            await api(
              "/connector/jobs/" + job.id + "/assets/" + a.id,
              undefined,
              true,
            )
          ).toString("base64"),
        });
      result = await erp("erp-selection-receiver.py", {
        payload: job.payload,
        assets,
      });
    }
    await api("/connector/jobs/" + job.id + "/result", {
      ...result,
      leaseToken: job.lease_token,
    });
    console.log(JSON.stringify({ job: job.id, ...result }));
  }
  console.log("ERP snapshot synchronized; tasks=" + jobs.length);
}
do {
  try {
    await once();
  } catch (e) {
    console.error(e.message);
    if(process.env.AIONE_CONNECTOR_ONCE === "1") process.exitCode=1;
  }
  if (process.env.AIONE_CONNECTOR_ONCE === "1") break;
  await new Promise((r) =>
    setTimeout(
      r,
      Math.max(10, Number(process.env.AIONE_SYNC_SECONDS) || 60) * 1000,
    ),
  );
} while (true);
