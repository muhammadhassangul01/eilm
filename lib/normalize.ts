export const INVISIBLE_CHARACTERS = /[\u200E\u200F\u061C\u202A-\u202E]/g;

export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .replace(INVISIBLE_CHARACTERS, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeHeaderValue(value: unknown): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, "")
    .replace(/\s+/g, "")
    .normalize("NFKC");
}

export function normalizeName(value: unknown): string {
  return normalizeText(value).toLowerCase();
}
