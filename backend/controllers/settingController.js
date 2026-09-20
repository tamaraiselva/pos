const Setting = require("../models/Setting");
const { testAIConnection } = require("../services/aiService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

const PROVIDER_BASE_URLS = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
  groq: "https://api.groq.com/openai/v1",
  deepseek: "https://api.deepseek.com",
  openrouter: "https://openrouter.ai/api/v1",
  ollama: "http://localhost:11434/v1",
};

function maskApiKey(key) {
  if (!key || key.length < 8) return key ? "••••••••" : "";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

const getAISettings = asyncHandler(async (req, res) => {
  const dbConfig = await Setting.get("ai_config", null);

  if (!dbConfig) {
    return res.json({
      success: true,
      data: {
        provider: "openai",
        apiKey: "",
        model: "gpt-4o-mini",
        baseURL: PROVIDER_BASE_URLS.openai,
        widgetType: "full",
        isConfigured: Boolean(process.env.OPENAI_API_KEY),
        source: Boolean(process.env.OPENAI_API_KEY) ? "env" : "none",
      },
    });
  }

  res.json({
    success: true,
    data: {
      provider: dbConfig.provider || "openai",
      apiKey: maskApiKey(dbConfig.apiKey),
      model: dbConfig.model || "gpt-4o-mini",
      baseURL: dbConfig.baseURL || PROVIDER_BASE_URLS[dbConfig.provider || "openai"] || PROVIDER_BASE_URLS.openai,
      widgetType: dbConfig.widgetType || "full",
      isConfigured: Boolean(dbConfig.apiKey),
      source: "database",
    },
  });
});

const updateAISettings = asyncHandler(async (req, res) => {
  let { provider = "openai", apiKey, model = "gpt-4o-mini", baseURL, widgetType = "full" } = req.body;

  const existingConfig = await Setting.get("ai_config", null);

  // If apiKey wasn't modified or is sent as masked string, keep existing key
  if (!apiKey || apiKey.includes("••••")) {
    if (existingConfig && existingConfig.apiKey) {
      apiKey = existingConfig.apiKey;
    } else if (process.env.OPENAI_API_KEY) {
      apiKey = process.env.OPENAI_API_KEY;
    } else {
      throw new ApiError(400, "API Key is required");
    }
  }

  if (!model || !model.trim()) {
    throw new ApiError(400, "Model name is required");
  }

  const validWidgetTypes = ["full", "floating", "compact"];
  const effectiveWidgetType = validWidgetTypes.includes(widgetType) ? widgetType : (existingConfig?.widgetType || "full");

  const effectiveBaseURL = baseURL || PROVIDER_BASE_URLS[provider] || PROVIDER_BASE_URLS.openai;

  const newConfig = {
    provider,
    apiKey: apiKey.trim(),
    model: model.trim(),
    baseURL: effectiveBaseURL.trim(),
    widgetType: effectiveWidgetType,
  };

  await Setting.set("ai_config", newConfig, req.user.id);

  res.json({
    success: true,
    message: "AI settings saved to database successfully",
    data: {
      provider: newConfig.provider,
      apiKey: maskApiKey(newConfig.apiKey),
      model: newConfig.model,
      baseURL: newConfig.baseURL,
      widgetType: newConfig.widgetType,
      isConfigured: true,
      source: "database",
    },
  });
});

const testAISettings = asyncHandler(async (req, res) => {
  let { provider = "openai", apiKey, model = "gpt-4o-mini", baseURL } = req.body;

  // Resolve masked API Key
  if (!apiKey || apiKey.includes("••••")) {
    const existingConfig = await Setting.get("ai_config", null);
    if (existingConfig && existingConfig.apiKey) {
      apiKey = existingConfig.apiKey;
    } else if (process.env.OPENAI_API_KEY) {
      apiKey = process.env.OPENAI_API_KEY;
    } else {
      throw new ApiError(400, "API Key is required to test connection");
    }
  }

  const result = await testAIConnection({ provider, apiKey, model, baseURL });
  res.json({ success: true, data: result });
});

module.exports = { getAISettings, updateAISettings, testAISettings };
