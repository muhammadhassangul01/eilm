import {
  compareSubmissionTimestamps,
  matchStudentLogin,
  normalizeE164,
  parseSubmissionTimestamp,
  resolveCountryCode,
  type RegistrationRecord,
} from "../lib/student-data";
import {
  getEnabledQuizzes,
  getEnvQuizDefinitions,
  parseGoogleSheetUrl,
  parseRegistryRows,
} from "../lib/quiz-config";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function equal(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
  }
}

[
  "QUIZ_REGISTRY_JSON",
  "QUIZ_REGISTRY",
  "QUIZ_SHEET_ID",
  "QUIZ_TAB_ID",
  "QUIZ_NAME",
  "QUIZ_FORM_URL",
  "QUIZ_1_NAME",
  "QUIZ_1_FORM_URL",
  "QUIZ_1_SHEET_ID",
  "QUIZ_1_TAB_ID",
  "QUIZ_2_NAME",
  "QUIZ_2_FORM_URL",
  "QUIZ_2_SHEET_ID",
  "QUIZ_2_TAB_ID",
].forEach((key) => {
  delete process.env[key];
});

// --- Phone normalisation -------------------------------------------------

equal(normalizeE164("03001234567", "PK"), "+923001234567", "Pakistan local number");
equal(normalizeE164("0300-1234567", "PK"), "+923001234567", "Dashed Pakistan number");
equal(normalizeE164("+92 300 1234567", "PK"), "+923001234567", "Spaced international Pakistan number");
equal(normalizeE164("00923001234567", "PK"), "+923001234567", "00 prefixed Pakistan number");
equal(normalizeE164("923001234567", "PK"), "+923001234567", "Country code without plus");
equal(normalizeE164("+447123456789", "GB"), "+447123456789", "UK number");
equal(normalizeE164("0044 71234 56789", "GB"), "+447123456789", "UK number with 00 prefix");
equal(normalizeE164("+4915112345678", "DE"), "+4915112345678", "Germany number");
equal(normalizeE164("0049 1511 2345678", "DE"), "+4915112345678", "Germany number with 00 prefix");
equal(normalizeE164("(0300) 123-4567", "PK"), "+923001234567", "Parenthesised number");
equal(normalizeE164("+\u200E923001234567", "PK"), "+923001234567", "Left-to-right mark is stripped");
equal(normalizeE164("\u061C+923001234567", "PK"), "+923001234567", "Arabic letter mark is stripped");
equal(normalizeE164("", "PK"), null, "Empty number is rejected");
equal(normalizeE164("not-a-number", "PK"), null, "Garbage number is rejected");

// --- Country code resolution --------------------------------------------

equal(resolveCountryCode("PK"), "PK", "PK stays PK");
equal(resolveCountryCode("GB"), "GB", "GB stays GB");
equal(resolveCountryCode("DE"), "DE", "DE stays DE");
equal(resolveCountryCode("+92"), "PK", "+92 resolves to PK");
equal(resolveCountryCode("92"), "PK", "92 resolves to PK");
equal(resolveCountryCode("44"), "GB", "44 resolves to GB");
equal(resolveCountryCode("49"), "DE", "49 resolves to DE");
equal(resolveCountryCode("0044"), "GB", "0044 resolves to GB");
equal(resolveCountryCode(""), "PK", "Empty country defaults to Pakistan");
equal(resolveCountryCode("??"), "PK", "Unknown country defaults to Pakistan");
equal(
  normalizeE164("03001234567", resolveCountryCode("+92")),
  "+923001234567",
  "Typed +92 country still normalises the local number",
);

// --- Login matching ------------------------------------------------------

