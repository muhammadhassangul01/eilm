import { parsePhoneNumber, type CountryCode } from "libphonenumber-js/max";
import { cacheLife, cacheTag } from "next/cache";

import { readSheetRows } from "@/lib/google-sheets";
import { INVISIBLE_CHARACTERS, normalizeHeaderValue, normalizeName, normalizeText } from "@/lib/normalize";
import {
  getEnabledQuizzes,
  getEnvQuizDefinitions,
  type QuizDefinition,
  type QuizSource,
} from "@/lib/quiz-config";
import { readRegistryQuizzes } from "@/lib/quiz-registry";

export type RegistrationStatus = "completed" | "pending" | "review_required";
export type QuizMatchStatus = "matched" | "duplicate_registration" | "not_registered" | "invalid_phone";

export type RegistrationRecord = {
  id: string;
  rowIndex: number;
  name: string;
  number: string;
  oldNumber: string;
  phoneNumbers: string[];
  normalizedName: string;
  reviewReasons: string[];
  status: RegistrationStatus;
  matchedSubmissionIds: string[];
  latestSubmissionTimestamp?: string;
  latestScore?: string;
};

export type QuizSubmission = {
  rowIndex: number;
  timestamp: string;
  score: string;
  name: string;
  phone: string;
  normalizedPhone: string | null;
  matchStatus: QuizMatchStatus;
  matchedRegistrationIds: string[];
  quizId: string;
  quizName: string;
};

export type PortalMetrics = {
  totalRegistrationRows: number;
  totalQuizSubmissions: number;
  uniqueCompletedStudents: number;
  pendingStudents: number;
  registrationsRequiringReview: number;
  unmatchedSubmissions: number;
  invalidSubmissions: number;
  repeatedSubmissionNumbers: number;
};

export type PortalSnapshot = {
  registrations: RegistrationRecord[];
  submissions: QuizSubmission[];
  metrics: PortalMetrics;
  quizDefinitions: QuizDefinition[];
  registrySource: QuizSource | "none";
  warnings: string[];
  error?: string;
};

const EMPTY_METRICS: PortalMetrics = {
  totalRegistrationRows: 0,
  totalQuizSubmissions: 0,
  uniqueCompletedStudents: 0,
  pendingStudents: 0,
  registrationsRequiringReview: 0,
  unmatchedSubmissions: 0,
  invalidSubmissions: 0,
  repeatedSubmissionNumbers: 0,
};

// Shared by every portal/admin/export read. Invalidated from server actions
// after a registry mutation so an admin always sees their own change.
//
// `revalidate` keeps the snapshot at most a minute old (Next serves the cached
// copy and refreshes it in the background). `expire` is deliberately long: it
// is the hard cutoff, and once it passes with no traffic the next request has
// to regenerate synchronously, which costs a full Google Sheets round trip.
const PORTAL_CACHE_TAG = "portal";
const PORTAL_CACHE_LIFE = {
  stale: 300,
  revalidate: 60,
  expire: 604800,
} as const;

const SUPPORTED_COUNTRIES = new Set(["PK", "GB", "DE"]);
const DIAL_CODE_TO_COUNTRY: Record<string, string> = {
  "92": "PK",
  "44": "GB",
  "49": "DE",
};

export function resolveCountryCode(rawCountryCode: unknown): string {
  const raw = normalizeText(rawCountryCode).toUpperCase().replace(/^\+/, "").replace(/^00/, "");
  if (!raw) {
    return "PK";
  }

  if (/^[A-Z]{2}$/.test(raw)) {
    return SUPPORTED_COUNTRIES.has(raw) ? raw : "PK";
  }

  if (/^\d{1,3}$/.test(raw)) {
    return DIAL_CODE_TO_COUNTRY[raw] ?? "PK";
  }

  return "PK";
}

function normalizeHeaderAlias(key: string): string {
  return normalizeHeaderValue(key);
}

