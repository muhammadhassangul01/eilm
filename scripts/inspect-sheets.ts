import fs from "node:fs";
import path from "node:path";
import { listSheetTabs, readSheetRows } from "../lib/google-sheets";
import { normalizeE164 } from "../lib/student-data";
import { parseGoogleSheetUrl } from "../lib/quiz-config";

function loadLocalEnv(): void {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return;
  }

  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) {
    return;
  }

  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) {
      continue;
    }

    let value = match[2].trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }

    if (!(match[1] in process.env)) {
      process.env[match[1]] = value;
    }
  }
}

function mask(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 6) {
    return "*".repeat(Math.max(digits.length, 3));
  }
  return `${digits.slice(0, 4)}${"*".repeat(digits.length - 6)}${digits.slice(-2)}`;
}

function phoneFormatBucket(value: string): string {
  const trimmed = value.trim();
  if (/^\+/.test(trimmed)) {
    return "E.164 with +";
  }
  if (/^00\d/.test(trimmed)) {
    return "00CC international";
  }
  if (/^0\d{6,}$/.test(trimmed.replace(/[\s-]/g, ""))) {
    return "local 0...";
  }
  if (/^(92|44|49)\d{6,}$/.test(trimmed.replace(/[\s-]/g, ""))) {
    return "country code without +";
  }
  if (/^\d+$/.test(trimmed.replace(/[\s-]/g, ""))) {
    return "digits only (short/local)";
  }
  return "other / non-numeric";
}

const PHONE_HINT = /phone|number|mobile|whatsapp|نمبر/i;
const NAME_HINT = /name|نام/i;
const TIME_HINT = /timestamp|date|وقت|تاریخ/i;
const SCORE_HINT = /score|mark|اسکور|نمبر/i;

function countInvisible(value: string): number {
  return (value.match(/[\u00A0\u200B\u200C\u200D\u2060\uFEFF]/g) ?? []).length;
}

async function inspectSheet(label: string, spreadsheetId: string, tab: string): Promise<void> {
  console.log(`\n=== ${label} ===`);
  console.log(`spreadsheet: ${spreadsheetId} | tab: ${tab}`);

  const tabs = await listSheetTabs(spreadsheetId);
  console.log(`access: OK (${tabs.length} tabs) -> ${tabs.map((t) => `${t.title} [gid ${t.gid}]`).join(", ")}`);

  const rows = await readSheetRows(spreadsheetId, tab);
  if (rows.length === 0) {
    console.log("sheet is empty");
    return;
  }

  const headers = rows[0];
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
  console.log(`columns: ${headers.length} | data rows: ${dataRows.length}`);

  headers.forEach((header, index) => {
    const name = String(header ?? "").trim();
    const cells = dataRows.map((row) => String(row[index] ?? ""));
    const nonEmpty = cells.filter((cell) => cell.trim() !== "");
    const line = [`  [${index}] ${JSON.stringify(name || "(empty header)")}`, `non-empty ${nonEmpty.length}/${cells.length}`];

    const looksPhone = PHONE_HINT.test(name) || (nonEmpty.length > 0 && nonEmpty.filter((c) => normalizeE164(c, "PK")).length / nonEmpty.length > 0.6);
    if (looksPhone && nonEmpty.length > 0) {
      const buckets = new Map<string, number>();
      let normalized = 0;
      const samples: string[] = [];
      for (const cell of nonEmpty) {
        const bucket = phoneFormatBucket(cell);
        buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
        if (normalizeE164(cell, "PK")) {
          normalized += 1;
        }
        if (samples.length < 3) {
          samples.push(mask(cell));
        }
      }
      const bucketText = Array.from(buckets.entries())
        .map(([bucket, count]) => `${bucket}=${count}`)
        .join(", ");
      line.push(`PHONE formats: ${bucketText}`);
      line.push(`normalises to E.164: ${normalized}/${nonEmpty.length} | samples: ${samples.join(", ")}`);
    } else if (NAME_HINT.test(name) && nonEmpty.length > 0) {
      const blank = cells.length - nonEmpty.length;
      const padded = nonEmpty.filter((cell) => cell !== cell.trim()).length;
      const invisible = nonEmpty.filter((cell) => countInvisible(cell) > 0).length;
      line.push(`NAME: blank ${blank}, padded spaces ${padded}, invisible chars ${invisible}`);
    } else if (TIME_HINT.test(name) && nonEmpty.length > 0) {
      const parsed = nonEmpty.filter((cell) => !Number.isNaN(Date.parse(cell))).length;
      line.push(`timestamps parseable: ${parsed}/${nonEmpty.length} | sample: ${nonEmpty[0]}`);
    } else if (SCORE_HINT.test(name) && nonEmpty.length > 0) {
      const numeric = nonEmpty.filter((cell) => !Number.isNaN(Number(cell))).length;
      line.push(`numeric: ${numeric}/${nonEmpty.length} | sample: ${nonEmpty[0]}`);
    } else if (nonEmpty.length > 0) {
      const longest = nonEmpty.reduce((best, cell) => (cell.length > best.length ? cell : best), "");
      line.push(`sample: ${JSON.stringify(nonEmpty[0].slice(0, 60))}${longest.length > 60 ? ` | longest ${longest.length} chars` : ""}`);
    }

    console.log(line.join(" | "));
  });

  if (/number|phone|mobile|نمبر/i.test(headers.join(" "))) {
    const phoneIndexes = headers
      .map((header, index) => ({ header: String(header ?? ""), index }))
      .filter((entry) => PHONE_HINT.test(entry.header));

    const seen = new Map<string, Set<number>>();
    dataRows.forEach((row, rowIndex) => {
      const rowPhones = new Set<string>();
      phoneIndexes.forEach(({ index }) => {
        const normalized = normalizeE164(row[index], "PK");
        if (normalized) {
          rowPhones.add(normalized);
        }
      });
      rowPhones.forEach((phone) => {
        seen.set(phone, (seen.get(phone) ?? new Set()).add(rowIndex + 2));
      });
    });

    const shared = Array.from(seen.entries()).filter(([, rowsUsed]) => rowsUsed.size > 1);
    console.log(
      `unique normalised phones: ${seen.size} | shared by multiple rows: ${shared.length}` +
        (shared.length > 0
          ? ` -> ${shared
              .map(([phone, rowsUsed]) => `${mask(phone)} (rows ${Array.from(rowsUsed).join(", ")})`)
              .join("; ")}`
          : ""),
    );
  }
}

