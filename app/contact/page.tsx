import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { DataLoading } from "@/components/data-loading";
import { EnquiryForm } from "@/components/enquiry-form";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact — Eilm Academy",
  description:
    "Contact Eilm Academy about admission, online Qur’an learning, and onsite Islamic studies in Islamabad.",
};

export default function ContactPage({
  searchParams,
}: {
  searchParams?: Promise<{ course?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<DataLoading label="Loading enquiry form" />}>
      <ContactContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ContactContent({
  searchParams,
}: {
  searchParams?: Promise<{ course?: string | string[] }>;
}) {
  const params = (await searchParams) ?? {};
  const courseParam = Array.isArray(params.course)
    ? params.course[0]
    : params.course;

  return (
    <>
      <section className="border-b border-[#DCE8F4] bg-[#F0F7FC]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="eyebrow">Contact</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-[#102B4E] sm:text-4xl lg:text-5xl">
            Speak to Us About Admission
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[#46607F]">
            Ask about course availability, admission requirements, and how to
            apply for our online and onsite programs.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
          <div>
            <p className="eyebrow">Reach Us Directly</p>

            <div className="mt-6 space-y-4">
              <a
                href={siteConfig.contact.phoneHref}
                className="card flex items-start gap-4 p-5 transition-colors hover:border-[#38BDF8]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#102B4E] text-[#38BDF8]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="h-5 w-5"
                  >
                    <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />
                  </svg>
                </span>
                <span>
                  <span className="block text-xs font-bold tracking-[0.16em] text-[#0369A1] uppercase">
                    Phone
                  </span>
                  <span className="mt-1 block text-base font-semibold text-[#102B4E]">
                    {siteConfig.contact.phone}
                  </span>
                </span>
              </a>

              <a
                href={siteConfig.contact.emailHref}
                className="card flex items-start gap-4 p-5 transition-colors hover:border-[#38BDF8]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#102B4E] text-[#38BDF8]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="h-5 w-5"
                  >
                    <path d="M3 6h18v12H3zM3 7l9 6 9-6" />
                  </svg>
                </span>
                <span>
                  <span className="block text-xs font-bold tracking-[0.16em] text-[#0369A1] uppercase">
                    Email
                  </span>
                  <span className="mt-1 block text-base font-semibold break-all text-[#102B4E]">
                    {siteConfig.contact.email}
                  </span>
                </span>
              </a>

              <div className="card p-5">
                <span className="block text-xs font-bold tracking-[0.16em] text-[#0369A1] uppercase">
                  Venue
                </span>
                <p className="mt-2 text-base font-semibold text-[#102B4E]">
                  {siteConfig.venue.name}
                </p>
                <p className="mt-1 text-sm leading-6 text-[#46607F]">
                  {siteConfig.venue.area}
                </p>
                <a
                  href={siteConfig.venue.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm mt-4"
                >
                  Get Directions
                </a>
              </div>
            </div>

            <div className="mt-8">
              <p className="eyebrow">Programs</p>
              <ul className="mt-4 flex flex-wrap gap-3">
                {siteConfig.courses.map((course) => (
                  <li key={course.title}>
                    <Link
                      href={course.enquiryHref}
                      className="inline-flex items-center gap-2 rounded-full border border-[#DCE8F4] bg-[#F0F7FC] px-4 py-2 text-sm font-semibold text-[#102B4E] transition-colors hover:border-[#38BDF8]"
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          course.format === "Online"
                            ? "bg-[#38BDF8]"
                            : "bg-[#102B4E]"
                        }`}
                        aria-hidden="true"
                      />
                      {course.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card h-fit p-6 sm:p-8">
            <p className="text-xs font-bold tracking-[0.18em] text-[#0369A1] uppercase">
              Admission Enquiry
            </p>
            <h2 className="mt-2 text-xl font-bold text-[#102B4E]">
              Send us a short message
            </h2>
            <div className="mt-6">
              <EnquiryForm
                initialCourse={courseParam}
                idPrefix="contact-enquiry"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