export function normalizeE164(rawValue: unknown, defaultCountry = "PK"): string | null {
  const cleaned = String(rawValue ?? "")
    .replace(INVISIBLE_CHARACTERS, "")
    .replace(/[\s()\-]/g, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  const trimmed = cleaned.replace(/^00/, "+");
  if (!trimmed || trimmed === "+") {
    return null;
  }

  try {
    const candidate = trimmed.startsWith("+") ? trimmed : `${trimmed}`;
    const parsed = parsePhoneNumber(candidate, defaultCountry as CountryCode);
    if (!parsed || !parsed.isValid()) {
      const fallback = parsePhoneNumber(
        candidate.startsWith("+") ? candidate : `+${candidate}`,
        "US" as CountryCode,
      );
      if (!fallback || !fallback.isValid()) {
        return null;
      }
      return fallback.number;
    }
    return parsed.number;
  } catch {
    return null;
  }
}

function valueByAliases(row: string[], aliases: string[], headerLookup: Map<string, number>): string {
  for (const alias of aliases) {
    const index = headerLookup.get(normalizeHeaderAlias(alias));
    if (index !== undefined && row[index] !== undefined) {
      return row[index] ?? "";
    }
  }

  return "";
}

function buildHeaderLookup(headers: string[]): Map<string, number> {
  const lookup = new Map<string, number>();

  headers.forEach((header, index) => {
    const normalized = normalizeHeaderAlias(header);
    if (normalized) {
      lookup.set(normalized, index);
    }
  });

  return lookup;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to load tracking data.";
}

const SHEET_TIMESTAMP_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/;

export function parseSubmissionTimestamp(value: string): number {
  const text = normalizeText(value);
  if (!text) {
    return 0;
  }

  const match = SHEET_TIMESTAMP_PATTERN.exec(text);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    // Sheets in this project record day-first timestamps; fall back to month-first
    // only when the second component cannot be a month.
    const dayFirst = first > 12 ? true : second > 12 ? false : true;
    const date = new Date(
      Number(match[3]),
      (dayFirst ? second : first) - 1,
      dayFirst ? first : second,
      Number(match[4] ?? 0),
      Number(match[5] ?? 0),
      Number(match[6] ?? 0),
    );
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function compareSubmissionTimestamps(a: string, b: string): number {
  return parseSubmissionTimestamp(b) - parseSubmissionTimestamp(a);
}

function createRegistrationData(rows: string[][]): RegistrationRecord[] {
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0];
  const headerLookup = buildHeaderLookup(headers);

  const registrations: RegistrationRecord[] = rows.slice(1).map((row, index) => {
    const idRaw = valueByAliases(row, ["ID", "id", "Student ID", "StudentID", "studentid"], headerLookup);
    const nameRaw = valueByAliases(row, ["Name", "name", "Student Name", "نام", "StudentName"], headerLookup);
    const numberRaw = valueByAliases(row, ["Number", "number", "Mobile Number", "Phone Number", "Phone", "Mobile"], headerLookup);
    const oldNumberRaw = valueByAliases(row, ["Old Number", "OldNumber", "Old Phone", "OldPhone", "Previous Number"], headerLookup);

    const number = normalizeE164(numberRaw, "PK") || "";
    const oldNumber = normalizeE164(oldNumberRaw, "PK") || "";
    const phoneNumbers = Array.from(new Set([number, oldNumber].filter(Boolean)));

    return {
      id: normalizeText(idRaw) || `registration-${index + 2}`,
      rowIndex: index + 2,
      name: normalizeText(nameRaw),
      number: normalizeText(numberRaw),
      oldNumber: normalizeText(oldNumberRaw),
      phoneNumbers,
      normalizedName: normalizeName(nameRaw),
      reviewReasons: [],
      status: "pending" as RegistrationStatus,
      matchedSubmissionIds: [],
    };
  });

  const phoneMap = new Map<string, RegistrationRecord[]>();
  registrations.forEach((registration) => {
    registration.phoneNumbers.forEach((phone) => {
      if (!phone) {
        return;
      }

      const existing = phoneMap.get(phone) ?? [];
      existing.push(registration);
      phoneMap.set(phone, existing);
    });
  });

  registrations.forEach((registration) => {
    const duplicates = registration.phoneNumbers.filter(
      (phone) => (phoneMap.get(phone)?.length ?? 0) > 1,
    );
    if (duplicates.length > 0) {
      registration.reviewReasons.push(`shared_phone:${duplicates.join(",")}`);
    }

    if (registration.phoneNumbers.length === 0) {
      registration.reviewReasons.push("missing_valid_phone");
    }

    if (registration.number && registration.oldNumber && registration.number !== registration.oldNumber) {
      const numberWithIssue = registration.phoneNumbers.some(
        (phone) => (phoneMap.get(phone)?.length ?? 0) > 1,
      );
      if (numberWithIssue) {
        registration.reviewReasons.push("conflicting_numbers");
      }
    }
  });

  return registrations;
}

function createQuizSubmissions(
  rows: string[][],
  registrations: RegistrationRecord[],
  quizDefinition: QuizDefinition,
): QuizSubmission[] {
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0];
  const headerLookup = buildHeaderLookup(headers);
  const registrationPhones = new Map<string, RegistrationRecord[]>();

  registrations.forEach((registration) => {
    registration.phoneNumbers.forEach((phone) => {
      const current = registrationPhones.get(phone) ?? [];
      current.push(registration);
      registrationPhones.set(phone, current);
    });
  });

  return rows.slice(1).map((row, index) => {
    const phoneValue = valueByAliases(
      row,
      [
        "واٹس ایپ نمبر",
        "واتس ایپ نمبر",
        "WhatsApp Number",
        "Whatsapp Number",
        "Phone Number",
        "Number",
        "Mobile Number",
        "Mobile",
      ],
      headerLookup,
    );
    const nameValue = valueByAliases(row, ["نام", "Name", "Student Name", "name"], headerLookup);
    const timestampValue = valueByAliases(row, ["Timestamp", "timestamp", "Date", "date"], headerLookup);
    const scoreValue = valueByAliases(row, ["Score", "score", "اسکور"], headerLookup);

    const normalizedPhone = normalizeE164(phoneValue, "PK");
    const allCandidates = normalizedPhone ? registrationPhones.get(normalizedPhone) ?? [] : [];
    const respondentName = normalizeName(nameValue);

    const nameMatches = respondentName
      ? allCandidates.filter((candidate) => candidate.normalizedName === respondentName)
      : [];

    const resolvedCandidates =
      allCandidates.length > 1 && nameMatches.length === 1 ? nameMatches : allCandidates;

    const matchStatus: QuizMatchStatus = !normalizedPhone
      ? "invalid_phone"
      : allCandidates.length === 0
        ? "not_registered"
        : resolvedCandidates.length === 1
          ? "matched"
          : "duplicate_registration";

    const matchedRegistrationIds =
      matchStatus === "matched" ? resolvedCandidates.map((candidate) => candidate.id) : [];

    return {
      rowIndex: index + 2,
      timestamp: normalizeText(timestampValue),
      score: normalizeText(scoreValue),
      name: normalizeText(nameValue),
      phone: normalizeText(phoneValue),
      normalizedPhone,
      matchStatus,
      matchedRegistrationIds,
      quizId: quizDefinition.id,
      quizName: quizDefinition.name,
    };
  });
}

