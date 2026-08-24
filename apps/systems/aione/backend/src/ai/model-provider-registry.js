/*
  AIONE Model Provider Layer V1.0
  --------------------------------
  Purpose:
  - Keep business orchestration independent from any single model vendor.
  - Preserve deterministic preview mode for plumbing / regression verification.
  - Select a live provider only on the Backend; API keys never belong in the frontend.
*/
import { runOpenAISecretary } from "./openai-provider.js";
import { runPreviewSecretary } from "./preview-provider.js";

const PREVIEW_PROVIDER_ID = "deterministic-preview";

const LIVE_PROVIDERS = Object.freeze({
  openai: Object.freeze({
    id: "openai",
    displayName: "OpenAI",
    configured: () => Boolean(String(process.env.OPENAI_API_KEY || "").trim()),
    model: () => String(process.env.AIONE_AI_MODEL || "gpt-5.6-sol").trim(),
    run: runOpenAISecretary
  })
});

function requestedMode() {
  return String(process.env.AIONE_AI_MODE || "preview").trim().toLowerCase();
}

function requestedProvider(mode) {
  // Backward compatibility: older builds used AIONE_AI_MODE=openai.
  if (mode === "openai") return "openai";
  return String(process.env.AIONE_AI_PROVIDER || "openai").trim().toLowerCase();
}

function wantsLiveModel(mode) {
  return ["live", "model", "openai"].includes(mode);
}

export function getModelProviderRuntimeStatus() {
  const requested = requestedMode();
  const providerRequested = requestedProvider(requested);
  const liveRequested = wantsLiveModel(requested);
  const selected = LIVE_PROVIDERS[providerRequested] || null;
  const supported = Boolean(selected);
  const configured = Boolean(selected?.configured?.());
  const useLive = liveRequested && supported && configured;

  return {
    requestedMode: requested,
    mode: useLive ? "openai" : "preview",
    liveRequested,
    requestedProvider: providerRequested,
    provider: useLive ? selected.id : PREVIEW_PROVIDER_ID,
    providerDisplayName: useLive ? selected.displayName : "Deterministic Preview",
    configured,
    supported,
    model: useLive ? selected.model() : null,
    fallbackReason: useLive
      ? null
      : !liveRequested
        ? "preview_requested"
        : !supported
          ? "provider_not_supported"
          : !configured
            ? "provider_not_configured"
            : "preview_fallback",
    availableProviders: Object.values(LIVE_PROVIDERS).map((item) => ({
      id: item.id,
      displayName: item.displayName,
      configured: Boolean(item.configured()),
      model: item.model()
    }))
  };
}

export async function runModelProvider({ objective, office, contextSnapshot, requestContext, runtime = getModelProviderRuntimeStatus() }) {
  if (runtime.mode === "preview") {
    return runPreviewSecretary({ objective, office, contextSnapshot });
  }

  const provider = LIVE_PROVIDERS[runtime.provider];
  if (!provider) throw new Error(`AIONE AI provider is not supported: ${runtime.provider}`);
  if (!provider.configured()) throw new Error(`AIONE AI provider is not configured: ${runtime.provider}`);

  const result = await provider.run({ objective, office, contextSnapshot, requestContext });
  return {
    ...result,
    provider: provider.id,
    providerDisplayName: provider.displayName,
    model: result.model || provider.model()
  };
}
