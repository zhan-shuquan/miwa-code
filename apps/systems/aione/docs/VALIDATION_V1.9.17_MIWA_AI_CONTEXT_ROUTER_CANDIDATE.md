# V1.9.17 | 美和AI Context Router Validation

Validation scope:

- Asset cache version bump to `20260824-v1.9.17-ai-context-router`.
- New `ai-capability-registry.js` with context-routed business capabilities.
- New `ai-context-router.js` with company/business/workbench/page/object/state/user/data context.
- Selection opportunity route parsing for `#/selection/opportunity/<id>` and `#/sampling/opportunity/<id>`.
- Current product-opportunity context reads source/product data, deterministic cost/pricing fields, shipping fields, sampling evidence and decision evidence when available.
- `miwa-ai-layer.js` renders routed capabilities instead of a route-only hard-coded AI suggestion table.
- Employee-facing “技能/工具” choice is replaced by passive `能力自动匹配`.
- Capability code/label are passed into the AI execution snapshot as `aiRequest`.
- OpenAI Provider is instructed not to ask the employee to choose AI/job/Skill/model and to prefer AIONE deterministic calculations.
- Preview Provider can deterministically validate all four Selection object capabilities without pretending to be a live-model judgment.
- Provider/model remain diagnostic metadata; ordinary runtime status no longer displays vendor/model choice.
- Existing Proposal Bridge and human confirmation boundary remain intact.
- Existing V1.3 through V1.9.16 active regression gates remain green after the intended UI/router evolution.

Automated result: all 21 active AIONE validation scripts pass in the build environment. Backend `npm run check` passes.

Manual validation target:

1. Open a real Selection product opportunity.
2. Open Header -> 美和AI.
3. Confirm that the context shows the current opportunity and the four Selection capabilities automatically, without choosing an AI/model.
4. Click “检查利润与风险” and confirm it uses current AIONE cost/pricing results rather than inventing values.
5. Click “判断是否需要测样” and confirm it analyzes the current object but does not silently change state.
6. Confirm normal employees see `美和AI已就绪` rather than `OpenAI | model`.