async function loadQuizDefinitions(warnings: string[]): Promise<{
  quizzes: QuizDefinition[];
  registrySource: QuizSource | "none";
}> {
  const hasRegistryConfig = Boolean(
    process.env.QUIZ_REGISTRY_SHEET_ID || process.env.REGISTRATION_SHEET_ID,
  );

  if (hasRegistryConfig) {
    try {
      const { entries, problems } = await readRegistryQuizzes();
      warnings.push(...problems);

      if (entries.length > 0) {
        return { quizzes: entries, registrySource: "registry" };
      }

      warnings.push(
        `No quizzes found in the registry tab. Add one from the admin panel, or configure QUIZ_REGISTRY_JSON.`,
      );
    } catch (error) {
      warnings.push(`Quiz registry sheet could not be read: ${messageOf(error)}`);
    }
  }

  const fromEnv = getEnvQuizDefinitions();
  if (fromEnv.length > 0) {
    return { quizzes: fromEnv, registrySource: fromEnv[0].source };
  }

  if (warnings.length === 0) {
    warnings.push("No quizzes are configured yet. Add one from the admin panel.");
  }

  return { quizzes: [], registrySource: "none" };
}

// The sheet read itself. Not `"use cache"`: a cached function nested inside
// another cached one is re-resolved while the outer payload is deserialized,
// and Next regenerates a stale *nested* entry in the foreground — which blocks
// the very request that would otherwise be served from the outer stale copy.
// Only top-level entries get serve-stale + background revalidation.
async function readRegistrations(): Promise<RegistrationRecord[]> {
  const registrationSheetId = process.env.REGISTRATION_SHEET_ID;
  const registrationTabId = process.env.REGISTRATION_TAB_ID ?? "0";

  if (!registrationSheetId) {
    throw new Error(
      "Missing Google Sheets environment variables: set REGISTRATION_SHEET_ID and REGISTRATION_TAB_ID.",
    );
  }

  const rows = await readSheetRows(registrationSheetId, registrationTabId);
  return createRegistrationData(rows);
}

