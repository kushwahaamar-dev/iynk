export type Family = "anthropic" | "openai-compat";

export type PresetModel = {
  id: string;
  tier?: "fast" | "standard" | "strong";
  contextTokens: number;
  maxOutputTokens: number;
};

export type Preset = {
  id: string;
  label: string;
  family: Family;
  baseUrl: string;
  local: boolean;
  models: readonly PresetModel[];
  note?: string;
};

const NOT_TESTED = "Browser-direct calls are not tested yet.";

/** Model ids are examples only; a person can type any id the provider serves. */
export const PRESETS: readonly Preset[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    family: "anthropic",
    baseUrl: "https://api.anthropic.com",
    local: false,
    models: [
      { id: "claude-haiku-4-5", tier: "fast", contextTokens: 200_000, maxOutputTokens: 64_000 },
      { id: "claude-sonnet-4-5", tier: "standard", contextTokens: 200_000, maxOutputTokens: 64_000 },
      { id: "claude-opus-4-1", tier: "strong", contextTokens: 200_000, maxOutputTokens: 32_000 },
    ],
    note: NOT_TESTED,
  },
  {
    id: "openai",
    label: "OpenAI",
    family: "openai-compat",
    baseUrl: "https://api.openai.com/v1",
    local: false,
    models: [
      { id: "gpt-4.1-mini", tier: "fast", contextTokens: 1_047_576, maxOutputTokens: 32_768 },
      { id: "gpt-4.1", tier: "standard", contextTokens: 1_047_576, maxOutputTokens: 32_768 },
    ],
    note: NOT_TESTED,
  },
  {
    id: "gemini",
    label: "Gemini",
    family: "openai-compat",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    local: false,
    models: [
      { id: "gemini-2.5-flash", tier: "fast", contextTokens: 1_048_576, maxOutputTokens: 65_536 },
      { id: "gemini-2.5-pro", tier: "strong", contextTokens: 1_048_576, maxOutputTokens: 65_536 },
    ],
    note: NOT_TESTED,
  },
  {
    id: "groq",
    label: "Groq",
    family: "openai-compat",
    baseUrl: "https://api.groq.com/openai/v1",
    local: false,
    models: [
      { id: "llama-3.3-70b-versatile", tier: "standard", contextTokens: 131_072, maxOutputTokens: 32_768 },
    ],
    note: NOT_TESTED,
  },
  {
    id: "together",
    label: "Together",
    family: "openai-compat",
    baseUrl: "https://api.together.xyz/v1",
    local: false,
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", tier: "standard", contextTokens: 131_072, maxOutputTokens: 8_192 },
    ],
    note: NOT_TESTED,
  },
  {
    id: "fireworks",
    label: "Fireworks",
    family: "openai-compat",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    local: false,
    models: [
      { id: "accounts/fireworks/models/llama-v3p3-70b-instruct", tier: "standard", contextTokens: 131_072, maxOutputTokens: 16_384 },
    ],
    note: NOT_TESTED,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    family: "openai-compat",
    baseUrl: "https://openrouter.ai/api/v1",
    local: false,
    models: [
      { id: "anthropic/claude-sonnet-4.5", tier: "standard", contextTokens: 200_000, maxOutputTokens: 64_000 },
    ],
    note: NOT_TESTED,
  },
  {
    id: "ollama",
    label: "Ollama",
    family: "openai-compat",
    baseUrl: "http://127.0.0.1:11434/v1",
    local: true,
    models: [{ id: "llama3.2", tier: "fast", contextTokens: 131_072, maxOutputTokens: 8_192 }],
    note: "Runs on this computer. The server operator lists its origin in IYNK_CONNECT_ORIGINS.",
  },
  {
    id: "lmstudio",
    label: "LM Studio",
    family: "openai-compat",
    baseUrl: "http://127.0.0.1:1234/v1",
    local: true,
    models: [],
    note: "Runs on this computer. The server operator lists its origin in IYNK_CONNECT_ORIGINS.",
  },
  {
    id: "llamacpp",
    label: "llama.cpp",
    family: "openai-compat",
    baseUrl: "http://127.0.0.1:8080/v1",
    local: true,
    models: [],
    note: "Runs on this computer. The server operator lists its origin in IYNK_CONNECT_ORIGINS.",
  },
];

const cloud = PRESETS.filter((preset) => !preset.local);

// Cloud base URLs are plain https://host[/path] (the tests enforce it), so the origin is the part before the first path slash.
const originOf = (baseUrl: string) => baseUrl.replace(/^(https:\/\/[^/]+).*$/, "$1");

/** The origins of the cloud presets, for the page's connect-src. Local presets are never listed. */
export const PRESET_ORIGINS: readonly string[] = [...new Set(cloud.map((preset) => originOf(preset.baseUrl)))];

/** The hosts of the cloud presets, the relay's default allow-list. */
export const PRESET_HOSTS: readonly string[] = PRESET_ORIGINS.map((origin) => origin.slice("https://".length));
