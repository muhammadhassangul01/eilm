import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

const SPREADSHEET_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export type SheetTab = { title: string; gid: string };

type FixtureTab = SheetTab & { rows: string[][] };
type FixtureSpreadsheet = { tabs: FixtureTab[] };

function getGoogleCredentials() {
  const credentialsText = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (credentialsText) {
    try {
      return JSON.parse(credentialsText);
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.");
    }
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    return {
      type: "service_account",
      project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID || undefined,
      private_key: privateKey.replace(/\\n/g, "\n"),
      client_email: clientEmail,
      private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID || undefined,
    };
  }

  throw new Error(
    "Missing Google Sheets service account credentials. Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
  );
}

// Reused for the lifetime of the process. Constructing a GoogleAuth per call
// means every request mints its own service-account token, which measured at
// ~300-700ms per Sheets API call.
let sheetsClient: ReturnType<typeof google.sheets> | null = null;

function getSheetsClient() {
  if (!sheetsClient) {
    const auth = new google.auth.GoogleAuth({
      credentials: getGoogleCredentials(),
      scopes: [SPREADSHEET_SCOPE],
    });
    sheetsClient = google.sheets({ version: "v4", auth });
  }

  return sheetsClient;
}

function quoteTabName(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

// Offline fixture mode: set SHEET_FIXTURE_DIR to read/write local JSON files
// instead of Google Sheets. Used for development and automated checks without
// service account credentials. Never set this in production.
let fixtureWarningLogged = false;

function fixtureDir(): string | null {
  const dir = process.env.SHEET_FIXTURE_DIR;
  if (!dir) {
    return null;
  }

  if (!fixtureWarningLogged) {
    fixtureWarningLogged = true;
    console.warn(
      `[google-sheets] SHEET_FIXTURE_DIR is set: reading and writing sheet fixtures from ${path.resolve(dir)} instead of Google Sheets. Do not enable this in production.`,
    );
  }

  return path.resolve(dir);
}

function fixturePathFor(dir: string, spreadsheetId: string): string {
  return path.join(dir, `${spreadsheetId.replace(/[^A-Za-z0-9_-]/g, "_")}.json`);
}

function readFixture(dir: string, spreadsheetId: string): FixtureSpreadsheet {
  const file = fixturePathFor(dir, spreadsheetId);
  if (!fs.existsSync(file)) {
    throw new Error(`No sheet fixture found for spreadsheet ${spreadsheetId} (${file}).`);
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as FixtureSpreadsheet;
    if (!parsed || !Array.isArray(parsed.tabs)) {
      throw new Error("invalid fixture");
    }
    return parsed;
  } catch (error) {
    throw new Error(
      `Sheet fixture ${file} could not be read: ${error instanceof Error ? error.message : "unknown error"}.`,
    );
  }
}

function writeFixture(dir: string, spreadsheetId: string, data: FixtureSpreadsheet): void {
  fs.writeFileSync(fixturePathFor(dir, spreadsheetId), JSON.stringify(data, null, 2));
}

function findFixtureTab(data: FixtureSpreadsheet, tab: string): FixtureTab {
  const target = String(tab ?? "").trim();
  const byGid = /^\d+$/.test(target) ? data.tabs.find((entry) => entry.gid === target) : undefined;
  const byTitle = data.tabs.find((entry) => entry.title.toLowerCase() === target.toLowerCase());
  const found = byGid ?? byTitle;

  if (!found) {
    throw new Error(
      `Unable to find tab "${target}" in fixture. Available tabs: ${data.tabs
        .map((entry) => `${entry.title} (gid ${entry.gid})`)
        .join(", ")}.`,
    );
  }

  return found;
}

function parseA1Cell(cell: string): { column: number; row: number } {
  const match = /^([A-Z]+)(\d+)$/.exec(cell.toUpperCase());
  if (!match) {
    throw new Error(`Invalid A1 cell reference: ${cell}`);
  }

  let column = 0;
  for (const letter of match[1]) {
    column = column * 26 + (letter.charCodeAt(0) - 64);
  }

  return { column: column - 1, row: Number(match[2]) };
}

// Tab titles and gids change rarely, but resolving them costs a full
// spreadsheets.get round trip on every sheet read. Memoize per spreadsheet and
// drop the entry whenever the app creates a tab or a lookup misses, so a tab
// added outside the app is picked up on the next attempt.
const tabListCache = new Map<string, Promise<SheetTab[]>>();

function invalidateTabList(spreadsheetId: string): void {
  tabListCache.delete(spreadsheetId);
}

async function fetchSheetTabs(spreadsheetId: string): Promise<SheetTab[]> {
  const sheets = getSheetsClient();
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(title,sheetId)",
  });

  return (metadata.data.sheets ?? [])
    .map((sheet) => ({
      title: String(sheet.properties?.title ?? ""),
      gid: String(sheet.properties?.sheetId ?? ""),
    }))
    .filter((tab) => tab.title);
}