async function loadRegistrations(): Promise<RegistrationRecord[]> {
  "use cache";
  cacheLife(PORTAL_CACHE_LIFE);
  cacheTag(PORTAL_CACHE_TAG);

  return readRegistrations();
}

// Login only needs the registration sheet, not every quiz response sheet.
export async function getRegistrations(): Promise<{
  registrations: RegistrationRecord[];
  error?: string;
}> {
  try {
    return { registrations: await loadRegistrations() };
  } catch (error) {
    return { registrations: [], error: messageOf(error) };
  }
}

async function loadPortalSnapshot(): Promise<PortalSnapshot> {
  "use cache";
  cacheLife(PORTAL_CACHE_LIFE);
  cacheTag(PORTAL_CACHE_TAG);

  const warnings: string[] = [];

  // The quiz registry and the registration sheet do not depend on each other,
  // so read them together instead of one after the other.
  const [{ quizzes, registrySource }, registrations] = await Promise.all([
    loadQuizDefinitions(warnings),
    readRegistrations(),
  ]);
  const activeQuizzes = getEnabledQuizzes(quizzes);

  const quizResults = await Promise.all(
    activeQuizzes.map(async (quiz) => {
      if (!quiz.responseSheetId || !quiz.tabId) {
        if (quiz.formUrl) {
          warnings.push(`"${quiz.name}" has no response sheet configured yet.`);
        } else {
          warnings.push(`"${quiz.name}" has no response sheet or form link configured yet.`);
        }
        return [] as QuizSubmission[];
      }

      try {
        const rows = await readSheetRows(quiz.responseSheetId, quiz.tabId);
        return createQuizSubmissions(rows, registrations, quiz);
      } catch (error) {
        warnings.push(`Responses for "${quiz.name}" could not be read: ${messageOf(error)}`);
        return [] as QuizSubmission[];
      }
    }),
  );

  const submissions = quizResults.flat();

  const matchedSubmissions = submissions.filter((submission) => submission.matchStatus === "matched");
  const studentCompletedMap = new Map<string, QuizSubmission[]>();

  matchedSubmissions.forEach((submission) => {
    submission.matchedRegistrationIds.forEach((studentId) => {
      const bucket = studentCompletedMap.get(studentId) ?? [];
      bucket.push(submission);
      studentCompletedMap.set(studentId, bucket);
    });
  });

  registrations.forEach((registration) => {
    const completedMatches = studentCompletedMap.get(registration.id) ?? [];
    if (completedMatches.length > 0) {
      registration.status = "completed";
      registration.matchedSubmissionIds = completedMatches.map(
        (submission) => `${submission.quizId}:${submission.rowIndex}`,
      );
      const latest = completedMatches
        .filter((submission) => submission.timestamp)
        .sort((a, b) => compareSubmissionTimestamps(a.timestamp, b.timestamp))[0];

      registration.latestSubmissionTimestamp = latest?.timestamp || undefined;
      registration.latestScore = latest?.score || undefined;
    } else if (registration.reviewReasons.length > 0) {
      registration.status = "review_required";
    } else {
      registration.status = "pending";
    }
  });

  const repeatedSubmissionNumbers = Array.from(
    submissions.reduce((accumulator, submission) => {
      if (!submission.normalizedPhone) {
        return accumulator;
      }

      accumulator.set(submission.normalizedPhone, (accumulator.get(submission.normalizedPhone) ?? 0) + 1);
      return accumulator;
    }, new Map<string, number>()).values(),
  ).filter((count) => count > 1).length;

  const metrics: PortalMetrics = {
    totalRegistrationRows: registrations.length,
    totalQuizSubmissions: submissions.length,
    uniqueCompletedStudents: new Set(
      matchedSubmissions.flatMap((submission) => submission.matchedRegistrationIds),
    ).size,
    pendingStudents: registrations.filter((registration) => registration.status === "pending").length,
    registrationsRequiringReview: registrations.filter(
      (registration) => registration.status === "review_required",
    ).length,
    unmatchedSubmissions: submissions.filter((submission) => submission.matchStatus === "not_registered")
      .length,
    invalidSubmissions: submissions.filter((submission) => submission.matchStatus === "invalid_phone")
      .length,
    repeatedSubmissionNumbers,
  };

  return {
    registrations,
    submissions,
    metrics,
    quizDefinitions: quizzes,
    registrySource,
    warnings,
  };
}

