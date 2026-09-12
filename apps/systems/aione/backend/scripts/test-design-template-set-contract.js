import { assertTemplateSetItemExecutable } from "../src/services/design-template-set-service.js";
import { validateTemplatePageFactsAndClaims } from "../src/services/design-template-input-policy-service.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectCode(fn, expectedCode) {
  try {
    fn();
  } catch (error) {
    assert(error.code === expectedCode, `Expected ${expectedCode}, received ${error.code || error.message}`);
    return error;
  }
  throw new Error(`Expected ${expectedCode} to be thrown.`);
}

const activeItem = {
  template_set_status: "active",
  template_status: "active"
};

assert(assertTemplateSetItemExecutable(activeItem) === activeItem, "Active template-set page must be executable.");

expectCode(
  () => assertTemplateSetItemExecutable({ ...activeItem, template_set_status: "draft" }),
  "design_template_set_not_active"
);

expectCode(
  () => assertTemplateSetItemExecutable({ ...activeItem, template_status: "deprecated" }),
  "design_template_not_active"
);

const policyItem = {
  field_bindings: {
    allowedFacts: ["category", "sellingPoints", "approvedClaims"],
    requiredFacts: ["category"],
    restrictedClaims: ["防臭", "純綿", "抗菌"]
  }
};

validateTemplatePageFactsAndClaims(
  policyItem,
  { category: "socks", sellingPoints: ["リブ編み"] },
  { prompt: "SOURCE画像の事実だけを使う。" }
);

expectCode(
  () => validateTemplatePageFactsAndClaims(
    policyItem,
    { category: "socks", sellingPoints: ["防臭仕様"] },
    { prompt: "商品特徴を表示する。" }
  ),
  "design_unapproved_claim"
);

validateTemplatePageFactsAndClaims(
  policyItem,
  { category: "socks", sellingPoints: ["防臭仕様"], approvedClaims: ["防臭"] },
  { prompt: "承認済みの商品特徴のみ表示する。" }
);

expectCode(
  () => validateTemplatePageFactsAndClaims(
    policyItem,
    { category: "socks", unknownFact: "x" },
    { prompt: "test" }
  ),
  "design_template_page_fact_not_allowed"
);

expectCode(
  () => validateTemplatePageFactsAndClaims(
    policyItem,
    { sellingPoints: ["リブ編み"] },
    { prompt: "test" }
  ),
  "design_template_page_fact_required"
);

process.stdout.write("[AIONE] DESIGN TEMPLATE SET CONTRACT PASS\n");
