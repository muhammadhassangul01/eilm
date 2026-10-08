# E-ILM-ACADEMY portal

This project serves as the academy website and live student/quiz tracking portal.

## Local development

```bash
npm install
npm run dev -- --hostname 0.0.0.0
```

Then open:

- http://localhost:3000

## Required environment variables

Create a local `.env.local` file based on `.env.example` and fill in the real values.

```bash
cp .env.example .env.local
```

Required values:

- `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `REGISTRATION_SHEET_ID` and `REGISTRATION_TAB_ID`
- `ADMIN_PASSWORD`

The service account needs viewer access on the registration sheet and every quiz
response sheet, plus editor access on the quiz registry tab (it defaults to a tab
named `Quizzes` inside the registration spreadsheet, created on first use).

The app reads all sheets server-side so student data never reaches the browser.

## Quiz registry

Quizzes are managed live from `/admin` → **Quiz registry**. Paste:

1. a quiz title
2. the Google Form link students should open
3. the response sheet link, e.g.
   `https://docs.google.com/spreadsheets/d/ID/edit?gid=1144510736`

The spreadsheet id and tab gid are parsed from the link, the row is written to the
registry tab, and every request reads that tab again — no redeploy when a new quiz
is added. Registry columns: `Title | Form Link | Response Sheet URL | Tab gid | Enabled`.

Fallbacks are used only while the registry tab is empty (in this order):
`QUIZ_REGISTRY_JSON` → numbered `QUIZ_1_*` variables → legacy `QUIZ_SHEET_ID`.

## Student login rules

- Phone numbers are normalised to E.164, default country Pakistan, with UK and
  Germany selectable (typed `+92` / `44` / `0049` codes are also understood).
- One registration matches the number → log in.
- Several registrations share the number → the exact registered name is required.
- No match → rejected.
- Quiz responses follow the same rule: a response on a shared number is only
  credited when the submitted name uniquely identifies one registration, so a
  response is never counted for two students.

## Checks

```bash
npm run verify   # phone normalisation, login matching, sheet URL parsing, registry rows
npm run lint
npm run build
```

`npm run verify` runs offline. For a full UI check without Google credentials, point
the app at local JSON fixtures:

```bash
SHEET_FIXTURE_DIR=./fixtures npm run dev
```

Fixture files are named `<spreadsheetId>.json` and hold
`{ "tabs": [{ "title", "gid", "rows": [[]] }] }`. Never set this in production.

## Admin export

The protected admin dashboard exposes a JSON export of the live records
(`/api/admin/export?type=json`). CSV export was removed on request.

## Production build

```bash
npm run build
npm start
```
# eilm
