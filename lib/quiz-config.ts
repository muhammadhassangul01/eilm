import { normalizeHeaderValue, normalizeText } from "@/lib/normalize";

export type QuizSource = "registry" | "env" | "legacy";

export type QuizDefinition = {
  id: string;
  name: string;
  formUrl?: string;
  responseSheetId?: string;
  tabId?: string;
  enabled: boolean;
  source: QuizSource;
  registryRow?: number;
};

export const REGISTRY_TAB_TITLE = "Quizzes";
export const REGISTRY_HEADERS = ["Title", "Form Link", "Response Sheet URL", "Tab gid", "Enabled"];

const SHEET_ID_PATTERN = /\/spreadsheets\/d\/([A-Za-z0-9-_]{10,})/;
const BARE_ID_PATTERN = /^[A-Za-z0-9_-]{25,}$/;
const GID_PATTERN = /[?&#]gid=(\d+)/;

export function parseGoogleSheetUrl(raw: unknown): { spreadsheetId: string; gid?: string } | null {
  const value = normalizeText(raw).replace(/^<|>$/g, "");
  if (!value) {
    return null;
  }

  const idMatch = value.match(SHEET_ID_PATTERN);
  const spreadsheetId = idMatch?.[1] ?? (BARE_ID_PATTERN.test(value) ? value : undefined);

  if (!spreadsheetId) {
    return null;
  }

  const gidMatch = value.match(GID_PATTERN);
  const gid = gidMatch?.[1];

  return { spreadsheetId, gid };
}

export function buildSheetEditUrl(spreadsheetId: string, gid?: string): string {
  const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  return gid ? `${base}?gid=${gid}` : base;
}

function valueByAliases(row: string[], aliases: string[], lookup: Map<string, number>): string {
  for (const alias of aliases) {
    const index = lookup.get(normalizeHeaderValue(alias));
    if (index !== undefined) {
      return row[index] ?? "";
    }
  }

  return "";
}

function buildHeaderLookup(headers: string[]): Map<string, number> {
  const lookup = new Map<string, number>();
  headers.forEach((header, index) => {
    const normalized = normalizeHeaderValue(header);
    if (normalized) {
      lookup.set(normalized, index);
    }
  });
  return lookup;
}

function isEnabledFlag(value: string): boolean {
  const normalized = normalizeHeaderValue(value);
  if (!normalized) {
    return true;
  }

  return !["no", "false", "0", "off", "disabled", "inactive", "hidden"].includes(normalized);
}

function cleanFormUrl(value: string): string | undefined {
  const url = normalizeText(value);
  if (!url) {
    return undefined;
  }

  if (!/^https?:\/\//i.test(url)) {
    return undefined;
  }

  return url;
}

export function parseRegistryRows(rows: string[][]): {
  entries: QuizDefinition[];
  problems: string[];
} {
  const entries: QuizDefinition[] = [];
  const problems: string[] = [];

  if (rows.length < 2) {
    return { entries, problems };
  }

  const headers = rows[0];
  const lookup = buildHeaderLookup(headers);

  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    const title = normalizeText(
      valueByAliases(row, ["Title", "Quiz Title", "Quiz", "Name", "Quiz Name"], lookup),
    );
    const formValue = valueByAliases(
      row,
      ["Form Link", "Form URL", "Google Form", "Form", "Link"],
      lookup,
    );
    const sheetValue = valueByAliases(
      row,
      ["Response Sheet URL", "Sheet URL", "Response Sheet", "Results", "Spreadsheet URL", "Spreadsheet"],
      lookup,
    );
    const gidValue = valueByAliases(row, ["Tab gid", "Tab ID", "Gid", "Sheet Tab"], lookup);
    const enabledValue = valueByAliases(row, ["Enabled", "Active", "Status"], lookup);

    const hasAnyContent = Boolean(title || normalizeText(sheetValue) || normalizeText(formValue));
    if (!hasAnyContent) {
      return;
    }

    if (!title) {
      problems.push(`Registry row ${rowNumber}: missing a title, so the quiz was skipped.`);
      return;
    }

    const parsed = parseGoogleSheetUrl(sheetValue);
    const explicitGid = normalizeText(gidValue).replace(/[^\d]/g, "");
    const gid = parsed?.gid ?? (explicitGid || undefined);

    if (normalizeText(sheetValue) && !parsed) {
      problems.push(
        `Registry row ${rowNumber} (${title}): the response sheet link is not a Google Sheets URL, so responses cannot be read.`,
      );
    }

    const formUrl = cleanFormUrl(formValue);
    if (normalizeText(formValue) && !formUrl) {
      problems.push(`Registry row ${rowNumber} (${title}): the form link must start with http:// or https://.`);
    }

    entries.push({
      id: parsed ? `sheet:${parsed.spreadsheetId}:${gid ?? "0"}` : `registry:row:${rowNumber}`,
      name: title,
      formUrl,
      responseSheetId: parsed?.spreadsheetId,
      tabId: gid,
      enabled: isEnabledFlag(enabledValue),
      source: "registry",
      registryRow: rowNumber,
    });
  });

  return { entries, problems };
}