async function main(): Promise<void> {
  loadLocalEnv();

  const registrationSheetId = process.env.REGISTRATION_SHEET_ID;
  const registrationTab = process.env.REGISTRATION_TAB_ID ?? "0";

  console.log("=== credentials ===");
  const credentialsText = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (credentialsText) {
    try {
      const credentials = JSON.parse(credentialsText);
      console.log(`service account: ${credentials.client_email} | project: ${credentials.project_id}`);
    } catch {
      console.log("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
    }
  } else {
    console.log("GOOGLE_SERVICE_ACCOUNT_JSON is missing");
  }
  console.log(`fixture mode: ${process.env.SHEET_FIXTURE_DIR ? "ON (not live)" : "off (live Google Sheets)"}`);

  if (!registrationSheetId) {
    console.log("REGISTRATION_SHEET_ID is missing");
    process.exitCode = 1;
    return;
  }

  await inspectSheet("registration sheet", registrationSheetId, registrationTab);

  const registrySheetId =
    process.env.QUIZ_REGISTRY_SHEET_ID || registrationSheetId;
  const registryTab = process.env.QUIZ_REGISTRY_TAB_ID || "Quizzes";

  console.log("\n=== quiz registry tab ===");
  try {
    const tabs = await listSheetTabs(registrySheetId);
    const found = tabs.find((tab) => tab.title.toLowerCase() === registryTab.toLowerCase());
    if (found) {
      const rows = await readSheetRows(registrySheetId, found.title);
      console.log(`present: ${found.title} [gid ${found.gid}] | rows: ${Math.max(rows.length - 1, 0)}`);
      rows.forEach((row, index) => console.log(`  ${index === 0 ? "header" : `row ${index}`}: ${JSON.stringify(row)}`));
    } else {
      console.log(`MISSING: no "${registryTab}" tab (created automatically on first quiz add)`);
    }
  } catch (error) {
    console.log(`could not read registry: ${error instanceof Error ? error.message : String(error)}`);
  }

  for (const arg of process.argv.slice(2)) {
    const parsed = parseGoogleSheetUrl(arg);
    if (!parsed) {
      console.log(`\nnot a sheet link: ${arg}`);
      continue;
    }
    await inspectSheet("quiz response sheet", parsed.spreadsheetId, parsed.gid ?? "0");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
