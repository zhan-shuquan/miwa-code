import assert from "node:assert/strict";
import { buildSelectionWorkspaceFolderName } from "../src/services/selection-drive-workspace-service.js";

assert.equal(
  buildSelectionWorkspaceFolderName({ selection_no: "xp260911001", title: "新款 男士 秋冬 厚手 棉袜 批发" }),
  "xp260911001_男士秋冬厚手棉袜"
);

assert.equal(
  buildSelectionWorkspaceFolderName({ selectionNo: "xp260911002", title: "1688 女士保暖袜/冬季:加厚" }),
  "xp260911002_女士保暖袜冬季加厚"
);

assert.throws(
  () => buildSelectionWorkspaceFolderName({ title: "没有编号" }),
  (error) => error?.code === "selection_workspace_number_required"
);

console.log("[AIONE] Selection Drive workspace naming PASS");
