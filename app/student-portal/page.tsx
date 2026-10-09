import { Suspense } from "react";

import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { handleStudentLogin } from "@/lib/auth";

export default function StudentPortalPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string | string[] }>;
}) {
  return (
    <div className="min-h-[75vh] bg-[#F0F7FC]">
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-[#DCE8F4] bg-[#FFFFFF] p-6 shadow-sm sm:p-8">
          <div className="flex justify-center">
            <Logo sizes="176px" className="h-24 w-auto" />
          </div>

          <p className="mt-6 text-center text-sm font-semibold uppercase tracking-[0.18em] text-[#102B4E]">
            Student login
          </p>
          <h1 className="mt-3 text-center text-2xl font-bold text-[#102B4E] sm:text-3xl">
            Check your status
          </h1>

          <Suspense fallback={null}>
            <PortalNotice searchParams={searchParams} />
          </Suspense>

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

            <SubmitButton pendingLabel="Checking your record">View student status</SubmitButton>
          </form>
        </div>
      </div>
    </div>
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
