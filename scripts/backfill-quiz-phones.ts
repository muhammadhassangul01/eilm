import fs from "node:fs";
import path from "node:path";

import { readSheetRows, resolveTab, updateSheetRange } from "../lib/google-sheets";
import { INVISIBLE_CHARACTERS, normalizeText } from "../lib/normalize";
import { normalizeE164 } from "../lib/student-data";
import { parseRegistryRows } from "../lib/quiz-config";

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
const PHONE_COLUMN_HEADER = "واٹس ایپ نمبر";
const NAME_HEADERS = ["نام", "name", "student name"];

const APPLY = process.argv.includes("--apply");
const QUIZ_FILTER = process.argv.find((arg) => arg.startsWith("--quizzes="))?.slice("--quizzes=".length);
const FILTER_SET = QUIZ_FILTER
  ? new Set(QUIZ_FILTER.split(",").map((part) => part.trim().toLowerCase()))
  : null;

// Conservative Roman-Urdu / English spelling canonicalisation. Only pairs that
// are near-universally the same name are listed; everything else is left to the
// fuzzy tier, which refuses to guess without a clear margin.
const VARIANT_TOKENS: Record<string, string> = {
  mohammad: "muhammad",
  mohamed: "muhammad",
  muhamad: "muhammad",
  muhamed: "muhammad",
  muhmmad: "muhammad",
  muhmad: "muhammad",
  mohd: "muhammad",
  muhammd: "muhammad",
  rahman: "rehman",
  ahmed: "ahmad",
  husain: "husain",
  hussein: "husain",
  hussain: "husain",
  sayed: "syed",
  syad: "syed",
  shaikh: "sheikh",
  fatema: "fatima",
  fatimah: "fatima",
  naseer: "nasir",
  nasser: "nasir",
  faruq: "farooq",
  sarfaraz: "sarfraz",
  ummi: "umme",
};

const HONORIFICS = new Set(["mr", "mrs", "ms", "miss", "hazrat", "hz", "dr", "prof"]);

const INVISIBLE = /[\u00AD\u200B-\u200F\u061C\u2060\u202A-\u202E\uFEFF]/g;
const URDU_RANGE = /[؀-ۿݐ-ݿ]/;
const SPLIT_SCRIPT = /(?=[؀-ۿݐ-ݿ])|(?<=[؀-ۿݐ-ݿ])/;

