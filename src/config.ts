function parseEnvNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export const THAI_LLM_API_PATH = `${API_BASE}/api/v1/chat/completions`;
export const THAI_LLM_MODELS_API_PATH = `${API_BASE}/api/v1/models`;
export const THAI_LLM_MODEL =
  import.meta.env.VITE_THAILLM_MODEL ?? "typhoon-s-thaillm-8b-instruct";
export const THAI_LLM_TEMPERATURE = parseEnvNumber(
  import.meta.env.VITE_THAILLM_TEMPERATURE,
  0.3,
);
export const THAI_LLM_MAX_TOKENS = parseEnvNumber(
  import.meta.env.VITE_THAILLM_MAX_TOKENS,
  2048,
);
export const THAI_LLM_TOKEN = import.meta.env.VITE_THAILLM_API_KEY;

export const CHAT_STORAGE_KEY = "thai-chat-ai-history-v1";
export const THEME_STORAGE_KEY = "thai-chat-ai-theme-v1";
export const MODEL_STORAGE_KEY = "thai-chat-ai-model-v1";
export const WEB_SEARCH_MODE_STORAGE_KEY = "thai-chat-ai-web-search-mode-v1";
export const WEB_SEARCH_COUNT_STORAGE_KEY = "thai-chat-ai-web-search-count-v1";
export const WEB_SEARCH_REGION_STORAGE_KEY =
  "thai-chat-ai-web-search-region-v1";

export const WEB_SEARCH_PROXY_PATH = "/api/search";
export const WEB_SEARCH_TIMEOUT_MS = 6000;

export const RATE_LIMIT_PER_SECOND = 5;
export const RATE_LIMIT_PER_MINUTE = 200;
export const RATE_LIMIT_NOTICE_COOLDOWN_MS = 1500;

export const WEB_SEARCH_COUNT_OPTIONS = [3, 5, 8] as const;
export const WEB_SEARCH_REGION_OPTIONS = [
  { label: "TH", value: "th-th" },
  { label: "Global", value: "wt-wt" },
  { label: "US", value: "us-en" },
] as const;

export const DEFAULT_WEB_SEARCH_TRUSTED_DOMAINS = [
  "wikipedia.org",
  "britannica.com",
  "reuters.com",
  "bbc.com",
  "who.int",
  "un.org",
  "worldbank.org",
  "ourworldindata.org",
  "nature.com",
  "science.org",
  "nih.gov",
  "nasa.gov",
];