const registrations: RegistrationRecord[] = [
  {
    id: "r-1",
    rowIndex: 2,
    name: "Ali Khan",
    number: "03001234567",
    oldNumber: "",
    phoneNumbers: ["+923001234567"],
    normalizedName: "ali khan",
    reviewReasons: [],
    status: "pending",
    matchedSubmissionIds: [],
  },
  {
    id: "r-2",
    rowIndex: 3,
    name: "Ahmad Ali",
    number: "03001234567",
    oldNumber: "",
    phoneNumbers: ["+923001234567"],
    normalizedName: "ahmad ali",
    reviewReasons: ["shared_phone:+923001234567"],
    status: "review_required",
    matchedSubmissionIds: [],
  },
  {
    id: "r-3",
    rowIndex: 4,
    name: "Fatima Noor",
    number: "+447123456789",
    oldNumber: "",
    phoneNumbers: ["+447123456789"],
    normalizedName: "fatima noor",
    reviewReasons: [],
    status: "pending",
    matchedSubmissionIds: [],
  },
  {
    id: "r-4",
    rowIndex: 5,
    name: "Ali Khan",
    number: "+4915112345678",
    oldNumber: "",
    phoneNumbers: ["+4915112345678"],
    normalizedName: "ali khan",
    reviewReasons: [],
    status: "pending",
    matchedSubmissionIds: [],
  },
];

const uniquePhone = matchStudentLogin(registrations, {
  name: "Anyone",
  number: "+447123456789",
  countryCode: "GB",
});
assert(uniquePhone.ok && uniquePhone.student.id === "r-3", "A single phone match logs in without a name check");

const sharedPhoneExactName = matchStudentLogin(registrations, {
  name: "Ali Khan",
  number: "03001234567",
  countryCode: "PK",
});
assert(
  sharedPhoneExactName.ok && sharedPhoneExactName.student.id === "r-1",
  "Shared phone with the exact registered name logs in",
);

const sharedPhoneWrongName = matchStudentLogin(registrations, {
  name: "Someone Else",
  number: "03001234567",
  countryCode: "PK",
});
assert(
  !sharedPhoneWrongName.ok && sharedPhoneWrongName.reason.includes("More than one student"),
  "Shared phone without the exact name is rejected",
);

const noMatch = matchStudentLogin(registrations, {
  name: "Ali Khan",
  number: "03009999999",
  countryCode: "PK",
});
assert(!noMatch.ok && noMatch.reason.includes("No student record"), "An unknown number is rejected");

const invalidNumber = matchStudentLogin(registrations, {
  name: "Ali Khan",
  number: "abc",
  countryCode: "PK",
});
assert(!invalidNumber.ok && invalidNumber.reason.includes("valid phone number"), "Garbage input is rejected");

const duplicateNames = [...registrations, { ...registrations[3], id: "r-5", rowIndex: 6 }];
const ambiguousNames = matchStudentLogin(duplicateNames, {
  name: "Ali Khan",
  number: "+4915112345678",
  countryCode: "DE",
});
assert(
  !ambiguousNames.ok && ambiguousNames.reason.includes("contact the institute"),
  "Two identical names on one phone stay ambiguous",
);

const oldNumberLogin = matchStudentLogin(
  [{ ...registrations[2], oldNumber: "03001234567", phoneNumbers: ["+447123456789", "+923001234567"] }],
  { name: "Fatima Noor", number: "03001234567", countryCode: "PK" },
);
assert(oldNumberLogin.ok, "An old number still logs in");

// --- Repeated submissions ------------------------------------------------

const repeatedNumbers = [
  "+923001234567",
  "+923001234567",
  "+447123456789",
  "+447123456789",
  "+4915112345678",
];
const repeatedCounts = new Map<string, number>();
for (const number of repeatedNumbers) {
  repeatedCounts.set(number, (repeatedCounts.get(number) ?? 0) + 1);
}
const repeatedCount = Array.from(repeatedCounts.values()).filter((count) => count > 1).length;
equal(repeatedCount, 2, "Repeated numbers are counted per number, not per row");
equal(
  new Set(repeatedNumbers).size,
  3,
  "Repeated attempts stay multiple submissions while one student stays completed",
);

// --- Sheet URL parsing ---------------------------------------------------

