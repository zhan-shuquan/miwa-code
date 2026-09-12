import { buildDeterministicCopyPlan, normalizeCopyValues } from "../src/services/design-copy-overlay-service.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectCode(fn, code) {
  try {
    fn();
  } catch (error) {
    assert(error.code === code, `Expected ${code}, received ${error.code || error.message}`);
    return;
  }
  throw new Error(`Expected ${code} to be thrown.`);
}

const template = {
  layout_spec: {
    copyOverlay: {
      rendererVersion: "v1",
      locale: "ja-JP",
      slots: {
        headline: {
          x: 90,
          y: 180,
          width: 820,
          height: 220,
          pointSize: 64,
          fontKey: "noto-sans-cjk-jp-bold",
          fill: "#222222",
          gravity: "West"
        },
        body: {
          x: 90,
          y: 1180,
          width: 820,
          height: 180,
          pointSize: 34,
          fontKey: "noto-sans-cjk-jp",
          fill: "#333333",
          gravity: "West"
        }
      }
    }
  },
  validation_rules: {
    copyRestrictedClaims: ["防臭", "純綿", "抗菌"]
  }
};

const normalized = normalizeCopyValues({ headline: "毎日に使いやすい", body: "やさしいリブ編みソックス" });
assert(normalized.headline === "毎日に使いやすい", "Expected deterministic copy normalization.");

const plan = buildDeterministicCopyPlan(template, normalized, []);
assert(plan.rendererVersion === "v1", "Expected renderer version v1.");
assert(plan.blocks.length === 2, "Expected exactly two deterministic text blocks.");
assert(plan.blocks[0].fontPath.includes("NotoSansCJK"), "Expected registered Noto CJK font path.");

expectCode(
  () => buildDeterministicCopyPlan(template, { headline: "防臭ソックス" }, []),
  "design_copy_unapproved_claim"
);

const approved = buildDeterministicCopyPlan(template, { headline: "防臭ソックス" }, ["防臭"]);
assert(approved.blocks.length === 1, "Approved restricted claim should be renderable.");

expectCode(
  () => buildDeterministicCopyPlan(template, { unknown: "test" }, []),
  "design_copy_slot_not_allowed"
);

expectCode(
  () => normalizeCopyValues({ "bad slot": "x" }),
  "design_copy_slot_invalid"
);

process.stdout.write("[AIONE] DESIGN COPY OVERLAY CONTRACT PASS\n");
