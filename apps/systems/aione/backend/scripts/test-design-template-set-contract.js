import { assertTemplateSetItemExecutable } from "../src/services/design-template-set-service.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectCode(fn, expectedCode) {
  try {
    fn();
  } catch (error) {
    assert(error.code === expectedCode, `Expected ${expectedCode}, received ${error.code || error.message}`);
    return;
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

process.stdout.write("[AIONE] DESIGN TEMPLATE SET CONTRACT PASS\n");