const withGid = parseGoogleSheetUrl(
  "https://docs.google.com/spreadsheets/d/1GGyGbB5MhTWXIjAM4HUtl-wzm-l-pkLBlUopeexm_YY/edit?gid=1144510736#gid=1144510736",
);
equal(withGid?.spreadsheetId, "1GGyGbB5MhTWXIjAM4HUtl-wzm-l-pkLBlUopeexm_YY", "Spreadsheet id parsed");
equal(withGid?.gid, "1144510736", "gid parsed from the query string");

const hashGid = parseGoogleSheetUrl(
  "https://docs.google.com/spreadsheets/d/1HPDTi6CHd-RCcc0d4meYTF6iCwzGpOlsminWVr-rWAs/edit#gid=0",
);
equal(hashGid?.spreadsheetId, "1HPDTi6CHd-RCcc0d4meYTF6iCwzGpOlsminWVr-rWAs", "Spreadsheet id parsed from hash link");
equal(hashGid?.gid, "0", "gid parsed from the hash");

const noGid = parseGoogleSheetUrl(
  "https://docs.google.com/spreadsheets/d/1HPDTi6CHd-RCcc0d4meYTF6iCwzGpOlsminWVr-rWAs/edit",
);
equal(noGid?.gid, undefined, "A link without gid yields no gid");

const bare = parseGoogleSheetUrl("1HPDTi6CHd-RCcc0d4meYTF6iCwzGpOlsminWVr-rWAs");
equal(bare?.spreadsheetId, "1HPDTi6CHd-RCcc0d4meYTF6iCwzGpOlsminWVr-rWAs", "A bare id is accepted");

equal(parseGoogleSheetUrl("https://docs.google.com/forms/d/abc/edit"), null, "A form URL is rejected");
equal(parseGoogleSheetUrl("not a link"), null, "Garbage is rejected");
equal(parseGoogleSheetUrl(""), null, "Empty input is rejected");

// --- Registry rows -------------------------------------------------------

const registry = parseRegistryRows([
  ["Title", "Form Link", "Response Sheet URL", "Tab gid", "Enabled"],
  [
    "Quiz 37",
    "https://docs.google.com/forms/d/form-37",
    "https://docs.google.com/spreadsheets/d/1GGyGbB5MhTWXIjAM4HUtl-wzm-l-pkLBlUopeexm_YY/edit?gid=1144510736",
    "",
    "yes",
  ],
  [
    "Quiz 38",
    "https://docs.google.com/forms/d/form-38",
    "https://docs.google.com/spreadsheets/d/1HPDTi6CHd-RCcc0d4meYTF6iCwzGpOlsminWVr-rWAs/edit",
    "0",
    "no",
  ],
  ["", "", "https://docs.google.com/spreadsheets/d/1SomethingMissing/edit?gid=0", "", "yes"],
  ["Quiz 39", "", "definitely not a sheet link", "", ""],
  ["", "", "", "", ""],
]);

equal(registry.entries.length, 3, "Registry keeps titled rows and skips empty ones");
equal(registry.entries[0].name, "Quiz 37", "First registry title");
equal(registry.entries[0].tabId, "1144510736", "First registry gid comes from the link");
equal(registry.entries[0].enabled, true, "Enabled row stays enabled");
equal(registry.entries[1].enabled, false, "'no' disables a quiz");
equal(registry.entries[1].tabId, "0", "Tab gid column fills in a missing gid");
equal(registry.entries[0].source, "registry", "Registry rows are marked as registry sourced");
assert(
  registry.entries.some((entry) => entry.name === "Quiz 39"),
  "A row with an unreadable sheet link is kept so the form link still shows",
);
assert(registry.problems.length >= 2, "Missing titles and bad sheet links are reported");

equal(getEnabledQuizzes(registry.entries).length, 2, "Disabled quizzes are filtered out of the active list");

// --- Environment fallback -------------------------------------------------

equal(getEnvQuizDefinitions().length, 0, "No environment config means no phantom quiz");

