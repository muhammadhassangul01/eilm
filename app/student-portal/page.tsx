import Link from "next/link";
import { Suspense } from "react";

import { DataLoading } from "@/components/data-loading";
import { handleStudentLogin } from "@/lib/auth";
import { getPortalSnapshot } from "@/lib/student-data";

export default function StudentPortalPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<DataLoading label="Loading student portal" />}>
      <StudentPortalContent searchParams={searchParams} />
    </Suspense>
  );
}

async function StudentPortalContent({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string | string[] }>;
}) {
  const params = (await searchParams) ?? {};
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const snapshot = await getPortalSnapshot();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-[#d9c8b2] bg-[#fffaf4] p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1a4d3d]">Student portal</p>
          <h1 className="mt-3 text-3xl font-bold text-[#17372d] sm:text-4xl">
            Track your Quran learning progress.
          </h1>

          {snapshot.error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {snapshot.error}
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              {error}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { label: "Registrations", value: snapshot.metrics.totalRegistrationRows },
              { label: "Quiz submissions", value: snapshot.metrics.totalQuizSubmissions },
              { label: "Completed students", value: snapshot.metrics.uniqueCompletedStudents },
              { label: "Pending students", value: snapshot.metrics.pendingStudents },
            ].map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-[#d9c8b2] bg-[#edf5ef] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1a4d3d]">{metric.label}</p>
                <p className="mt-3 text-2xl font-bold text-[#17372d]">{metric.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/" className="rounded-full bg-[#1a4d3d] px-5 py-3 text-sm font-semibold text-[#f9f3ea]">
              Home
            </Link>
            <Link href="/about" className="rounded-full border border-[#1a4d3d] px-5 py-3 text-sm font-semibold text-[#1a4d3d]">
              About
            </Link>
            <Link href="/admin" className="rounded-full border border-[#1a4d3d] px-5 py-3 text-sm font-semibold text-[#1a4d3d]">
              Admin
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#d9c8b2] bg-[#fffaf4] p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1a4d3d]">Student login</p>
          <h2 className="mt-3 text-2xl font-bold text-[#17372d]">Check your status</h2>

          <form action={handleStudentLogin} className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-[#17372d]">
                Full name
              </label>
              <input
                id="name"
                name="name"
                required
                className="w-full rounded-xl border border-[#d9c8b2] bg-white px-4 py-3 text-[#17372d] outline-none focus:border-[#1a4d3d]"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label htmlFor="number" className="mb-2 block text-sm font-medium text-[#17372d]">
                Phone number
              </label>
              <input
                id="number"
                name="number"
                required
                className="w-full rounded-xl border border-[#d9c8b2] bg-white px-4 py-3 text-[#17372d] outline-none focus:border-[#1a4d3d]"
                placeholder="e.g. 03001234567"
              />
            </div>

            <div>
              <label htmlFor="countryCode" className="mb-2 block text-sm font-medium text-[#17372d]">
                Country code
              </label>
              <select
                id="countryCode"
                name="countryCode"
                defaultValue="PK"
                className="w-full rounded-xl border border-[#d9c8b2] bg-white px-4 py-3 text-[#17372d] outline-none focus:border-[#1a4d3d]"
              >
                <option value="PK">Pakistan (+92)</option>
                <option value="GB">United Kingdom (+44)</option>
                <option value="DE">Germany (+49)</option>
              </select>
              <p className="mt-2 text-xs text-[#33544b]">
                Enter the number without the country code, e.g. 03001234567.
              </p>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-[#1a4d3d] px-6 py-3 text-sm font-semibold text-[#f9f3ea]"
            >
              View student status
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
