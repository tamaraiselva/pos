import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import axiosClient from "../../api/axiosClient";

const PROVIDER_PRESETS = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "🤖",
    defaultBaseURL: "https://api.openai.com/v1",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    icon: "✨",
    defaultBaseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    models: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"],
  },
  {
    id: "groq",
    name: "Groq",
    icon: "⚡",
    defaultBaseURL: "https://api.groq.com/openai/v1",
    models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: "🐳",
    defaultBaseURL: "https://api.deepseek.com",
    models: ["deepseek-chat", "deepseek-coder"],
  },
  {
    id: "custom",
    name: "Custom / Local LLM",
    icon: "⚙️",
    defaultBaseURL: "http://localhost:11434/v1",
    models: ["llama3", "mistral", "custom"],
  },
];

export default function Settings() {
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [baseURL, setBaseURL] = useState("https://api.openai.com/v1");
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [configSource, setConfigSource] = useState("none");

  useEffect(() => {
    fetchSettings();
  }, []);

  function fetchSettings() {
    setLoading(true);
    axiosClient
      .get("/settings/ai")
      .then((res) => {
        const data = res.data.data;
        if (data) {
          setProvider(data.provider || "openai");
          setApiKey(data.apiKey || "");
          setModel(data.model || "gpt-4o-mini");
          setBaseURL(data.baseURL || "https://api.openai.com/v1");
          setConfigSource(data.source || "none");
        }
      })
      .catch((err) => {
        toast.error("Failed to load AI settings");
      })
      .finally(() => setLoading(false));
  }

  function handleProviderChange(newProviderId) {
    const preset = PROVIDER_PRESETS.find((p) => p.id === newProviderId);
    setProvider(newProviderId);
    if (preset) {
      setBaseURL(preset.defaultBaseURL);
      if (preset.models && preset.models.length > 0) {
        setModel(preset.models[0]);
      }
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!model.trim()) {
      toast.error("Model name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await axiosClient.put("/settings/ai", {
        provider,
        apiKey,
        model,
        baseURL,
      });
      toast.success("AI configuration saved to MongoDB database! 🚀");
      setConfigSource("database");
      setTestResult(null);
      fetchSettings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save AI configuration");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await axiosClient.post("/settings/ai/test", {
        provider,
        apiKey,
        model,
        baseURL,
      });
      setTestResult({
        success: true,
        message: res.data.data.message,
        reply: res.data.data.reply,
      });
      toast.success("AI Connection test passed! ✅");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Connection test failed";
      setTestResult({
        success: false,
        message: msg,
      });
      toast.error("AI Connection test failed ❌");
    } finally {
      setTesting(false);
    }
  }

  const activePreset = PROVIDER_PRESETS.find((p) => p.id === provider) || PROVIDER_PRESETS[0];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Configure AI Provider, API Keys, and Models saved directly in MongoDB (No .env file access needed)
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            configSource === "database"
              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
              : "bg-indigo-100 text-indigo-800 border border-indigo-300"
          }`}
        >
          {configSource === "database" ? "✓ Database Active" : "⚙ Environment Fallback"}
        </span>
      </div>

      {/* Main Settings Card */}
      <div
        className="rounded-2xl bg-white p-6 shadow-sm"
        style={{ border: "1px solid rgba(0,0,0,0.07)" }}
      >
        <form onSubmit={handleSave} className="space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              AI Provider / Vendor
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {PROVIDER_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderChange(p.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                    provider === p.id
                      ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-xl">{p.icon}</span>
                  <span className="text-xs font-semibold">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              API Key (Database Storage)
            </label>
            <div className="relative flex items-center">
              <input
                type={showApiKey ? "text" : "password"}
                required
                placeholder="Enter your API Key (e.g. sk-proj-... or AIzaSy...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-mono outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((s) => !s)}
                className="absolute right-3 text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                {showApiKey ? "Hide" : "Show"}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Your API Key is encrypted and stored safely in MongoDB. It overrides server .env files.
            </p>
          </div>

          {/* Model Selection */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Model Name
              </label>
              <div className="space-y-2">
                <select
                  value={activePreset.models.includes(model) ? model : "custom"}
                  onChange={(e) => {
                    if (e.target.value !== "custom") {
                      setModel(e.target.value);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-indigo-400"
                >
                  {activePreset.models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                  <option value="custom">-- Type Custom Model Name --</option>
                </select>

                {(!activePreset.models.includes(model) || model === "custom") && (
                  <input
                    type="text"
                    required
                    placeholder="e.g. gpt-4o, gemini-1.5-flash, deepseek-chat..."
                    value={model === "custom" ? "" : model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                )}
              </div>
            </div>

            {/* Base URL Input */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                API Base URL
              </label>
              <input
                type="text"
                required
                placeholder="https://api.openai.com/v1"
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-mono outline-none transition-all focus:border-indigo-400"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                OpenAI compatible endpoint URL for {activePreset.name}.
              </p>
            </div>
          </div>

          {/* Test Connection Result Banner */}
          {testResult && (
            <div
              className={`rounded-xl p-4 text-xs font-medium ${
                testResult.success
                  ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                  : "bg-rose-50 text-rose-900 border border-rose-200"
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                <span>{testResult.success ? "✅ Test Passed" : "❌ Connection Error"}</span>
              </div>
              <p>{testResult.message}</p>
              {testResult.reply && (
                <p className="mt-1 text-[11px] font-mono opacity-80">
                  Model Response: "{testResult.reply}"
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !apiKey}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
            >
              {testing ? "Testing Connection..." : "🧪 Test Connection"}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                boxShadow: "0 4px 12px rgba(99,102,241,0.35)",
              }}
            >
              {saving ? "Saving to Database..." : "💾 Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
