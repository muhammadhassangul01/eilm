import { createSheetTab, deleteSheetRow, appendSheetRow, listSheetTabs, readSheetRows, writeSheetRow } from "@/lib/google-sheets";
import { normalizeText } from "@/lib/normalize";
import {
  REGISTRY_HEADERS,
  REGISTRY_TAB_TITLE,
  buildSheetEditUrl,
  parseGoogleSheetUrl,
  parseRegistryRows,
  type QuizDefinition,
} from "@/lib/quiz-config";

export type RegistryLocation = { spreadsheetId: string; tabTitle: string };

export function getRegistryLocation(): RegistryLocation {
  const spreadsheetId = process.env.QUIZ_REGISTRY_SHEET_ID || process.env.REGISTRATION_SHEET_ID;
  const tabTitle =
    process.env.QUIZ_REGISTRY_TAB_ID ||
    process.env.QUIZ_REGISTRY_TAB_NAME ||
    REGISTRY_TAB_TITLE;

  if (!spreadsheetId) {
    throw new Error(
      "No registry spreadsheet configured. Set QUIZ_REGISTRY_SHEET_ID or REGISTRATION_SHEET_ID.",
    );
  }

  return { spreadsheetId, tabTitle };
}

export async function readRegistryRows(): Promise<string[][]> {
  const { spreadsheetId, tabTitle } = getRegistryLocation();
  return readSheetRows(spreadsheetId, tabTitle);
}

export async function readRegistryQuizzes(): Promise<{ entries: QuizDefinition[]; problems: string[] }> {
  const rows = await readRegistryRows();
  return parseRegistryRows(rows);
}

function columnLetter(index: number): string {
  let value = index + 1;
  let label = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
}

function findColumnIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map((header) =>
    header
      .toLowerCase()
      .replace(/[\p{P}\p{S}]+/gu, "")
      .replace(/\s+/g, ""),
  );

  for (const alias of aliases) {
    const target = alias
      .toLowerCase()
      .replace(/[\p{P}\p{S}]+/gu, "")
      .replace(/\s+/g, "");
    const index = normalized.indexOf(target);
    if (index >= 0) {
      return index;
    }
  }

  return -1;
}

async function ensureRegistryTab(): Promise<{ spreadsheetId: string; tabTitle: string }> {
  const location = getRegistryLocation();
  const tabs = await listSheetTabs(location.spreadsheetId);
  const existing = tabs.find(
    (tab) => tab.title.toLowerCase() === location.tabTitle.toLowerCase(),
  );

  if (existing) {
    return location;
  }

  await createSheetTab(location.spreadsheetId, location.tabTitle);
  await writeSheetRow(location.spreadsheetId, location.tabTitle, "A1", REGISTRY_HEADERS);

  return location;
}

type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function invalid(error: string): ActionResult {
  return { ok: false, error };
}

export async function addRegistryEntry(input: {
  title: string;
  formUrl: string;
  sheetUrl: string;
}): Promise<ActionResult> {
  const title = normalizeText(input.title);
  const formUrl = normalizeText(input.formUrl);
  const sheetUrl = normalizeText(input.sheetUrl);

  if (!title) {
    return invalid("A quiz title is required.");
  }

  if (formUrl && !/^https?:\/\//i.test(formUrl)) {
    return invalid("The form link must start with http:// or https://.");
  }

  const parsed = parseGoogleSheetUrl(sheetUrl);
  if (!parsed) {
    return invalid("Paste a Google Sheets link such as https://docs.google.com/spreadsheets/d/ID/edit?gid=123");
  }

  let tabId = parsed.gid;
  if (!tabId) {
    const tabs = await listSheetTabs(parsed.spreadsheetId);
    if (tabs.length === 0) {
      return invalid("That spreadsheet has no tabs.");
    }
    if (tabs.length > 1) {
      return invalid(
        `That spreadsheet has ${tabs.length} tabs. Open the results tab and copy the link including gid=...`,
      );
    }
    tabId = tabs[0].gid;
  }

  await ensureRegistryTab();

  const location = getRegistryLocation();
  const existingRows = await readSheetRows(location.spreadsheetId, location.tabTitle);
  const { entries } = parseRegistryRows(existingRows);

  const duplicate = entries.find(
    (entry) => entry.responseSheetId === parsed.spreadsheetId && entry.tabId === tabId,
  );
  if (duplicate) {
    return invalid(`"${duplicate.name}" already reads that same response sheet.`);
  }

  await appendSheetRow(location.spreadsheetId, location.tabTitle, [
    title,
    formUrl,
    buildSheetEditUrl(parsed.spreadsheetId, tabId),
    String(tabId),
    "yes",
  ]);

  return { ok: true, message: `Added ${title}.` };
}

export async function setRegistryEntryEnabled(rowNumber: number, enabled: boolean): Promise<ActionResult> {
  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    return invalid("That quiz row is no longer available. Refresh and try again.");
  }

  const location = getRegistryLocation();
  const rows = await readSheetRows(location.spreadsheetId, location.tabTitle);
  if (rows.length < 2 || rowNumber > rows.length) {
    return invalid("That quiz row is no longer available. Refresh and try again.");
  }

  const headers = rows[0] ?? [];
  const enabledColumn = findColumnIndex(headers, ["Enabled", "Active", "Status"]);
  const letter = columnLetter(enabledColumn >= 0 ? enabledColumn : REGISTRY_HEADERS.length - 1);

  await writeSheetRow(location.spreadsheetId, location.tabTitle, `${letter}${rowNumber}`, [
    enabled ? "yes" : "no",
  ]);

  return { ok: true };
}

export async function deleteRegistryEntry(rowNumber: number): Promise<ActionResult> {
  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    return invalid("That quiz row is no longer available. Refresh and try again.");
  }

  const location = getRegistryLocation();
  const rows = await readSheetRows(location.spreadsheetId, location.tabTitle);
  if (rows.length < 2 || rowNumber > rows.length) {
    return invalid("That quiz row is no longer available. Refresh and try again.");
  }

  const title = normalizeText(rows[rowNumber - 1]?.[0]) || "quiz";
  const tabs = await listSheetTabs(location.spreadsheetId);
  const registryTab = tabs.find((tab) => tab.title.toLowerCase() === location.tabTitle.toLowerCase());

  if (!registryTab) {
    return invalid("The quiz registry tab could not be found.");
  }

  await deleteSheetRow(location.spreadsheetId, registryTab.gid, rowNumber - 1);

  return { ok: true, message: `Removed ${title}.` };
}