process.env.QUIZ_SHEET_ID = "1GGyGbB5MhTWXIjAM4HUtl-wzm-l-pkLBlUopeexm_YY";
process.env.QUIZ_TAB_ID = "1144510736";
process.env.QUIZ_NAME = "Quiz 37";
const legacy = getEnvQuizDefinitions();
equal(legacy.length, 1, "Legacy single quiz config is reachable");
equal(legacy[0].source, "legacy", "Legacy config is marked as legacy");
equal(legacy[0].responseSheetId, "1GGyGbB5MhTWXIjAM4HUtl-wzm-l-pkLBlUopeexm_YY", "Legacy sheet id kept");
equal(legacy[0].tabId, "1144510736", "Legacy tab id kept");
delete process.env.QUIZ_SHEET_ID;
delete process.env.QUIZ_TAB_ID;
delete process.env.QUIZ_NAME;

process.env.QUIZ_REGISTRY_JSON = JSON.stringify([
  {
    name: "Quiz 37",
    formUrl: "https://docs.google.com/forms/d/form-37",
    responseSheetId: "1GGyGbB5MhTWXIjAM4HUtl-wzm-l-pkLBlUopeexm_YY",
    tabId: "1144510736",
  },
]);
const fromJson = getEnvQuizDefinitions();
equal(fromJson.length, 1, "JSON registry is used first");
equal(fromJson[0].name, "Quiz 37", "JSON registry title kept");
delete process.env.QUIZ_REGISTRY_JSON;

process.env.QUIZ_1_FORM_URL = "https://docs.google.com/forms/d/form-1";
process.env.QUIZ_1_NAME = "Quiz 1";
process.env.QUIZ_2_SHEET_ID = "1HPDTi6CHd-RCcc0d4meYTF6iCwzGpOlsminWVr-rWAs";
process.env.QUIZ_2_TAB_ID = "0";
const numbered = getEnvQuizDefinitions();
equal(numbered.length, 2, "Numbered env quizzes are read in order");
equal(numbered[0].name, "Quiz 1", "Numbered env name");
equal(numbered[1].tabId, "0", "Numbered env tab id");
delete process.env.QUIZ_1_FORM_URL;
delete process.env.QUIZ_1_NAME;
delete process.env.QUIZ_2_SHEET_ID;
delete process.env.QUIZ_2_TAB_ID;

// Timestamps recorded by the sheets are day-first ("06/10/2026 17:37:03").
const oct31 = parseSubmissionTimestamp("31/10/2026 10:00:00");
const nov05 = parseSubmissionTimestamp("05/11/2026 09:00:00");
assert(oct31 > 0, "Day-first timestamp parses to a real date");
assert(nov05 > oct31, "05/11/2026 is later than 31/10/2026 despite sorting first as text");
assert(
  compareSubmissionTimestamps("31/10/2026 10:00:00", "05/11/2026 09:00:00") > 0,
  "Timestamp comparator puts the newer timestamp first",
);
assert(
  parseSubmissionTimestamp("01/13/2026 09:00:00") > 0,
  "Month-first timestamps still parse when the second component cannot be a month",
);
assert(parseSubmissionTimestamp("") === 0, "Empty timestamp parses to zero");
assert(
  parseSubmissionTimestamp("2026-10-06T17:37:03.000Z") > 0,
  "ISO timestamps fall back to Date.parse",
);
assert(
  parseSubmissionTimestamp("06/10/2026 17:37:03") > parseSubmissionTimestamp("06/10/2026 17:35:00"),
  "Same-day timestamps order by time",
);
const ordered = [
  { timestamp: "31/10/2026 10:00:00" },
  { timestamp: "05/11/2026 09:00:00" },
  { timestamp: "06/10/2026 17:37:03" },
].sort((a, b) => compareSubmissionTimestamps(a.timestamp, b.timestamp));
equal(
  ordered.map((entry) => entry.timestamp).join(" | "),
  "05/11/2026 09:00:00 | 31/10/2026 10:00:00 | 06/10/2026 17:37:03",
  "Sort order used by the dashboard is newest first",
);

console.log(
  "All checks passed: phone normalisation (PK/GB/DE), country codes, shared and missing numbers, repeated submissions, sheet URL parsing, registry rows, environment fallbacks, and timestamp ordering.",
);
