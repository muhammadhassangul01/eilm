import Link from "next/link";
import { Suspense } from "react";

import { DataLoading } from "@/components/data-loading";
import { getStudentSession, logoutStudent } from "@/lib/auth";
import { getEnabledQuizzes } from "@/lib/quiz-config";
import { compareSubmissionTimestamps, getPortalSnapshot } from "@/lib/student-data";

export default function StudentStatusPage() {
  return (
    <Suspense fallback={<DataLoading label="Loading your record" />}>
      <StudentStatusContent />
    </Suspense>
  );
}

async function StudentStatusContent() {
  const studentSession = await getStudentSession();

  if (!studentSession) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[#d9c8b2] bg-[#fffaf4] p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1a4d3d]">Student login</p>
          <h1 className="mt-3 text-3xl font-bold text-[#17372d]">Please log in to view your status.</h1>
          <p className="mt-3 text-sm leading-7 text-[#33544b]">
            Enter your name, phone number, and country code to access your record.
          </p>
          <div className="mt-6">
            <Link
              href="/student-portal"
              className="rounded-full bg-[#1a4d3d] px-6 py-3 text-sm font-semibold text-[#f9f3ea]"
            >
              Go to Student Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const snapshot = await getPortalSnapshot();
  if (snapshot.error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[#d9c8b2] bg-[#fffaf4] p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1a4d3d]">Data access error</p>
          <h1 className="mt-3 text-3xl font-bold text-[#17372d]">Google Sheets could not be read.</h1>
          <p className="mt-4 text-sm leading-7 text-[#33544b]">{snapshot.error}</p>
        </div>
      </div>
    );
  }

  const student = snapshot.registrations.find((registration) => registration.id === studentSession.id);
  if (!student) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[#d9c8b2] bg-[#fffaf4] p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1a4d3d]">No matching record</p>
          <h1 className="mt-3 text-3xl font-bold text-[#17372d]">We could not find your registration record.</h1>
          <p className="mt-4 text-sm leading-7 text-[#33544b]">
            Please contact the institute if this is unexpected.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/student-portal"
              className="rounded-full bg-[#1a4d3d] px-6 py-3 text-sm font-semibold text-[#f9f3ea]"
            >
              Back to portal
            </Link>
            <form action={logoutStudent}>
              <button
                type="submit"
                className="rounded-full border border-[#1a4d3d] px-6 py-3 text-sm font-semibold text-[#1a4d3d]"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const matchedSubmissions = snapshot.submissions.filter(
    (submission) =>
      submission.matchStatus === "matched" && submission.matchedRegistrationIds.includes(student.id),
  );

  const latestSubmission = matchedSubmissions
    .filter((submission) => submission.timestamp)
    .sort((a, b) => compareSubmissionTimestamps(a.timestamp, b.timestamp))[0];

  const activeQuizzes = getEnabledQuizzes(snapshot.quizDefinitions);
  const quizStatuses = activeQuizzes.map((quiz) => {
    const relevantSubmissions = matchedSubmissions.filter((submission) => submission.quizId === quiz.id);
    const latestQuizSubmission = relevantSubmissions
      .filter((submission) => submission.timestamp)
      .sort((a, b) => compareSubmissionTimestamps(a.timestamp, b.timestamp))[0];

    return {
      ...quiz,
      isComplete: relevantSubmissions.length > 0,
      attemptCount: relevantSubmissions.length,
      latestScore: latestQuizSubmission?.score || "Not available yet",
      latestTimestamp: latestQuizSubmission?.timestamp || "Not available yet",
    };
  });

  const completedCount = quizStatuses.filter((quiz) => quiz.isComplete).length;
  const totalCount = quizStatuses.length;

  const statusLabel =
    student.status === "completed"
      ? "Completed"
      : student.status === "review_required"
        ? "Review required"
        : "Pending";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-[#d9c8b2] bg-[#fffaf4] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 border-b border-[#d9c8b2] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1a4d3d]">Student status</p>
            <h1 className="mt-3 text-3xl font-bold text-[#17372d]">{student.name || studentSession.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full bg-[#edf5ef] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#17372d]">
              {statusLabel}
            </span>
            <Link
              href="/student-portal"
              className="rounded-full border border-[#1a4d3d] px-4 py-2 text-xs font-semibold text-[#1a4d3d]"
            >
              Portal
            </Link>
            <form action={logoutStudent}>
              <button
                type="submit"
                className="rounded-full border border-[#1a4d3d] px-4 py-2 text-xs font-semibold text-[#1a4d3d]"
              >
                Log out
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-[#d9c8b2] bg-[#f3e7d7] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1a4d3d]">Registration</p>
            <ul className="mt-4 space-y-2 text-sm leading-7 text-[#33544b]">
              <li>
                <strong className="text-[#17372d]">ID:</strong> {student.id}
              </li>
              <li>
                <strong className="text-[#17372d]">Number:</strong> {student.number || student.phoneNumbers[0] || "Pending"}
              </li>
              <li>
                <strong className="text-[#17372d]">Old Number:</strong> {student.oldNumber || "Not recorded"}
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[#d9c8b2] bg-[#edf5ef] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1a4d3d]">Quiz status</p>
            <ul className="mt-4 space-y-2 text-sm leading-7 text-[#33544b]">
              <li>
                <strong className="text-[#17372d]">Matching submissions:</strong> {matchedSubmissions.length}
              </li>
              <li>
                <strong className="text-[#17372d]">Latest score:</strong> {latestSubmission?.score || "Not available yet"}
              </li>
              <li>
                <strong className="text-[#17372d]">Last submitted:</strong> {latestSubmission?.timestamp || "Not available yet"}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-2xl font-semibold text-[#17372d]">Quiz progress</h2>
            {totalCount > 0 ? (
              <p className="text-sm font-semibold text-[#1a4d3d]">
                {completedCount} of {totalCount} completed
              </p>
            ) : null}
          </div>

          {totalCount > 0 ? (
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#e6dccd]">
              <div
                className="h-2 rounded-full bg-[#1a4d3d] transition-all"
                style={{ width: `${Math.round((completedCount / totalCount) * 100)}%` }}
              />
            </div>
          ) : null}

          {quizStatuses.length === 0 ? (
            <p className="mt-4 text-sm leading-7 text-[#33544b]">
              No quiz sheets are configured yet. Add quiz links and response sheet IDs in the admin panel.
            </p>
          ) : (
            <div className="mt-5 grid gap-4">
              {quizStatuses.map((quiz) => (
                <div key={quiz.id} className="rounded-2xl border border-[#d9c8b2] bg-[#f9f7f3] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1a4d3d]">
                        {quiz.name}
                      </p>
                      <p className="mt-2 text-sm text-[#33544b]">
                        Status:{" "}
                        <span className="font-semibold text-[#17372d]">
                          {quiz.isComplete ? "Completed" : "Pending"}
                        </span>
                        {quiz.isComplete && quiz.attemptCount > 1 ? (
                          <span className="text-[#33544b]"> ({quiz.attemptCount} attempts)</span>
                        ) : null}
                      </p>
                    </div>

                    {quiz.isComplete ? (
                      <div className="text-sm text-[#33544b]">
                        <p>Score: {quiz.latestScore}</p>
                        <p>Submitted: {quiz.latestTimestamp}</p>
                      </div>
                    ) : quiz.formUrl ? (
                      <a
                        href={quiz.formUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-full bg-[#1a4d3d] px-4 py-2 text-sm font-semibold text-[#f9f3ea]"
                      >
                        Open form
                      </a>
                    ) : (
                      <span className="text-sm font-medium text-[#1a4d3d]">Form link pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {student.status === "pending" ? (
          <div className="mt-8 rounded-2xl border border-[#d9c8b2] bg-[#f3e7d7] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#1a4d3d]">Pending registration</p>
            <p className="mt-3 text-sm leading-7 text-[#33544b]">
              Your registration is still pending. Please use the relevant quiz form when it is shared.
            </p>
          </div>
        ) : null}

        {student.status === "review_required" ? (
          <div className="mt-8 rounded-2xl border border-[#d9c8b2] bg-[#f3e7d7] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#1a4d3d]">Review required</p>
            <p className="mt-3 text-sm leading-7 text-[#33544b]">
              There is an issue with one or more phone numbers linked to your record. Please contact the institute for review.
            </p>
          </div>
        ) : null}

        {matchedSubmissions.length > 0 ? (
          <div className="mt-10">
            <h2 className="text-2xl font-semibold text-[#17372d]">Recent submissions</h2>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-[#d9c8b2] bg-[#f9f7f3]">
              <table className="min-w-full text-left text-sm text-[#33544b]">
                <thead className="bg-[#edf5ef] text-[#17372d]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Quiz</th>
                    <th className="px-4 py-3 font-semibold">Timestamp</th>
                    <th className="px-4 py-3 font-semibold">Score</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {matchedSubmissions.map((submission) => (
                    <tr key={`${submission.quizId}-${submission.rowIndex}`} className="border-t border-[#d9c8b2]">
                      <td className="px-4 py-3">{submission.quizName}</td>
                      <td className="px-4 py-3">{submission.timestamp || "Not recorded"}</td>
                      <td className="px-4 py-3">{submission.score || "Not recorded"}</td>
                      <td className="px-4 py-3">{submission.matchStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
