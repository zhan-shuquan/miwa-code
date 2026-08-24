# V1.9.13 Model Provider Layer｜Validation

## Automated validation completed
- All active AIONE regression tests V1.3–V1.9.12 pass after the provider-layer refactor.
- Backend JavaScript syntax check passes, including `model-provider-registry.js`.
- V1.9.13专项验证 confirms:
  - AI orchestration no longer imports OpenAI directly.
  - Preview/live/provider selection contract exists.
  - OpenAI remains isolated behind the Backend provider adapter.
  - API key input is hidden in the Windows real-model launcher and is not persisted to a file.
  - Current Selection Workbench business context enters the AI snapshot and is exposed through an AIONE Tool.
  - Human-confirmation write boundary remains in the service.

## Manual validation still required
A real OpenAI request cannot be executed in the packaging environment because no user API key is available there. On the user's Windows machine:
1. Close the existing Preview Backend window.
2. Run `START_MIWA_AI_REAL_MODEL.cmd`.
3. Enter the API key in the hidden PowerShell prompt.
4. Keep the Backend window open.
5. Run `VERIFY_MIWA_AI_REAL_MODEL.cmd`; expect real-model status.
6. Open AIONE → 美和AI and repeat: `分析一下当前选品工作台的情况，并告诉我现在最值得关注的问题。`
7. Confirm the answer cites current workbench evidence rather than the earlier preview fallback message.

## Security gate
For Cloud Run, local hidden key entry is not the production mechanism. Production provider secrets must come from Secret Manager.
