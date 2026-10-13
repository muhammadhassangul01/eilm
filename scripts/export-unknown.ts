import fs from "node:fs";
import path from "node:path";

import { readSheetRows } from "../lib/google-sheets";
import { INVISIBLE_CHARACTERS, normalizeText } from "../lib/normalize";
import { normalizeE164 } from "../lib/student-data";
import { parseRegistryRows, compareQuizzes } from "../lib/quiz-config";

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

const PHONE_HEADERS = [
  "واٹس ایپ نمبر",
  "واتس ایپ نمبر",
  "whatsapp number",
  "phone number",
  "mobile number",
  "number",
  "mobile",
  "phone",
];
const NAME_HEADERS = ["نام", "name", "student name"];
const URDU_RANGE = /[؀-ۿݐ-ݿ]/;
const LATIN_RANGE = /[A-Za-z]/;

function matchKey(value: string): string {
  return normalizeText(value)
    .replace(INVISIBLE_CHARACTERS, "")
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scriptLabel(name: string): string {
  const hasUrdu = URDU_RANGE.test(name);
  const hasLatin = LATIN_RANGE.test(name);
  if (hasUrdu && hasLatin) return "mixed";
  if (hasUrdu) return "urdu";
  if (hasLatin) return "latin";
  return "other";
}

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function findColumnIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map((header) =>
    normalizeText(header)
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

type UnknownRow = {
  quiz: string;
  sheetRow: number;
  timestamp: string;
  score: string;
  name: string;
  phone: string;
  reason: string;
  nameScript: string;
};

async function main() {
  loadLocalEnv();

  const registrationSheetId = process.env.REGISTRATION_SHEET_ID;
  if (!registrationSheetId) {
    throw new Error("REGISTRATION_SHEET_ID is missing");
  }

  const regRows = await readSheetRows(registrationSheetId, process.env.REGISTRATION_TAB_ID ?? "0");
  const regHeaders = regRows[0].map((header) => normalizeText(header));
  const regNameIdx = findColumnIndex(regHeaders, ["Name", "نام", "Student Name"]);

  const byE164 = new Map<string, number>();
  const byNormName = new Map<string, number[]>();
  regRows.slice(1).forEach((row, index) => {
    for (const phoneIdx of [
      findColumnIndex(regHeaders, ["Number", "Mobile Number", "Phone"]),
      findColumnIndex(regHeaders, ["Old Number", "OldNumber"]),
    ]) {
      const e164 = normalizeE164(row[phoneIdx], "PK");
      if (e164 && !byE164.has(e164)) {
        byE164.set(e164, index);
      }
    }
    const name = matchKey(row[regNameIdx]);
    if (name) {
      const bucket = byNormName.get(name) ?? [];
      bucket.push(index);
      byNormName.set(name, bucket);
    }
  });

  const registrySheetId = process.env.QUIZ_REGISTRY_SHEET_ID || registrationSheetId;
  const registryTab = process.env.QUIZ_REGISTRY_TAB_NAME || "Quizzes";
  const { entries } = parseRegistryRows(await readSheetRows(registrySheetId, registryTab));
  const quizzes = entries
    .filter((quiz) => quiz.enabled && quiz.responseSheetId && quiz.tabId)
    .sort(compareQuizzes);

  const unknown: UnknownRow[] = [];

  for (const quiz of quizzes) {
    const rows = await readSheetRows(quiz.responseSheetId!, quiz.tabId!);
    if (rows.length < 2) {
      continue;
    }
    const headers = rows[0].map((header) => normalizeText(header));
    const phoneIdx = findColumnIndex(headers, PHONE_HEADERS);
    const nameIdx = findColumnIndex(headers, NAME_HEADERS);
    const timeIdx = findColumnIndex(headers, ["Timestamp", "Date"]);
    const scoreIdx = findColumnIndex(headers, ["Score", "اسکور"]);

    rows.slice(1).forEach((row, index) => {
      const sheetRow = index + 2;
      const name = normalizeText(nameIdx >= 0 ? row[nameIdx] : "");
      const rawPhone = phoneIdx >= 0 ? normalizeText(row[phoneIdx]) : "";
      const timestamp = timeIdx >= 0 ? normalizeText(row[timeIdx]) : "";
      const score = scoreIdx >= 0 ? normalizeText(row[scoreIdx]) : "";

      if (!name && !rawPhone) {
        return;
      }

      const e164 = normalizeE164(rawPhone, "PK");
      let reason: string | null = null;

      if (rawPhone && !e164) {
        reason = "invalid_phone";
      } else if (e164 && !byE164.has(e164)) {
        reason = "phone_not_registered";
      } else if (!e164) {
        const nameHits = byNormName.get(matchKey(name)) ?? [];
        if (nameHits.length === 0) {
          reason = "name_not_registered";
        } else if (nameHits.length > 1) {
          reason = `ambiguous_name(${nameHits.length}_registrations_share_this_name)`;
        }
      }

      if (reason) {
        unknown.push({
          quiz: quiz.name,
          sheetRow,
          timestamp,
          score,
          name,
          phone: rawPhone,
          reason,
          nameScript: scriptLabel(name),
        });
      }
    });
  }

  unknown.sort((a, b) => {
    const na = Number(a.quiz.match(/\d+/)?.[0] ?? Infinity);
    const nb = Number(b.quiz.match(/\d+/)?.[0] ?? Infinity);
    if (na !== nb) {
      return na - nb;
    }
    return a.sheetRow - b.sheetRow;
  });

  const header = [
    "Quiz",
    "Sheet Row",
    "Timestamp",
    "Score",
    "Name",
    "Phone (as submitted)",
    "Name Script",
    "Why unmatched",
  ];
  const lines = [header.map(csvCell).join(",")];
  unknown.forEach((entry) => {
    lines.push(
      [
        entry.quiz,
        String(entry.sheetRow),
        entry.timestamp,
        entry.score,
        entry.name,
        entry.phone,
        entry.nameScript,
        entry.reason,
      ]
        .map(csvCell)
        .join(","),
    );
  });

  const outDir = path.join(process.cwd(), "temp");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "unknown-people.csv");
  fs.writeFileSync(outFile, `\uFEFF${lines.join("\r\n")}\r\n`, "utf8");

  const byQuiz = new Map<string, number>();
  const byReason = new Map<string, number>();
  const byScript = new Map<string, number>();
  unknown.forEach((entry) => {
    byQuiz.set(entry.quiz, (byQuiz.get(entry.quiz) ?? 0) + 1);
    const reasonKey = entry.reason.replace(/\(.*/, "");
    byReason.set(reasonKey, (byReason.get(reasonKey) ?? 0) + 1);
    byScript.set(entry.nameScript, (byScript.get(entry.nameScript) ?? 0) + 1);
  });

  console.log(`wrote ${unknown.length} unmatched submissions to ${outFile}`);
  console.log("by quiz:");
  for (const [quiz, count] of byQuiz) {
    console.log(`  ${quiz}: ${count}`);
  }
  console.log("by reason:");
  for (const [reason, count] of byReason) {
    console.log(`  ${reason}: ${count}`);
  }
  console.log("by name script:");
  for (const [script, count] of byScript) {
    console.log(`  ${script}: ${count}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