function matchKey(value: string): string {
  return normalizeText(value)
    .replace(INVISIBLE, "")
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function variantKey(value: string): string {
  return matchKey(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => VARIANT_TOKENS[token] ?? token)
    .filter((token) => !HONORIFICS.has(token))
    .join("");
}

function jaroWinkler(a: string, b: string): number {
  if (a === b) {
    return 1;
  }
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0 || lenB === 0) {
    return 0;
  }

  const matchWindow = Math.max(Math.floor(Math.max(lenA, lenB) / 2) - 1, 0);
  const matchedA = new Array<boolean>(lenA).fill(false);
  const matchedB = new Array<boolean>(lenB).fill(false);
  let matches = 0;

  for (let i = 0; i < lenA; i += 1) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, lenB);
    for (let j = start; j < end; j += 1) {
      if (matchedB[j] || a[i] !== b[j]) {
        continue;
      }
      matchedA[i] = true;
      matchedB[j] = true;
      matches += 1;
      break;
    }
  }

  if (matches === 0) {
    return 0;
  }

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < lenA; i += 1) {
    if (!matchedA[i]) {
      continue;
    }
    while (!matchedB[k]) {
      k += 1;
    }
    if (a[i] !== b[k]) {
      transpositions += 1;
    }
    k += 1;
  }
  transpositions /= 2;

  const jaro =
    (matches / lenA + matches / lenB + (matches - transpositions) / matches) / 3;

  let prefix = 0;
  const maxPrefix = Math.min(4, lenA, lenB);
  while (prefix < maxPrefix && a[prefix] === b[prefix]) {
    prefix += 1;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

type Registration = {
  id: string;
  name: string;
  numberRaw: string;
  e164: string | null;
  oldE164: string | null;
  normName: string;
  key: string;
};

type MatchTier = "proven" | "embedded-phone" | "exact" | "variant" | "script-split" | "fuzzy";

type MatchResult =
  | { ok: true; registration: Registration; tier: MatchTier; score?: number }
  | { ok: false; reason: string };

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

async function main() {
  loadLocalEnv();

  const registrationSheetId = process.env.REGISTRATION_SHEET_ID;
  if (!registrationSheetId) {
    throw new Error("REGISTRATION_SHEET_ID is missing");
  }
  const registrationTab = process.env.REGISTRATION_TAB_ID ?? "0";

  console.log(`mode: ${APPLY ? "APPLY (writing to Google Sheets)" : "DRY RUN (no writes)"}`);
  if (FILTER_SET) {
    console.log(`quiz filter: ${Array.from(FILTER_SET).join(", ")}`);
  }

  const regRows = await readSheetRows(registrationSheetId, registrationTab);
  const regHeaders = regRows[0].map((header) => normalizeText(header));
  const idIdx = findColumnIndex(regHeaders, ["ID"]);
  const nameIdx = findColumnIndex(regHeaders, ["Name", "نام", "Student Name"]);
  const numberIdx = findColumnIndex(regHeaders, ["Number", "Mobile Number", "Phone"]);
  const oldIdx = findColumnIndex(regHeaders, ["Old Number", "OldNumber"]);

  const registrations: Registration[] = regRows
    .slice(1)
    .map((row, index) => {
      const name = normalizeText(row[nameIdx]);
      const numberRaw = normalizeText(row[numberIdx]);
      const oldRaw = oldIdx >= 0 ? normalizeText(row[oldIdx]) : "";
      return {
        id: normalizeText(row[idIdx]) || `row-${index + 2}`,
        name,
        numberRaw,
        e164: normalizeE164(numberRaw, "PK"),
        oldE164: normalizeE164(oldRaw, "PK"),
        normName: name.toLowerCase(),
        key: variantKey(name),
      };
    })
    .filter((registration) => registration.name);

  console.log(`registrations loaded: ${registrations.length}`);

  const byE164 = new Map<string, Registration[]>();
  const byNormName = new Map<string, Registration[]>();
  const byKey = new Map<string, Registration[]>();
  for (const registration of registrations) {
    for (const phone of Array.from(new Set([registration.e164, registration.oldE164].filter((value): value is string => Boolean(value))))) {
      const bucket = byE164.get(phone) ?? [];
      bucket.push(registration);
      byE164.set(phone, bucket);
    }
    const nameBucket = byNormName.get(registration.normName) ?? [];
    nameBucket.push(registration);
    byNormName.set(registration.normName, nameBucket);
    if (registration.key) {
      const keyBucket = byKey.get(registration.key) ?? [];
      keyBucket.push(registration);
      byKey.set(registration.key, keyBucket);
    }
  }

  // ---- registry: discover every quiz response sheet ----------------------
  const registrySheetId = process.env.QUIZ_REGISTRY_SHEET_ID || registrationSheetId;
  const registryTab = process.env.QUIZ_REGISTRY_TAB_NAME || "Quizzes";
  const registryRows = await readSheetRows(registrySheetId, registryTab);
  const { entries, problems } = parseRegistryRows(registryRows);
  problems.forEach((problem) => console.log(`registry: ${problem}`));

  const quizzes = entries
    .filter((quiz) => quiz.enabled && quiz.responseSheetId && quiz.tabId)
    .filter((quiz) => {
      if (!FILTER_SET) return true;
      return FILTER_SET.has(quiz.name.toLowerCase().replace(/^quiz\s*/, ""));
    })
    .sort((a, b) => {
      const na = Number(a.name.match(/\d+/)?.[0] ?? Infinity);
      const nb = Number(b.name.match(/\d+/)?.[0] ?? Infinity);
      return na - nb;
    });

  console.log(`quizzes to process: ${quizzes.map((quiz) => quiz.name).join(", ")}`);

  // ---- proven name -> phone map from quizzes that collected numbers ------
  const proven = new Map<string, { e164: string; numberRaw: string; regId: string }>();
  const provenConflicts = new Set<string>();

  for (const quiz of quizzes) {
    const rows = await readSheetRows(quiz.responseSheetId!, quiz.tabId!);
    if (rows.length < 2) continue;
    const headers = rows[0].map((header) => normalizeText(header));
    const phoneIdx = findColumnIndex(headers, PHONE_HEADERS);
    const nameIdxLocal = findColumnIndex(headers, NAME_HEADERS);
    if (phoneIdx < 0 || nameIdxLocal < 0) continue;

    for (const row of rows.slice(1)) {
      const name = normalizeText(row[nameIdxLocal]);
      const phone = normalizeE164(row[phoneIdx], "PK");
      if (!name || !phone) continue;
      const key = matchKey(name);
      const owners = byE164.get(phone) ?? [];
      if (owners.length !== 1) continue;
      const existing = proven.get(key);
      if (existing && existing.e164 !== phone) {
        provenConflicts.add(key);
        proven.delete(key);
        continue;
      }
      if (!proven.has(key)) {
        proven.set(key, {
          e164: phone,
          numberRaw: owners[0].numberRaw,
          regId: owners[0].id,
        });
      }
    }
  }
  console.log(`proven name->phone pairs from phone-taking quizzes: ${proven.size} (${provenConflicts.size} dropped for conflict)`);

  // ---- matching ----------------------------------------------------------
  const FUZZY_THRESHOLD = 0.97;
  const FUZZY_MARGIN = 0.04;

  function matchName(rawName: string): MatchResult {
    const key = matchKey(rawName);
    if (!key) {
      return { ok: false, reason: "empty_name" };
    }

    // Tier 1: the exact same name string was already seen with this phone on a
    // quiz that collected numbers, and that phone belongs to one registration.
    const provenHit = proven.get(key);
    if (provenHit) {
      const owners = byE164.get(provenHit.e164) ?? [];
      if (owners.length === 1) {
        return { ok: true, registration: owners[0], tier: "proven" };
      }
      return { ok: false, reason: "proven_owner_ambiguous" };
    }

    // Tier 2: the name cell itself contains a phone number
    // ("حرا وقاص 03025306487") that belongs to exactly one registration.
    const embeddedDigits = rawName.replace(/[^\d+]/g, " ").trim();
    const embeddedMatch = /\+?\d[\d\s-]{6,}/.exec(rawName);
    if (embeddedMatch || embeddedDigits) {
      const candidate = embeddedMatch ? embeddedMatch[0] : embeddedDigits;
      const embeddedE164 = normalizeE164(candidate, "PK");
      if (embeddedE164) {
        const owners = byE164.get(embeddedE164) ?? [];
        if (owners.length === 1 && owners[0].e164) {
          return { ok: true, registration: owners[0], tier: "embedded-phone" };
        }
      }
    }

    // Tier 2: exact name match against the registration sheet.
    const exact = byNormName.get(rawName.toLowerCase().replace(INVISIBLE_CHARACTERS, "").replace(/\s+/g, " ").trim()) ?? [];
    if (exact.length === 1) {
      if (!exact[0].e164) {
        return { ok: false, reason: "registration_missing_valid_phone" };
      }
      return { ok: true, registration: exact[0], tier: "exact" };
    }
    if (exact.length > 1) {
      return { ok: false, reason: `ambiguous_exact(${exact.length})` };
    }

    // Tier 3: canonicalised key (spelling variants, honorifics, spacing).
    const variantHits = byKey.get(variantKey(rawName)) ?? [];
    if (variantHits.length === 1) {
      if (!variantHits[0].e164) {
        return { ok: false, reason: "registration_missing_valid_phone" };
      }
      return { ok: true, registration: variantHits[0], tier: "variant" };
    }
    if (variantHits.length > 1) {
      return { ok: false, reason: `ambiguous_variant(${variantHits.length})` };
    }

    // Tier 4: mixed-script names ("Talha. طلحہ") - try each script part alone.
    if (URDU_RANGE.test(rawName)) {
      const parts = rawName.split(SPLIT_SCRIPT).map((part) => part.trim()).filter(Boolean);
      for (const part of parts) {
        if (URDU_RANGE.test(part)) {
          const urduHits = (byNormName.get(part.toLowerCase()) ?? []);
          if (urduHits.length === 1 && urduHits[0].e164) {
            return { ok: true, registration: urduHits[0], tier: "script-split" };
          }
        } else {
          const latinKey = variantKey(part);
          const latinHits = byKey.get(latinKey) ?? [];
          if (latinHits.length === 1 && latinHits[0].e164) {
            return { ok: true, registration: latinHits[0], tier: "script-split" };
          }
        }
      }
    }

    // Tier 5: fuzzy - only with a clear best candidate and margin.
    const queryKey = variantKey(rawName);
    if (queryKey.length >= 5) {
      let bestKey: string | null = null;
      let bestScore = 0;
      let secondScore = 0;
      for (const [candidateKey] of byKey) {
        if (Math.abs(candidateKey.length - queryKey.length) > 6) {
          continue;
        }
        const score = jaroWinkler(queryKey, candidateKey);
        if (score > bestScore) {
          secondScore = bestScore;
          bestScore = score;
          bestKey = candidateKey;
        } else if (score > secondScore) {
          secondScore = score;
        }
      }
      if (bestKey && bestScore >= FUZZY_THRESHOLD && bestScore - secondScore >= FUZZY_MARGIN) {
        const hits = byKey.get(bestKey) ?? [];
        if (hits.length === 1 && hits[0].e164) {
          return { ok: true, registration: hits[0], tier: "fuzzy", score: bestScore };
        }
        if (hits.length > 1) {
          return { ok: false, reason: `ambiguous_fuzzy(${hits.length})` };
        }
      }
    }

    return { ok: false, reason: "no_match" };
  }

  // ---- per-quiz backfill -------------------------------------------------
  type Plan = {
    quizName: string;
    spreadsheetId: string;
    tabTitle: string;
    tabGid: string;
    columnIndex: number;
    columnCreated: boolean;
    totalRows: number;
    existingFilled: number;
    columnValues: string[];
    assignments: Array<{ row: number; name: string; phone: string; registration: Registration; tier: MatchTier; score?: number }>;
    unmatched: Array<{ row: number; name: string; reason: string }>;
  };

  const plans: Plan[] = [];

  for (const quiz of quizzes) {
    const rows = await readSheetRows(quiz.responseSheetId!, quiz.tabId!);
    if (rows.length < 2) {
      console.log(`\n${quiz.name}: no response rows, skipping`);
      continue;
    }

    const tab = await resolveTab(quiz.responseSheetId!, quiz.tabId!);
    const headers = rows[0].map((header) => normalizeText(header));
    let phoneIdx = findColumnIndex(headers, PHONE_HEADERS);
    const nameIdxLocal = findColumnIndex(headers, NAME_HEADERS);
    if (nameIdxLocal < 0) {
      console.log(`\n${quiz.name}: no name column found, skipping`);
      continue;
    }

    const createdColumn = phoneIdx < 0;
    if (createdColumn) {
      phoneIdx = headers.length;
    }

    const plan: Plan = {
      quizName: quiz.name,
      spreadsheetId: quiz.responseSheetId!,
      tabTitle: tab.title,
      tabGid: tab.gid,
      columnIndex: phoneIdx,
      columnCreated: createdColumn,
      totalRows: rows.length - 1,
      existingFilled: 0,
      columnValues: [],
      assignments: [],
      unmatched: [],
    };

    rows.slice(1).forEach((row, index) => {
      const sheetRow = index + 2;
      const name = normalizeText(row[nameIdxLocal]);
      const existingPhone = normalizeText(row[phoneIdx]);
      if (existingPhone) {
        plan.existingFilled += 1;
        plan.columnValues.push(existingPhone);
        return;
      }
      if (!name) {
        plan.unmatched.push({ row: sheetRow, name: "", reason: "empty_name" });
        plan.columnValues.push("");
        return;
      }

      const result = matchName(name);
      if (result.ok) {
        plan.assignments.push({
          row: sheetRow,
          name,
          phone: result.registration.numberRaw,
          registration: result.registration,
          tier: result.tier,
          score: result.score,
        });
        plan.columnValues.push(result.registration.numberRaw);
      } else {
        plan.unmatched.push({ row: sheetRow, name, reason: result.reason });
        plan.columnValues.push("");
      }
    });

    plans.push(plan);

    const tierCounts = new Map<string, number>();
    plan.assignments.forEach((assignment) => {
      tierCounts.set(assignment.tier, (tierCounts.get(assignment.tier) ?? 0) + 1);
    });

    console.log(`\n=== ${quiz.name} (${plan.totalRows} responses) ===`);
    console.log(
      `phone column: ${createdColumn ? `MISSING - will add "${PHONE_COLUMN_HEADER}" as column ${columnLetter(phoneIdx)}` : `found at column ${columnLetter(phoneIdx)}`}`,
    );
    console.log(`already filled: ${plan.existingFilled}`);
    console.log(
      `would fill: ${plan.assignments.length} (${Array.from(tierCounts.entries()).map(([tier, count]) => `${tier}=${count}`).join(", ") || "none"})`,
    );
    console.log(`left blank: ${plan.unmatched.length}`);

    const noteworthy = new Set(["fuzzy", "script-split", "embedded-phone"]);
    if (plan.assignments.some((assignment) => noteworthy.has(assignment.tier))) {
      console.log("  fuzzy / embedded / script-split assignments (spot-check these):");
      plan.assignments
        .filter((assignment) => noteworthy.has(assignment.tier))
        .forEach((assignment) => {
          console.log(
            `    row ${assignment.row}: ${JSON.stringify(assignment.name)} -> ${assignment.registration.id} ${JSON.stringify(assignment.registration.name)} [${assignment.tier}${assignment.score ? ` ${assignment.score.toFixed(3)}` : ""}]`,
          );
        });
    }

    if (plan.unmatched.length > 0) {
      const byReason = new Map<string, string[]>();
      plan.unmatched.forEach((entry) => {
        const bucket = byReason.get(entry.reason) ?? [];
        bucket.push(entry.name || "(blank)");
        byReason.set(entry.reason, bucket);
      });
      console.log("  unmatched breakdown:");
      for (const [reason, names] of byReason) {
        const unique = Array.from(new Set(names));
        console.log(`    ${reason}: ${names.length} rows (${unique.length} unique names)`);
        if (reason !== "empty_name") {
          unique.slice(0, 40).forEach((name) => console.log(`      - ${JSON.stringify(name)}`));
          if (unique.length > 40) {
            console.log(`      ... and ${unique.length - 40} more`);
          }
        }
      }
    }
  }

  // ---- summary + optional write -----------------------------------------
  const totalAssignments = plans.reduce((sum, plan) => sum + plan.assignments.length, 0);
  const totalUnmatched = plans.reduce((sum, plan) => sum + plan.unmatched.length, 0);
  const totalExisting = plans.reduce((sum, plan) => sum + plan.existingFilled, 0);
  console.log(`\n=== TOTAL ===`);
  console.log(`existing filled: ${totalExisting}`);
  console.log(`would fill: ${totalAssignments}`);
  console.log(`left blank: ${totalUnmatched}`);

  // Cross-quiz consistency: same person, same name key, different phones?
  const phoneByKey = new Map<string, Set<string>>();
  plans.forEach((plan) => {
    plan.assignments.forEach((assignment) => {
      const key = variantKey(assignment.name);
      const set = phoneByKey.get(key) ?? new Set<string>();
      set.add(assignment.registration.e164 ?? assignment.phone);
      phoneByKey.set(key, set);
    });
  });
  const inconsistent = Array.from(phoneByKey.entries()).filter(([, phones]) => phones.size > 1);
  if (inconsistent.length > 0) {
    console.log(`\nWARNING: ${inconsistent.length} name keys received different phones across quizzes:`);
    inconsistent.slice(0, 20).forEach(([key]) => console.log(`  - ${key}`));
  }

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to write these numbers into the sheets.");
    return;
  }

  for (const plan of plans) {
    if (plan.assignments.length === 0 && !plan.columnCreated) {
      console.log(`\n${plan.quizName}: nothing to write`);
      continue;
    }

    const column = columnLetter(plan.columnIndex);
    if (plan.columnCreated) {
      const values = [[PHONE_COLUMN_HEADER], ...plan.columnValues.map((value) => [value])];
      await updateSheetRange(
        plan.spreadsheetId,
        plan.tabTitle,
        `${column}1:${column}${plan.totalRows + 1}`,
        values,
      );
      console.log(
        `\n${plan.quizName}: added column ${column} (${PHONE_COLUMN_HEADER}) with ${plan.assignments.length} numbers`,
      );
    } else if (plan.assignments.length > 0) {
      await updateSheetRange(
        plan.spreadsheetId,
        plan.tabTitle,
        `${column}2:${column}${plan.totalRows + 1}`,
        plan.columnValues.map((value) => [value]),
      );
      console.log(`${plan.quizName}: wrote ${plan.assignments.length} numbers into existing column ${column}`);
    }
  }

  console.log("\nDone. Sheets updated.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
