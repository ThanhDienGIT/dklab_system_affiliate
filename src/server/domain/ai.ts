/** Cac chuc nang AI trong he thong. Them chuc nang moi: them 1 dong o day, goi resolve("<id>") trong code. */
export const AI_FEATURES = [
  { id: "search", label: "Tìm kiếm thông minh", hint: "Phân tích câu tìm kiếm tự nhiên → bộ lọc. Tác vụ đơn giản, nên dùng model nhẹ/rẻ (flash-lite)." },
  { id: "blog", label: "Viết blog sản phẩm", hint: "Trích xuất dữ liệu từ nhiều trang web và viết bài. Cần model mạnh hơn (pro/flash) để bài hay và chính xác." },
] as const;
export type AiFeatureId = (typeof AI_FEATURES)[number]["id"];
export const AI_FEATURE_IDS = AI_FEATURES.map((f) => f.id) as AiFeatureId[];

export interface GeminiModel { id: string; displayName: string; description: string; inputTokenLimit: number | null; outputTokenLimit: number | null }

export interface AiConfigRow {
  apiKeyEnc: string | null;
  defaultModel: string | null;
  features: Record<string, { model: string; enabled: boolean }>;
}

export const MODEL_ID_RE = /^[a-z0-9][a-z0-9._-]{1,80}$/i;
