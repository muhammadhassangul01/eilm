import Link from "next/link";
import { Suspense } from "react";

import { handleStudentLogin } from "@/lib/auth";
import { getPortalSnapshot } from "@/lib/student-data";

export default function StudentPortalPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string | string[] }>;
}) {
  return (
    <div className="min-h-[75vh] bg-[#F0F7FC]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-[#DCE8F4] bg-[#FFFFFF] p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#102B4E]">Student portal</p>
            <h1 className="mt-3 text-3xl font-bold text-[#102B4E] sm:text-4xl">
              Track your Quran learning progress.
            </h1>

            <Suspense fallback={<MetricsSkeleton />}>
              <PortalOverview searchParams={searchParams} />
            </Suspense>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/" className="rounded-full bg-[#102B4E] px-5 py-3 text-sm font-semibold text-[#FFFFFF]">
                Home
              </Link>
              <Link href="/about" className="rounded-full border border-[#102B4E] px-5 py-3 text-sm font-semibold text-[#102B4E]">
                About
              </Link>
              <Link href="/admin" className="rounded-full border border-[#102B4E] px-5 py-3 text-sm font-semibold text-[#102B4E]">
                Admin
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#DCE8F4] bg-[#FFFFFF] p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#102B4E]">Student login</p>
            <h2 className="mt-3 text-2xl font-bold text-[#102B4E]">Check your status</h2>

            <form action={handleStudentLogin} className="mt-6 space-y-4">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-[#102B4E]">
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  className="w-full rounded-xl border border-[#DCE8F4] bg-white px-4 py-3 text-[#102B4E] outline-none focus:border-[#102B4E]"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label htmlFor="number" className="mb-2 block text-sm font-medium text-[#102B4E]">
                  Phone number
                </label>
                <input
                  id="number"
                  name="number"
                  required
                  className="w-full rounded-xl border border-[#DCE8F4] bg-white px-4 py-3 text-[#102B4E] outline-none focus:border-[#102B4E]"
                  placeholder="e.g. 03001234567"
                />
              </div>

              <div>
                <label htmlFor="countryCode" className="mb-2 block text-sm font-medium text-[#102B4E]">
                  Country code
                </label>
                <select
                  id="countryCode"
                  name="countryCode"
                  defaultValue="PK"
                  className="w-full rounded-xl border border-[#DCE8F4] bg-white px-4 py-3 text-[#102B4E] outline-none focus:border-[#102B4E]"
                >
                  <option value="PK">Pakistan (+92)</option>
                  <option value="GB">United Kingdom (+44)</option>
                  <option value="DE">Germany (+49)</option>
                </select>
                <p className="mt-2 text-xs text-[#46607F]">
                  Enter the number without the country code, e.g. 03001234567.
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-[#102B4E] px-6 py-3 text-sm font-semibold text-[#FFFFFF]"
              >
                View student status
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reads only cached data, so this prerenders into the static shell. The
// searchParams-driven notice sits behind its own boundary inside it.
async function PortalOverview({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string | string[] }>;
}) {
  const snapshot = await getPortalSnapshot();

  return (
    <>
      {snapshot.error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {snapshot.error}
        </div>
      ) : null}

      <Suspense fallback={null}>
        <PortalNotice searchParams={searchParams} />
      </Suspense>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[
          { label: "Registrations", value: snapshot.metrics.totalRegistrationRows },
          { label: "Quiz submissions", value: snapshot.metrics.totalQuizSubmissions },
          { label: "Completed students", value: snapshot.metrics.uniqueCompletedStudents },
          { label: "Pending students", value: snapshot.metrics.pendingStudents },
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-[#DCE8F4] bg-[#F0F7FC] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#102B4E]">{metric.label}</p>
            <p className="mt-3 text-2xl font-bold text-[#102B4E]">{metric.value}</p>
          </div>
        ))}
      </div>
    </>
  );
}

async function PortalNotice({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string | string[] }>;
}) {
  const params = (await searchParams) ?? {};
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  if (!error) {
    return null;
  }

  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">{error}</div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      {[0, 1, 2, 3].map((tile) => (
        <div key={tile} className="rounded-2xl border border-[#DCE8F4] bg-[#F0F7FC] p-4">
          <div className="h-3 w-1/2 animate-pulse rounded bg-[#E8F2FA]" />
          <div className="mt-4 h-7 w-1/3 animate-pulse rounded bg-[#E8F2FA]" />
        </div>
      ))}
    </div>
  );
}
