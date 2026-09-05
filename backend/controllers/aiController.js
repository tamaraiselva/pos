const asyncHandler = require("../utils/asyncHandler");
const AIQueryLog = require("../models/AIQueryLog");
const aiTools = require("../services/aiTools");
const aiService = require("../services/aiService");
const forecastService = require("../services/forecastService");

const insights = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 30;
  const [bestSellers, slowMovers] = await Promise.all([
    aiTools.getBestSellers({ days, limit: 5 }),
    aiTools.getSlowMovers({ days, limit: 5 }),
  ]);

  const data = { days, bestSellers, slowMovers };

  let summary = "";
  let aiUnavailable = false;
  try {
    summary = await aiService.summarize({
      system:
        "You are a retail sales analyst. Summarize best-sellers and slow-movers for a store admin in 3-5 concise sentences. Mention concrete product names and numbers from the data.",
      dataContext: data,
      instruction: "Summarize recent sales performance in natural language.",
    });
    await AIQueryLog.create({ feature: "insights", answer: summary, askedBy: req.user.id });
  } catch (err) {
    aiUnavailable = true;
    summary = "AI summary is temporarily unavailable — showing raw data only.";
  }

  res.json({ success: true, data: { ...data, summary, aiUnavailable } });
});

const inventoryRecommendations = asyncHandler(async (req, res) => {
  const lowStock = await aiTools.getLowStockProducts({ limit: 20 });
  const velocity = await aiTools.getBestSellers({ days: 30, limit: 50 });
  const velocityBySku = new Map(velocity.map((v) => [v.sku, v.qtySold]));

  const data = {
    lowStock: lowStock.map((p) => ({ ...p, qtySoldLast30Days: velocityBySku.get(p.sku) || 0 })),
  };

  let summary = "";
  let aiUnavailable = false;
  try {
    summary = await aiService.summarize({
      system:
        "You are an inventory planner. For each low/out-of-stock product, suggest a reorder quantity and a one-line reason, " +
        "based on its recent sales velocity and current stock gap. Format as a short bulleted list.",
      dataContext: data,
      instruction: "Recommend restocking with quantities and reasons.",
    });
    await AIQueryLog.create({ feature: "inventory_recommendations", answer: summary, askedBy: req.user.id });
  } catch (err) {
    aiUnavailable = true;
    summary = "AI recommendations are temporarily unavailable — showing raw low-stock data only.";
  }

  res.json({ success: true, data: { ...data, summary, aiUnavailable } });
});

const ask = asyncHandler(async (req, res) => {
  const { question } = req.body;

  const { answer, toolsCalled } = await aiService.answerQuestion(question);

  await AIQueryLog.create({
    feature: "ask",
    question,
    toolCalls: toolsCalled,
    answer,
    askedBy: req.user.id,
  });

  res.json({ success: true, data: { question, answer, toolsCalled } });
});

const forecast = asyncHandler(async (req, res) => {
  const result = await forecastService.buildSalesForecast({ historyDays: 60, forecastDays: 7 });

  let summary = "";
  let aiUnavailable = false;
  try {
    summary = await aiService.summarize({
      system:
        "You are a retail forecasting analyst. Describe the sales trend and the 7-day forecast in 2-4 sentences. " +
        "Provide clear, confident data-backed insights based on historical transaction trends.",
      dataContext: { trendDirection: result.trendDirection, forecast: result.forecast },
      instruction: "Narrate the forecast with authoritative data-driven precision.",
    });
    await AIQueryLog.create({ feature: "forecast", answer: summary, askedBy: req.user.id });
  } catch (err) {
    aiUnavailable = true;
    summary = "AI narration is temporarily unavailable — showing the computed forecast chart only.";
  }

  res.json({ success: true, data: { ...result, summary, aiUnavailable } });
});

module.exports = { insights, inventoryRecommendations, ask, forecast };