export async function listSheetTabs(spreadsheetId: string): Promise<SheetTab[]> {
  if (!spreadsheetId) {
    throw new Error("Spreadsheet ID is required.");
  }

  const dir = fixtureDir();
  if (dir) {
    return readFixture(dir, spreadsheetId).tabs.map(({ title, gid }) => ({ title, gid }));
  }

  const cached = tabListCache.get(spreadsheetId);
  if (cached) {
    return cached;
  }

  const pending = fetchSheetTabs(spreadsheetId);
  tabListCache.set(spreadsheetId, pending);
  pending.catch(() => {
    if (tabListCache.get(spreadsheetId) === pending) {
      tabListCache.delete(spreadsheetId);
    }
  });

  return pending;
}

export async function resolveTab(spreadsheetId: string, tab: string): Promise<SheetTab> {
  const target = String(tab ?? "").trim();

  if (!target) {
    throw new Error(`No tab configured for spreadsheet ${spreadsheetId}.`);
  }

  const find = (tabs: SheetTab[]) => {
    const byGid = /^\d+$/.test(target) ? tabs.find((entry) => entry.gid === target) : undefined;
    return byGid ?? tabs.find((entry) => entry.title.toLowerCase() === target.toLowerCase());
  };

  let tabs = await listSheetTabs(spreadsheetId);
  let resolved = find(tabs);

  if (!resolved) {
    // The memoized list may predate a tab created outside the app.
    invalidateTabList(spreadsheetId);
    tabs = await listSheetTabs(spreadsheetId);
    resolved = find(tabs);
  }

  if (!resolved) {
    throw new Error(
      `Unable to find tab "${target}" in spreadsheet ${spreadsheetId}. Available tabs: ${tabs
        .map((entry) => `${entry.title} (gid ${entry.gid})`)
        .join(", ")}.`,
    );
  }

  return resolved;
}

export async function readSheetRows(spreadsheetId: string, tab: string): Promise<string[][]> {
  const dir = fixtureDir();
  if (dir) {
    const fixture = readFixture(dir, spreadsheetId);
    return findFixtureTab(fixture, tab).rows.map((row) => [...row]);
  }

  const resolved = await resolveTab(spreadsheetId, tab);
  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteTabName(resolved.title)}!A1:ZZ`,
  });

  return (response.data.values as string[][]) ?? [];
}

export async function appendSheetRow(
  spreadsheetId: string,
  tab: string,
  values: string[],
): Promise<void> {
  const dir = fixtureDir();
  if (dir) {
    const fixture = readFixture(dir, spreadsheetId);
    findFixtureTab(fixture, tab).rows.push([...values]);
    writeFixture(dir, spreadsheetId, fixture);
    return;
  }

  const resolved = await resolveTab(spreadsheetId, tab);
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${quoteTabName(resolved.title)}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
}

export async function deleteSheetRow(
  spreadsheetId: string,
  sheetGid: string,
  zeroBasedRowIndex: number,
): Promise<void> {
  const dir = fixtureDir();
  if (dir) {
    const fixture = readFixture(dir, spreadsheetId);
    const tab = fixture.tabs.find((entry) => entry.gid === String(sheetGid));
    if (!tab) {
      throw new Error(`No fixture tab with gid ${sheetGid}.`);
    }
    tab.rows.splice(zeroBasedRowIndex, 1);
    writeFixture(dir, spreadsheetId, fixture);
    return;
  }

  const sheets = getSheetsClient();

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: Number(sheetGid),
              dimension: "ROWS",
              startIndex: zeroBasedRowIndex,
              endIndex: zeroBasedRowIndex + 1,
            },
          },
        },
      ],
    },
  });
}

export async function createSheetTab(spreadsheetId: string, title: string): Promise<SheetTab> {
  const dir = fixtureDir();
  if (dir) {
    const fixture = readFixture(dir, spreadsheetId);
    if (fixture.tabs.some((tab) => tab.title.toLowerCase() === title.toLowerCase())) {
      throw new Error(`Tab "${title}" already exists.`);
    }

    const gid = String(
      fixture.tabs.reduce((highest, tab) => Math.max(highest, Number(tab.gid) || 0), -1) + 1,
    );
    fixture.tabs.push({ title, gid, rows: [] });
    writeFixture(dir, spreadsheetId, fixture);

    return { title, gid };
  }

  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }],
    },
  });

  const properties = response.data.replies?.[0]?.addSheet?.properties;

  invalidateTabList(spreadsheetId);

  return {
    title: String(properties?.title ?? title),
    gid: String(properties?.sheetId ?? "0"),
  };
}

export async function writeSheetRow(
  spreadsheetId: string,
  tab: string,
  a1Cell: string,
  values: string[],
): Promise<void> {
  const dir = fixtureDir();
  if (dir) {
    const fixture = readFixture(dir, spreadsheetId);
    const target = findFixtureTab(fixture, tab);
    const { column, row } = parseA1Cell(a1Cell);

    while (target.rows.length < row) {
      target.rows.push([]);
    }

    const existing = target.rows[row - 1] ?? [];
    while (existing.length < column + values.length) {
      existing.push("");
    }
    values.forEach((value, index) => {
      existing[column + index] = value;
    });
    target.rows[row - 1] = existing;

    writeFixture(dir, spreadsheetId, fixture);
    return;
  }

  const resolved = await resolveTab(spreadsheetId, tab);
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteTabName(resolved.title)}!${a1Cell}`,
    valueInputOption: "RAW",
    requestBody: { values: [values] },
  });
}