function parseEnvRegistryJson(value: string): QuizDefinition[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
      .map((entry, index) => {
        const rawSheet = String(entry.responseSheetId ?? entry.sheetId ?? "");
        const parsedUrl = rawSheet ? parseGoogleSheetUrl(rawSheet) : null;
        const sheetId = parsedUrl?.spreadsheetId ?? (rawSheet || undefined);
        const tabId = String(entry.tabId ?? entry.gid ?? parsedUrl?.gid ?? "") || undefined;

        return {
          id: String(entry.id ?? `env:${index + 1}`),
          name: String(entry.name ?? `Quiz ${index + 1}`),
          formUrl: cleanFormUrl(String(entry.formUrl ?? entry.form ?? "")),
          responseSheetId: sheetId,
          tabId,
          enabled: entry.enabled === undefined ? true : Boolean(entry.enabled),
          source: "env" as const,
        };
      })
      .filter((entry) => entry.name || entry.formUrl || entry.responseSheetId);
  } catch {
    return [];
  }
}

function pullNumberedQuizzes(): QuizDefinition[] {
  const entries: QuizDefinition[] = [];

  for (let index = 1; index <= 200; index += 1) {
    const formUrl = process.env[`QUIZ_${index}_FORM_URL`];
    const responseSheetId = process.env[`QUIZ_${index}_SHEET_ID`];
    const tabId = process.env[`QUIZ_${index}_TAB_ID`];
    const configuredName = process.env[`QUIZ_${index}_NAME`];

    if (!formUrl && !responseSheetId && !tabId && !configuredName) {
      continue;
    }

    const parsedUrl = responseSheetId ? parseGoogleSheetUrl(responseSheetId) : null;

    entries.push({
      id: `env:${index}`,
      name: configuredName || `Quiz ${index}`,
      formUrl: cleanFormUrl(formUrl || ""),
      responseSheetId: parsedUrl?.spreadsheetId ?? responseSheetId ?? undefined,
      tabId: tabId || parsedUrl?.gid || undefined,
      enabled: true,
      source: "env",
    });
  }

  return entries;
}

export function getEnvQuizDefinitions(): QuizDefinition[] {
  const registryJson = process.env.QUIZ_REGISTRY_JSON || process.env.QUIZ_REGISTRY;
  if (registryJson) {
    const fromJson = parseEnvRegistryJson(registryJson);
    if (fromJson.length > 0) {
      return fromJson;
    }
  }

  const numbered = pullNumberedQuizzes();
  if (numbered.length > 0) {
    return numbered;
  }

  const legacySheetId = process.env.QUIZ_SHEET_ID;
  const legacyTabId = process.env.QUIZ_TAB_ID;
  if (legacySheetId && legacyTabId) {
    const parsedUrl = parseGoogleSheetUrl(legacySheetId);

    return [
      {
        id: "legacy:1",
        name: process.env.QUIZ_NAME || "Quiz",
        formUrl: cleanFormUrl(process.env.QUIZ_FORM_URL || ""),
        responseSheetId: parsedUrl?.spreadsheetId ?? legacySheetId,
        tabId: parsedUrl?.gid ?? legacyTabId,
        enabled: true,
        source: "legacy",
      },
    ];
  }

  return [];
}

export function getEnabledQuizzes(quizzes: QuizDefinition[]): QuizDefinition[] {
  return quizzes.filter((quiz) => quiz.enabled);
}
