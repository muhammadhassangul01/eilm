import Link from "next/link";

import { siteConfig } from "@/lib/site-config";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1a4d3d]">
              Quran learning institute
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#17372d] sm:text-5xl lg:text-6xl">
              {siteConfig.instituteName}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#385b54]">
              {siteConfig.introduction}
            </p>
            <p className="mt-4 max-w-xl text-lg leading-8 text-[#385b54]" dir="rtl" lang="ur">
              {siteConfig.urduIntro}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/student-portal"
                className="rounded-full bg-[#1a4d3d] px-6 py-3 text-center text-sm font-semibold text-[#f9f3ea] shadow-sm transition-opacity hover:opacity-90"
              >
                Student Portal
              </Link>
              <Link
                href="/about"
                className="rounded-full border border-[#1a4d3d] bg-white/40 px-6 py-3 text-center text-sm font-semibold text-[#1a4d3d] transition-colors hover:bg-[#edf5ef]"
              >
                About the Institute
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                { title: "Supportive", text: "Calm guidance for everyday learning." },
                { title: "Structured", text: "Clear progress and practical routines." },
                { title: "Respectful", text: "A welcoming space for all learners." },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[#d9c8b2] bg-[#fffaf4] p-4 shadow-sm"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1a4d3d]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#34544d]">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-[#d9c8b2] bg-[#fffaf4] p-6 shadow-lg shadow-[#d8c3a3]/30 sm:p-8">
              <div className="rounded-[1.5rem] border border-[#d9c8b2] bg-[#edf5ef] p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1a4d3d]">
                  Learning overview
                </p>
                <div className="mt-6 space-y-5">
                  {[
                    "Begin with the basics and build confidence gradually.",
                    "Practice recitation with clear structure and consistency.",
                    "Prepare for continued learning with support and guidance.",
                  ].map((item, index) => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1a4d3d] text-xs font-semibold text-[#f9f3ea]">
                        {index + 1}
                      </span>
                      <p className="text-sm leading-7 text-[#33544b]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16" id="courses">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1a4d3d]">
                Course focus
              </p>
              <h2 className="mt-2 text-3xl font-bold text-[#17372d]">
                Learning pathways in development
              </h2>
            </div>
            <p className="text-sm text-[#486860]">
              Course details and timings will be added as they are confirmed.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {siteConfig.courses.map((course) => (
              <article
                key={course.title}
                className="rounded-3xl border border-[#d9c8b2] bg-[#fffaf4] p-5 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1a4d3d]">
                  {course.format}
                </p>
                <h3 className="mt-4 text-xl font-semibold text-[#17372d]">{course.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#33544b]">{course.summary}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-3">
          {[
            {
              title: "Who it is for",
              text: "Students who want supportive guidance, clear structure, and a simple way to continue their Quran learning journey.",
            },
            {
              title: "How learning is approached",
              text: "Progress is built around consistency, clarity, and respectful encouragement rather than pressure.",
            },
            {
              title: "What is still being prepared",
              text: "Timings, enrolment forms, lesson plans, and further details are being confirmed before launch.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-[#d9c8b2] bg-[#f3e7d7] p-6">
              <h3 className="text-xl font-semibold text-[#17372d]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#34544d]">{item.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-16 rounded-[2rem] border border-[#d9c8b2] bg-[#edf5ef] p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1a4d3d]">
            Contact and next steps
          </p>
          <h2 className="mt-2 text-3xl font-bold text-[#17372d]">
            Keep an eye on updates as the academy is prepared.
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Phone", value: siteConfig.contact.phone },
              { label: "Email", value: siteConfig.contact.email },
              { label: "Location", value: siteConfig.contact.address },
              { label: "Hours", value: siteConfig.contact.hours },
            ].map((detail) => (
              <div key={detail.label} className="rounded-2xl border border-[#d9c8b2] bg-[#fffaf4] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1a4d3d]">
                  {detail.label}
                </p>
                <p className="mt-3 text-sm leading-6 text-[#33544b]">{detail.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
