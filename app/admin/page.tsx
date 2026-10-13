import Link from "next/link";
import { Suspense } from "react";

import { DataLoading } from "@/components/data-loading";
import { handleAdminLogin, getAdminSession, logoutAdmin } from "@/lib/auth";
import { deleteQuizAction, toggleQuizAction, addQuizAction } from "@/lib/quiz-actions";
import { getEnabledQuizzes } from "@/lib/quiz-config";
import { buildCompletedQuizMap, compareSubmissionTimestamps, getPortalSnapshot } from "@/lib/student-data";

type AdminSearchParams = {
  search?: string | string[];
  quiz?: string | string[];
  error?: string | string[];
  added?: string | string[];
  updated?: string | string[];
  removed?: string | string[];
  section?: string | string[];
};

function first(value?: string | string[]): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default function AdminPage({ searchParams }: { searchParams?: Promise<AdminSearchParams> }) {
  return (
    <div className="min-h-[75vh] bg-[#F0F7FC]">
      <Suspense fallback={<DataLoading label="Loading admin dashboard" />}>
        <AdminPageContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminPageContent({ searchParams }: { searchParams?: Promise<AdminSearchParams> }) {
  const params = (await searchParams) ?? {};
  const searchQuery = first(params.search).trim();
  const selectedQuizId = first(params.quiz).trim();
  const errorMessage = first(params.error);
  const addedMessage = first(params.added);
  const updatedMessage = first(params.updated);
  const removedMessage = first(params.removed);

  const adminSession = await getAdminSession();

  if (!adminSession) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[#DCE8F4] bg-[#FFFFFF] p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#102B4E]">Admin access</p>
          <h1 className="mt-3 text-3xl font-bold text-[#102B4E]">Protected admin portal</h1>

          {errorMessage ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <form action={handleAdminLogin} className="mt-6 space-y-4">
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#102B4E]">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="w-full rounded-xl border border-[#DCE8F4] bg-white px-4 py-3 text-[#102B4E] outline-none ring-0 focus:border-[#102B4E]"
                placeholder="Enter admin password"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-[#102B4E] px-6 py-3 text-sm font-semibold text-[#FFFFFF]"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-[#DCE8F4] bg-[#FFFFFF] p-6 shadow-sm sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#102B4E]">Admin dashboard</p>
          <h1 className="mt-3 text-3xl font-bold text-[#102B4E]">Student and quiz tracking</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/admin/export?type=json"
            className="rounded-full border border-[#102B4E] bg-transparent px-4 py-2 text-sm font-semibold text-[#102B4E]"
          >
            Export JSON
          </a>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="rounded-full border border-[#102B4E] bg-transparent px-4 py-2 text-sm font-semibold text-[#102B4E]"
            >
              Log out
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 rounded-[2rem] border border-[#DCE8F4] bg-[#FFFFFF] p-5 shadow-sm">
        <form method="GET" className="flex flex-col gap-3 md:flex-row">
          {selectedQuizId ? <input type="hidden" name="quiz" value={selectedQuizId} /> : null}
          <input
            name="search"
            defaultValue={searchQuery}
            placeholder="Search by name, ID, number, status, quiz, or reason"
            className="w-full rounded-xl border border-[#DCE8F4] bg-white px-4 py-3 text-[#102B4E] outline-none focus:border-[#102B4E]"
          />
          <button type="submit" className="rounded-full bg-[#102B4E] px-5 py-3 text-sm font-semibold text-[#FFFFFF]">
            Search
          </button>
        </form>
      </div>

      <Suspense fallback={<DataLoading label="Loading dashboard data" />}>
        <AdminDashboard
          searchQuery={searchQuery}
          selectedQuizId={selectedQuizId}
          messages={{ errorMessage, addedMessage, updatedMessage, removedMessage }}
        />
      </Suspense>
    </div>
  );
}

// Behind its own boundary so the header and search box render before the
// sheet-backed tables stream in.
async function AdminDashboard({
  searchQuery,
  selectedQuizId,
  messages,
}: {
  searchQuery: string;
  selectedQuizId: string;
  messages: {
    errorMessage: string;
    addedMessage: string;
    updatedMessage: string;
    removedMessage: string;
  };
}) {
  const { errorMessage, addedMessage, updatedMessage, removedMessage } = messages;
  const snapshot = await getPortalSnapshot();

  if (snapshot.error) {
    return (
      <div className="mt-6 rounded-3xl border border-[#DCE8F4] bg-[#FFFFFF] p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#102B4E]">Data error</p>
        <h1 className="mt-3 text-3xl font-bold text-[#102B4E]">Unable to load student data.</h1>
        <p className="mt-4 text-sm leading-7 text-[#46607F]">{snapshot.error}</p>
      </div>
    );
  }

  const activeQuizzes = getEnabledQuizzes(snapshot.quizDefinitions);
  const selectedQuiz = selectedQuizId
    ? (activeQuizzes.find((quiz) => quiz.id === selectedQuizId) ??
      snapshot.quizDefinitions.find((quiz) => quiz.id === selectedQuizId) ??
      null)
    : null;

  const query = searchQuery.toLowerCase();
  const filterMatches = (value: string) => !query || value.toLowerCase().includes(query);

  const allStudents = snapshot.registrations.filter((student) =>
    [student.id, student.name, student.number, student.oldNumber, student.status, student.reviewReasons.join(" ")].some(
      (field) => filterMatches(field ?? ""),
    ),
  );

  const completedStudents = allStudents.filter((student) => student.status === "completed");
  const pendingStudents = allStudents.filter((student) => student.status === "pending");
  const reviewStudents = allStudents.filter((student) => student.status === "review_required");

  // Submissions in scope: one quiz when a quiz tab is selected, otherwise all.
  const scopedSubmissions = selectedQuiz
    ? snapshot.submissions.filter((submission) => submission.quizId === selectedQuiz.id)
    : snapshot.submissions;

  const submissionMatches = (submission: {
    name: string;
    phone: string;
    score: string;
    timestamp: string;
    quizName: string;
  }) =>
    [submission.name, submission.phone, submission.score, submission.timestamp, submission.quizName].some((field) =>
      filterMatches(field ?? ""),
    );

  const scopedSubmissionsShown = [...scopedSubmissions]
    .filter(submissionMatches)
    .sort((a, b) => compareSubmissionTimestamps(a.timestamp, b.timestamp));

  const unmatchedSubmissions = scopedSubmissions.filter(
    (submission) => submission.matchStatus === "not_registered" && submissionMatches(submission),
  );
  const invalidSubmissions = scopedSubmissions.filter(
    (submission) => submission.matchStatus === "invalid_phone" && submissionMatches(submission),
  );
  const duplicateSubmissions = scopedSubmissions.filter(
    (submission) => submission.matchStatus === "duplicate_registration" && submissionMatches(submission),
  );

  const scopedStats = {
    responses: scopedSubmissions.length,
    matched: scopedSubmissions.filter((submission) => submission.matchStatus === "matched").length,
    unmatched: scopedSubmissions.filter((submission) => submission.matchStatus === "not_registered").length,
    invalid: scopedSubmissions.filter((submission) => submission.matchStatus === "invalid_phone").length,
    ambiguous: scopedSubmissions.filter((submission) => submission.matchStatus === "duplicate_registration").length,
    students: new Set(
      scopedSubmissions.flatMap((submission) =>
        submission.matchStatus === "matched" ? submission.matchedRegistrationIds : [],
      ),
    ).size,
  };

  const conflictingRegistrations = allStudents.filter(
    (student) => student.reviewReasons.length > 0 && student.status !== "review_required",
  );

  const problemRows = new Map<string, { id: string; name: string; reasons: string; status: string }>();
  [...reviewStudents, ...conflictingRegistrations].forEach((student) => {
    problemRows.set(student.id, {
      id: student.id,
      name: student.name || "-",
      reasons: student.reviewReasons.join(", ") || "pending",
      status: student.status,
    });
  });

  const completedMap = buildCompletedQuizMap(snapshot.submissions);
  const matrixRows = allStudents;
  const registryQuizzes = snapshot.quizDefinitions.filter((quiz) => quiz.source === "registry");
  const envQuizzes = snapshot.quizDefinitions.filter((quiz) => quiz.source !== "registry");

  const submissionStats = new Map<string, { responses: number; matched: number }>();
  snapshot.submissions.forEach((submission) => {
    const stat = submissionStats.get(submission.quizId) ?? { responses: 0, matched: 0 };
    stat.responses += 1;
    if (submission.matchStatus === "matched") {
      stat.matched += 1;
    }
    submissionStats.set(submission.quizId, stat);
  });

  const adminHref = (quizId?: string) => {
    const search = new URLSearchParams();
    if (searchQuery) {
      search.set("search", searchQuery);
    }
    if (quizId) {
      search.set("quiz", quizId);
    }
    const qs = search.toString();
    return qs ? `/admin?${qs}` : "/admin";
  };

  const notices: Array<{ tone: "ok" | "warn"; text: string }> = [];
  if (addedMessage) {
    notices.push({ tone: "ok", text: `Quiz "${addedMessage}" was added to the registry.` });
  }
  if (updatedMessage) {
    notices.push({ tone: "ok", text: "The quiz registry was updated." });
  }
  if (removedMessage) {
    notices.push({ tone: "ok", text: "The quiz was removed from the registry." });
  }
  if (errorMessage) {
    notices.push({ tone: "warn", text: errorMessage });
  }
  snapshot.warnings.forEach((warning) => notices.push({ tone: "warn", text: warning }));

  return (
    <>
      {notices.length > 0 ? (
        <div className="mt-6 grid gap-3">
          {notices.map((notice, index) => (
            <div
              key={`notice-${index}-${notice.text}`}
              className={
                notice.tone === "ok"
                  ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
                  : "rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
              }
            >
              {notice.text}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#102B4E]">Quiz view:</span>
        <Link
          href={adminHref()}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            selectedQuiz
              ? "border border-[#DCE8F4] bg-transparent text-[#102B4E]"
              : "bg-[#102B4E] text-[#FFFFFF]"
          }`}
        >
          All quizzes
        </Link>
        {activeQuizzes.map((quiz) => {
          const isActive = selectedQuiz?.id === quiz.id;
          const stat = submissionStats.get(quiz.id);
          return (
            <Link
              key={`chip-${quiz.id}`}
              href={adminHref(quiz.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                isActive ? "bg-[#102B4E] text-[#FFFFFF]" : "border border-[#DCE8F4] bg-transparent text-[#102B4E]"
              }`}
            >
              {quiz.name}
              {stat ? <span className="ml-1.5 opacity-70">{stat.responses}</span> : null}
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Registration rows", value: snapshot.metrics.totalRegistrationRows },
          { label: "Quiz submissions", value: snapshot.metrics.totalQuizSubmissions },
          { label: "Completed students", value: snapshot.metrics.uniqueCompletedStudents },
          { label: "Pending students", value: snapshot.metrics.pendingStudents },
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-[#DCE8F4] bg-[#F0F7FC] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#102B4E]">{metric.label}</p>
            <p className="mt-3 text-2xl font-bold text-[#102B4E]">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Review required", value: snapshot.metrics.registrationsRequiringReview },
          { label: "Unmatched", value: snapshot.metrics.unmatchedSubmissions },
          { label: "Invalid phones", value: snapshot.metrics.invalidSubmissions },
          { label: "Repeated numbers", value: snapshot.metrics.repeatedSubmissionNumbers },
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-[#DCE8F4] bg-[#E7F2FB] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#102B4E]">{metric.label}</p>
            <p className="mt-3 text-2xl font-bold text-[#102B4E]">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 overflow-hidden rounded-[2rem] border border-[#DCE8F4] bg-[#FFFFFF]">
        <div className="flex flex-col gap-2 border-b border-[#DCE8F4] p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#102B4E]">
              {selectedQuiz ? `${selectedQuiz.name} submissions` : "Submissions"}
            </h2>
            <p className="mt-2 text-sm text-[#46607F]">
              {scopedStats.responses} response{scopedStats.responses === 1 ? "" : "s"} · {scopedStats.matched} matched ·{" "}
              {scopedStats.unmatched} unmatched · {scopedStats.invalid} invalid phones · {scopedStats.ambiguous} ambiguous ·{" "}
              {scopedStats.students} unique students
              {selectedQuiz ? (
                <>
                  {" "}
                  <Link href={adminHref()} className="font-semibold text-[#102B4E] underline">
                    show all quizzes
                  </Link>
                </>
              ) : (
                " · pick a quiz above to focus on one"
              )}
            </p>
          </div>
        </div>
        <div className="max-h-[32rem] overflow-auto">
          <table className="min-w-full text-left text-sm text-[#46607F]">
            <thead className="sticky top-0 bg-[#F0F7FC] text-[#102B4E]">
              <tr>
                {!selectedQuiz ? <th className="px-4 py-3 font-semibold">Quiz</th> : null}
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {scopedSubmissionsShown.length === 0 ? (
                <tr>
                  <td className="px-4 py-6" colSpan={selectedQuiz ? 5 : 6}>
                    No submissions match the current filter.
                  </td>
                </tr>
              ) : (
                scopedSubmissionsShown.map((submission) => (
                  <tr
                    key={`submission-row-${submission.quizId}-${submission.rowIndex}`}
                    className="border-t border-[#DCE8F4]"
                  >
                    {!selectedQuiz ? <td className="px-4 py-3">{submission.quizName}</td> : null}
                    <td className="whitespace-nowrap px-4 py-3">{submission.timestamp || "-"}</td>
                    <td className="px-4 py-3">{submission.name || "-"}</td>
                    <td className="px-4 py-3">{submission.phone || "-"}</td>
                    <td className="px-4 py-3">{submission.score || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          submission.matchStatus === "matched"
                            ? "font-semibold text-emerald-700"
                            : submission.matchStatus === "not_registered" || submission.matchStatus === "invalid_phone"
                              ? "font-semibold text-amber-700"
                              : undefined
                        }
                      >
                        {submission.matchStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <section id="registry" className="mt-10 overflow-hidden rounded-[2rem] border border-[#DCE8F4] bg-[#FFFFFF]">
        <div className="border-b border-[#DCE8F4] p-5">
          <h2 className="text-2xl font-semibold text-[#102B4E]">Quiz registry</h2>
          <p className="mt-2 text-sm leading-7 text-[#46607F]">
            Source:{" "}
            <span className="font-semibold text-[#102B4E]">
              {snapshot.registrySource === "registry"
                ? "Google Sheet tab (read live on every request)"
                : snapshot.registrySource === "none"
                  ? "not configured"
                  : "environment variables"}
            </span>
            . Paste a results sheet link to add a quiz.
          </p>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-x-auto rounded-2xl border border-[#DCE8F4] bg-[#F8FBFE]">
            <table className="min-w-full text-left text-sm text-[#46607F]">
              <thead className="bg-[#F0F7FC] text-[#102B4E]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Form</th>
                  <th className="px-4 py-3 font-semibold">Sheet</th>
                  <th className="px-4 py-3 font-semibold">Responses</th>
                  <th className="px-4 py-3 font-semibold">Matched</th>
                  <th className="px-4 py-3 font-semibold">Enabled</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.quizDefinitions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-[#46607F]">
                      No quizzes configured yet. Add the first one on the right.
                    </td>
                  </tr>
                ) : (
                  snapshot.quizDefinitions.map((quiz) => {
                    const stat = submissionStats.get(quiz.id);
                    return (
                    <tr key={quiz.id} className="border-t border-[#DCE8F4]">
                      <td className="px-4 py-3">
                        <Link href={adminHref(quiz.id)} className="font-semibold text-[#102B4E] underline-offset-2 hover:underline">
                          {quiz.name}
                        </Link>
                        <span className="ml-2 text-xs uppercase tracking-[0.12em] text-[#102B4E]">{quiz.source}</span>
                      </td>
                      <td className="px-4 py-3">
                        {quiz.formUrl ? (
                          <a
                            href={quiz.formUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#102B4E] underline"
                          >
                            open
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {quiz.responseSheetId ? (
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${quiz.responseSheetId}/edit${
                              quiz.tabId ? `?gid=${quiz.tabId}` : ""
                            }`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#102B4E] underline"
                          >
                            sheet
                          </a>
                        ) : (
                          "not linked"
                        )}
                      </td>
                      <td className="px-4 py-3">{stat?.responses ?? 0}</td>
                      <td className="px-4 py-3">
                        {stat ? (
                          <span className={stat.matched === stat.responses ? "font-semibold text-emerald-700" : undefined}>
                            {stat.matched}
                          </span>
                        ) : (
                          0
                        )}
                      </td>
                      <td className="px-4 py-3">{quiz.enabled ? "yes" : "no"}</td>
                      <td className="px-4 py-3">
                        {quiz.source === "registry" && quiz.registryRow ? (
                          <div className="flex flex-wrap gap-2">
                            <form action={toggleQuizAction}>
                              <input type="hidden" name="row" value={quiz.registryRow} />
                              <input type="hidden" name="enabled" value={quiz.enabled ? "false" : "true"} />
                              <button
                                type="submit"
                                className="rounded-full border border-[#102B4E] px-3 py-1 text-xs font-semibold text-[#102B4E]"
                              >
                                {quiz.enabled ? "Disable" : "Enable"}
                              </button>
                            </form>
                            <form action={deleteQuizAction}>
                              <input type="hidden" name="row" value={quiz.registryRow} />
                              <button
                                type="submit"
                                className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-700"
                              >
                                Remove
                              </button>
                            </form>
                          </div>
                        ) : (
                          <span className="text-xs text-[#46607F]">via environment</span>
                        )}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-[#DCE8F4] bg-[#E7F2FB] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#102B4E]">Add a quiz</p>
            <form action={addQuizAction} className="mt-4 space-y-4">
              <div>
                <label htmlFor="title" className="mb-2 block text-sm font-medium text-[#102B4E]">
                  Quiz title
                </label>
                <input
                  id="title"
                  name="title"
                  required
                  placeholder="Quiz 40"
                  className="w-full rounded-xl border border-[#DCE8F4] bg-white px-4 py-3 text-[#102B4E] outline-none focus:border-[#102B4E]"
                />
              </div>

              <div>
                <label htmlFor="formUrl" className="mb-2 block text-sm font-medium text-[#102B4E]">
                  Google Form link
                </label>
                <input
                  id="formUrl"
                  name="formUrl"
                  type="url"
                  placeholder="https://docs.google.com/forms/d/..."
                  className="w-full rounded-xl border border-[#DCE8F4] bg-white px-4 py-3 text-[#102B4E] outline-none focus:border-[#102B4E]"
                />
              </div>

              <div>
                <label htmlFor="sheetUrl" className="mb-2 block text-sm font-medium text-[#102B4E]">
                  Response sheet link
                </label>
                <input
                  id="sheetUrl"
                  name="sheetUrl"
                  required
                  placeholder="https://docs.google.com/spreadsheets/d/ID/edit?gid=123"
                  className="w-full rounded-xl border border-[#DCE8F4] bg-white px-4 py-3 text-[#102B4E] outline-none focus:border-[#102B4E]"
                />
                <p className="mt-2 text-xs leading-6 text-[#46607F]">
                  Open the responses tab in Google Sheets and copy the address bar link.
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-[#102B4E] px-6 py-3 text-sm font-semibold text-[#FFFFFF]"
              >
                Add quiz
              </button>
            </form>

            {envQuizzes.length > 0 && registryQuizzes.length === 0 ? (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-800">
                {envQuizzes.length} quiz{envQuizzes.length === 1 ? " is" : "zes are"} currently read from environment
                variables. They will be hidden as soon as you add the first quiz here.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mt-10 overflow-hidden rounded-[2rem] border border-[#DCE8F4] bg-[#FFFFFF]">
        <div className="border-b border-[#DCE8F4] p-5">
          <h2 className="text-2xl font-semibold text-[#102B4E]">Quiz completion matrix</h2>
          <p className="mt-2 text-sm text-[#46607F]">
            {activeQuizzes.length} active quiz{activeQuizzes.length === 1 ? "" : "zes"} · {matrixRows.length} student
            {matrixRows.length === 1 ? "" : "s"} shown
          </p>
        </div>
        <div className="max-h-[32rem] overflow-auto">
          <table className="min-w-full text-left text-sm text-[#46607F]">
            <thead className="sticky top-0 bg-[#F0F7FC] text-[#102B4E]">
              <tr>
                <th className="px-4 py-3 font-semibold">Student</th>
                {activeQuizzes.map((quiz) => (
                  <th key={`head-${quiz.id}`} className="px-3 py-3 text-center text-xs font-semibold">
                    <Link href={adminHref(quiz.id)} className="text-[#102B4E] underline-offset-2 hover:underline">
                      {quiz.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6" colSpan={activeQuizzes.length + 1}>
                    No registrations found.
                  </td>
                </tr>
              ) : (
                matrixRows.map((student) => {
                  const completed = completedMap.get(student.id) ?? new Set<string>();
                  return (
                    <tr key={`matrix-${student.rowIndex}`} className="border-t border-[#DCE8F4]">
                      <td className="whitespace-nowrap px-4 py-3">
                        {student.name || student.id}
                        <span className="ml-2 text-xs text-[#102B4E]">{student.status}</span>
                      </td>
                      {activeQuizzes.map((quiz) => (
                        <td key={`cell-${student.rowIndex}-${quiz.id}`} className="px-3 py-3 text-center">
                          {completed.has(quiz.id) ? (
                            <span className="font-semibold text-emerald-700">done</span>
                          ) : (
                            <span className="text-[#94A7BF]">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10 overflow-hidden rounded-[2rem] border border-[#DCE8F4] bg-[#FFFFFF]">
        <div className="border-b border-[#DCE8F4] p-5">
          <h2 className="text-2xl font-semibold text-[#102B4E]">All registered students</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-[#46607F]">
            <thead className="bg-[#F0F7FC] text-[#102B4E]">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Number</th>
                <th className="px-4 py-3 font-semibold">Old Number</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Quizzes done</th>
              </tr>
            </thead>
            <tbody>
              {allStudents.map((student) => (
                <tr key={`student-${student.rowIndex}`} className="border-t border-[#DCE8F4]">
                  <td className="px-4 py-3">{student.id}</td>
                  <td className="px-4 py-3">{student.name || "Pending detail"}</td>
                  <td className="px-4 py-3">{student.number || "-"}</td>
                  <td className="px-4 py-3">{student.oldNumber || "-"}</td>
                  <td className="px-4 py-3">{student.status}</td>
                  <td className="px-4 py-3">
                    {(completedMap.get(student.id)?.size ?? 0)} / {activeQuizzes.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[2rem] border border-[#DCE8F4] bg-[#FFFFFF]">
          <div className="border-b border-[#DCE8F4] p-5">
            <h2 className="text-2xl font-semibold text-[#102B4E]">Completed students</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-[#46607F]">
              <thead className="bg-[#F0F7FC] text-[#102B4E]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Score</th>
                  <th className="px-4 py-3 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {completedStudents.map((student) => (
                  <tr key={`completed-${student.rowIndex}`} className="border-t border-[#DCE8F4]">
                    <td className="px-4 py-3">{student.name}</td>
                    <td className="px-4 py-3">{student.latestScore || "-"}</td>
                    <td className="px-4 py-3">{student.latestSubmissionTimestamp || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-[#DCE8F4] bg-[#FFFFFF]">
          <div className="border-b border-[#DCE8F4] p-5">
            <h2 className="text-2xl font-semibold text-[#102B4E]">Pending students</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-[#46607F]">
              <thead className="bg-[#F0F7FC] text-[#102B4E]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Number</th>
                  <th className="px-4 py-3 font-semibold">Old Number</th>
                </tr>
              </thead>
              <tbody>
                {pendingStudents.map((student) => (
                  <tr key={`pending-${student.rowIndex}`} className="border-t border-[#DCE8F4]">
                    <td className="px-4 py-3">{student.name || "-"}</td>
                    <td className="px-4 py-3">{student.number || "-"}</td>
                    <td className="px-4 py-3">{student.oldNumber || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[2rem] border border-[#DCE8F4] bg-[#FFFFFF]">
          <div className="border-b border-[#DCE8F4] p-5">
            <h2 className="text-2xl font-semibold text-[#102B4E]">Review and problem records</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-[#46607F]">
              <thead className="bg-[#F0F7FC] text-[#102B4E]">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Reason</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(problemRows.values()).map((record) => (
                  <tr key={`problem-${record.id}`} className="border-t border-[#DCE8F4]">
                    <td className="px-4 py-3">{record.id}</td>
                    <td className="px-4 py-3">{record.name}</td>
                    <td className="px-4 py-3">{record.reasons}</td>
                    <td className="px-4 py-3">{record.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-[#DCE8F4] bg-[#FFFFFF]">
          <div className="border-b border-[#DCE8F4] p-5">
            <h2 className="text-2xl font-semibold text-[#102B4E]">Unmatched and invalid submissions</h2>
            <p className="mt-2 text-sm text-[#46607F]">
              {selectedQuiz ? `Scoped to ${selectedQuiz.name}.` : "Across all quizzes."} These people could not be linked
              to a registration record.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-[#46607F]">
              <thead className="bg-[#F0F7FC] text-[#102B4E]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Quiz</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...unmatchedSubmissions, ...invalidSubmissions, ...duplicateSubmissions].map((submission) => (
                  <tr
                    key={`submission-${submission.quizId}-${submission.rowIndex}`}
                    className="border-t border-[#DCE8F4]"
                  >
                    <td className="px-4 py-3">{submission.quizName}</td>
                    <td className="px-4 py-3">{submission.name || "-"}</td>
                    <td className="px-4 py-3">{submission.phone || "-"}</td>
                    <td className="px-4 py-3">{submission.matchStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-[2rem] border border-[#DCE8F4] bg-[#FFFFFF] p-5 text-sm text-[#46607F]">
        Data is read live from the registration sheet and every configured quiz response sheet.
        <Link href="/student-portal" className="ml-2 font-semibold text-[#102B4E] underline">
          Student portal
        </Link>
      </div>
    </>
  );
}
