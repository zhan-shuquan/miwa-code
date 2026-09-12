function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export async function resolveDesignProduct(client, productRef) {
  const ref = cleanText(productRef, 240);
  if (!ref) {
    const error = new Error("Product reference is required.");
    error.statusCode = 400;
    error.code = "product_reference_required";
    throw error;
  }

  const result = await client.query(
    `SELECT p.*, c.code AS category_code, c.name AS category_name
       FROM public.products p
       LEFT JOIN public.product_categories c ON c.id=p.category_id
      WHERE (p.id=$1 OR p.product_code=$1)
        AND p.archived_at IS NULL
      LIMIT 2`,
    [ref]
  );

  if (result.rowCount !== 1) {
    const error = new Error(result.rowCount ? "Product reference is ambiguous." : "Product not found.");
    error.statusCode = result.rowCount ? 409 : 404;
    error.code = result.rowCount ? "product_reference_ambiguous" : "product_not_found";
    throw error;
  }
  return result.rows[0];
}

export function readProductFact(productData, path) {
  const rawPath = cleanText(path, 240);
  if (!rawPath) return undefined;
  return rawPath.split(".").reduce((value, key) => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value) && /^\d+$/.test(key)) return value[Number(key)];
    if (typeof value !== "object") return undefined;
    return value[key];
  }, productData || {});
}

export function displayFact(value) {
  if (value === undefined || value === null || value === "") return "";
  if (Array.isArray(value)) return value.map((item) => displayFact(item)).filter(Boolean).join(" / ");
  if (typeof value === "object") return "";
  return String(value);
}
