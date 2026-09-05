const OpenAI = require("openai");
const Setting = require("../models/Setting");
const { TOOL_DEFINITIONS, TOOL_IMPLEMENTATIONS } = require("./aiTools");

class AIServiceError extends Error {}

const REQUEST_TIMEOUT_MS = 20000;

// Default Base URLs for popular AI Providers
const PROVIDER_BASE_URLS = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
  groq: "https://api.groq.com/openai/v1",
  deepseek: "https://api.deepseek.com",
  openrouter: "https://openrouter.ai/api/v1",
  ollama: "http://localhost:11434/v1",
};

/**
 * Resolves AI configuration dynamically from MongoDB database setting `ai_config`,
 * falling back to .env variables if no database configuration exists.
 */
async function getAIConfig() {
  const dbConfig = await Setting.get("ai_config", null);

  if (dbConfig && dbConfig.apiKey && dbConfig.apiKey.trim().length > 0) {
    const provider = dbConfig.provider || "openai";
    const baseURL = dbConfig.baseURL || PROVIDER_BASE_URLS[provider] || PROVIDER_BASE_URLS.openai;
    const model = dbConfig.model || "gpt-4o-mini";
    return {
      apiKey: dbConfig.apiKey.trim(),
      model: model.trim(),
      provider,
      baseURL: baseURL.trim(),
    };
  }

  // Fallback to .env configuration if no database setting exists
  if (!process.env.OPENAI_API_KEY) {
    throw new AIServiceError("AI API Key is not configured. Please enter your API Key and Model in Admin Settings.");
  }

  return {
    apiKey: process.env.OPENAI_API_KEY.trim(),
    model: (process.env.OPENAI_MODEL || "gpt-4o-mini").trim(),
    provider: "openai",
    baseURL: PROVIDER_BASE_URLS.openai,
  };
}

/**
 * Instantiates an OpenAI SDK client initialized with active database AI settings
 */
async function getClient() {
  const config = await getAIConfig();
  const options = {
    apiKey: config.apiKey,
    timeout: REQUEST_TIMEOUT_MS,
  };
  if (config.baseURL) {
    options.baseURL = config.baseURL;
  }
  return {
    openai: new OpenAI(options),
    model: config.model,
    provider: config.provider,
  };
}

async function withRetry(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err?.status && err.status < 500 && err.status !== 429) throw err;
    try {
      return await fn();
    } catch (err2) {
      throw new AIServiceError(`AI request failed: ${err2.message}`);
    }
  }
}

/**
 * Tests an AI configuration (API Key, Model, Provider, BaseURL) directly
 */
async function testAIConnection({ provider = "openai", apiKey, model, baseURL }) {
  if (!apiKey || !apiKey.trim()) {
    throw new AIServiceError("API Key cannot be empty");
  }
  if (!model || !model.trim()) {
    throw new AIServiceError("Model name cannot be empty");
  }

  const effectiveBaseURL = baseURL || PROVIDER_BASE_URLS[provider] || PROVIDER_BASE_URLS.openai;

  const testClient = new OpenAI({
    apiKey: apiKey.trim(),
    baseURL: effectiveBaseURL.trim(),
    timeout: 10000,
  });

  try {
    const res = await testClient.chat.completions.create({
      model: model.trim(),
      messages: [{ role: "user", content: "Reply with the word 'OK' if you can read this message." }],
      max_tokens: 10,
    });
    const reply = res.choices[0]?.message?.content?.trim() || "OK";
    return {
      success: true,
      message: `Connection successful! ${provider.toUpperCase()} model '${model}' responded.`,
      reply,
    };
  } catch (err) {
    throw new AIServiceError(`Connection test failed: ${err.message}`);
  }
}

/**
 * One-shot narration/summarization call using active database AI settings
 */
async function summarize({ system, dataContext, instruction }) {
  const { openai, model } = await getClient();

  const completion = await withRetry(() =>
    openai.chat.completions.create({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Real data (JSON, already computed from the database — do not invent or alter numbers):\n${JSON.stringify(
            dataContext
          )}\n\nTask: ${instruction}`,
        },
      ],
    })
  );

  return completion.choices[0]?.message?.content?.trim() || "";
}

/**
 * Grounded Business Q&A call using active database AI settings
 */
async function answerQuestion(question) {
  const { openai, model } = await getClient();
  const toolsCalled = [];

  const messages = [
    {
      role: "system",
      content:
        "You are a friendly, helpful AI business assistant embedded in a retail POS system dashboard. " +
        "You have access to tools that query real-time sales, inventory, and product data from the store's database. " +
        "\n\nBehavior rules:" +
        "\n- For greetings or small talk (e.g. 'hi', 'how are you'), respond warmly and briefly, then offer to help with sales or inventory." +
        "\n- For any question about sales, products, revenue, stock, or inventory — always call the relevant tool(s) proactively. Do NOT ask for clarification on broad questions like 'show me inventory' or 'what are sales like'; just fetch the data and present it." +
        "\n- Never fabricate numbers or data. All figures must come from tool results." +
        "\n- If a tool returns no data, say so clearly and suggest what the user could try instead." +
        "\n- Be concise and friendly. Format lists with bullet points where helpful.",
    },
    { role: "user", content: question },
  ];

  for (let round = 0; round < 4; round++) {
    const completion = await withRetry(() =>
      openai.chat.completions.create({
        model,
        temperature: 0.2,
        messages,
        tools: TOOL_DEFINITIONS,
      })
    );

    const message = completion.choices[0].message;
    messages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { answer: message.content?.trim() || "", toolsCalled };
    }

    for (const call of message.tool_calls) {
      const impl = TOOL_IMPLEMENTATIONS[call.function.name];
      let result;
      if (!impl) {
        result = { error: `Unknown tool: ${call.function.name}` };
      } else {
        let args = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          args = {};
        }
        toolsCalled.push(call.function.name);
        result = await impl(args);
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  throw new AIServiceError("AI did not produce a final answer within the tool-call limit");
}

module.exports = { summarize, answerQuestion, getAIConfig, testAIConnection, AIServiceError };