// Uncached wrapper: a Google Sheets failure must never be frozen into the
// cache, so it is turned into a fresh error snapshot on every request.
export async function getPortalSnapshot(): Promise<PortalSnapshot> {
  try {
    return await loadPortalSnapshot();
  } catch (error) {
    return {
      registrations: [],
      submissions: [],
      metrics: EMPTY_METRICS,
      quizDefinitions: [],
      registrySource: "none",
      warnings: [],
      error: messageOf(error),
    };
  }
}

export function buildCompletedQuizMap(submissions: QuizSubmission[]): Map<string, Set<string>> {
  const completed = new Map<string, Set<string>>();

  submissions.forEach((submission) => {
    if (submission.matchStatus !== "matched") {
      return;
    }

    submission.matchedRegistrationIds.forEach((registrationId) => {
      const entry = completed.get(registrationId) ?? new Set<string>();
      entry.add(submission.quizId);
      completed.set(registrationId, entry);
    });
  });

  return completed;
}

export function matchStudentLogin(
  registrations: RegistrationRecord[],
  { name, number, countryCode }: { name: string; number: string; countryCode: string },
): { ok: true; student: RegistrationRecord } | { ok: false; reason: string } {
  const cleanedName = normalizeName(name);
  const normalizedNumber = normalizeE164(number, resolveCountryCode(countryCode));

  if (!normalizedNumber) {
    return { ok: false, reason: "Please enter a valid phone number." };
  }

  const candidates = registrations.filter((registration) =>
    registration.phoneNumbers.includes(normalizedNumber),
  );

  if (candidates.length === 1) {
    return { ok: true, student: candidates[0] };
  }

  if (candidates.length > 1) {
    const byName = candidates.filter((candidate) => normalizeName(candidate.name) === cleanedName);
    if (byName.length === 1) {
      return { ok: true, student: byName[0] };
    }

    if (byName.length > 1) {
      return {
        ok: false,
        reason:
          "More than one student is registered with this phone number and name. Please contact the institute.",
      };
    }

    return {
      ok: false,
      reason: "More than one student matches this phone number. Please enter the exact name as in registration.",
    };
  }

  return { ok: false, reason: "No student record matches this phone number." };
}
