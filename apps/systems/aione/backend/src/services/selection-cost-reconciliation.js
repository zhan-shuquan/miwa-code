// Reconcile outputs of one ERP execution. No pricing, FX or tariff formulas live here.
export function reconcileCosts(pricing) {
  if (pricing.status !== "estimated") return { status: "pending", checks: [] };
  const r = pricing.results || {},
    b = pricing.breakdown || {};
  const definitions = [
    [
      "warehouse",
      "到日本仓成本",
      r.custom_到日本仓成本,
      [
        b.purchase_jpy,
        b.cn_domestic,
        r.custom_中国包装成本,
        r.custom_国际物流成本,
        b.duty,
      ],
    ],
    [
      "delivery",
      "日本配送成本",
      r.custom_日本配送日本,
      [r.custom_日本包装成本, r.custom_日本配送费],
    ],
  ];
  if (pricing.operationFees || r.custom_销售运营成本 != null)
    definitions.push([
      "operations",
      "销售运营成本",
      r.custom_销售运营成本,
      pricing.operationFees || [null],
    ]);
  const finite = (v) => typeof v === "number" && Number.isFinite(v);
  const checks = definitions.map(([id, label, summary, parts]) => {
    if (!finite(summary) || !parts.every(finite))
      return { id, label, status: "pending" };
    const detail = parts.reduce((a, v) => a + v, 0);
    // ERP rounds money to whole JPY; epsilon only absorbs floating-point representation.
    const difference = Math.round((detail - summary) * 1e8) / 1e8;
    return {
      id,
      label,
      detail,
      summary,
      difference,
      status: difference === 0 ? "matched" : "mismatch",
    };
  });
  return {
    status: checks.some((c) => c.status === "mismatch")
      ? "mismatch"
      : checks.every((c) => c.status === "matched")
        ? "matched"
        : "pending",
    checks,
  };
}

export function assertReconciled(pricing) {
  const audit = reconcileCosts(pricing);
  if (audit.status === "mismatch") {
    const error = new Error(
      "成本核算差异，禁止提交ERP：" +
        audit.checks
          .filter((c) => c.status === "mismatch")
          .map(
            (c) =>
              `${c.label}，明细 ¥${c.detail} / 汇总 ¥${c.summary}，差额 ¥${c.difference}`,
          )
          .join("；"),
    );
    error.statusCode = 409;
    throw error;
  }
  return audit;
}
