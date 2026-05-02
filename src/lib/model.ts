export type ModelsApiResponse = {
  data?: Array<{ id?: string }>;
  models?: Array<{ id?: string } | string>;
};

export function normalizeModelValue(value: string): string {
  return value.trim().toLowerCase();
}

export function getModelShorthand(modelId: string): string | null {
  return normalizeModelValue(modelId).startsWith("openthaigpt")
    ? "openthaigpt"
    : null;
}

export function getModelLabel(model: string): string {
  const text = normalizeModelValue(model);
  return text.length <= 20 ? text : `${text.slice(0, 17)}...`;
}

export function parseModelOptions(payload: ModelsApiResponse | null): string[] {
  if (!payload) return [];

  const raw = [
    ...(payload.data ?? []).map((item) => item.id),
    ...(payload.models ?? []).map((item) =>
      typeof item === "string" ? item : item.id,
    ),
  ];

  return raw
    .map((item) => (item ? normalizeModelValue(item) : ""))
    .filter(Boolean)
    .filter((item, index, all) => all.indexOf(item) === index);
}
