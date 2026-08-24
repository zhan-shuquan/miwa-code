# V1.9.5 Sidebar + Aside Lock Candidate Validation

Automated release gate must confirm:

- Desktop Sidebar contains no business switch.
- Sidebar has one Navigation Area and optional Quick Actions dock.
- Business tree supports accordion expansion and current child highlighting.
- Universal Sidebar registry supports business/content/tools/system context types.
- Aside contains no AI Secretary/chat/AI Office controls.
- Aside supports hidden/light/standard states.
- Active runtime no longer emits `aione:page-ai-context`.
- Global Shell no longer initializes `initAISecretaryClient()` through Aside.
- Historical AI/backend code remains available for the later independent AI Layer phase.
