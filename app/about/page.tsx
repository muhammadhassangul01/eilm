import Link from "next/link";

import { siteConfig } from "@/lib/site-config";

const highlights = [
  {
    title: "Rooted in Qur’an & Sunnah",
    text: "An approach to learning grounded in the primary sources of Islam.",
  },
  {
    title: "Qualified Scholarly Guidance",
    text: "Study with teachers who help explain Islamic knowledge with care and clarity.",
  },
  {
    title: "Structured Learning",
    text: "Follow an organised path that supports steady progress and deeper understanding.",
  },
  {
    title: "Knowledge for Daily Life",
    text: "Connect your studies with worship, personal conduct, and spiritual growth.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-[#DCE8F4] bg-[#F0F7FC]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="eyebrow">About the Academy</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-[#102B4E] sm:text-4xl lg:text-5xl">
            Knowledge That Guides Understanding and Practice
          </h1>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-20">
          <div className="space-y-5 text-base leading-8 text-[#46607F]">
            {siteConfig.about.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <p className="text-base leading-8 text-[#46607F]" dir="rtl" lang="ur">
              {siteConfig.aboutUrdu}
            </p>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <Link href="/#courses" className="btn btn-primary">
                Explore Courses
              </Link>
              <Link href="/#admission" className="btn btn-outline">
                Admission Enquiry
              </Link>
            </div>
          </div>

          <div className="pattern-light rounded-[1.5rem] border border-[#DCE8F4] bg-[#F0F7FC] p-6 sm:p-8">
            <p className="eyebrow">Visit Us</p>
            <p className="mt-4 text-base font-bold text-[#102B4E]">
              {siteConfig.venue.name}
            </p>
            <p className="mt-1 text-sm leading-6 text-[#46607F]">
              {siteConfig.venue.area}
            </p>

            <a
              href={siteConfig.venue.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm mt-5"
            >
              Get Directions
            </a>

            <div className="mt-8 border-t border-[#DCE8F4] pt-6">
              <p className="eyebrow">Contact</p>
              <ul className="mt-4 space-y-3 text-sm text-[#46607F]">
                <li>
                  <a
                    href={siteConfig.contact.phoneHref}
                    className="font-semibold text-[#102B4E] transition-colors hover:text-[#0369A1]"
                  >
                    {siteConfig.contact.phone}
                  </a>
                </li>
                <li>
                  <a
                    href={siteConfig.contact.emailHref}
                    className="break-all font-semibold text-[#102B4E] transition-colors hover:text-[#0369A1]"
                  >
                    {siteConfig.contact.email}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F0F7FC]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="eyebrow">Why Eilm Academy</p>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#102B4E] sm:text-3xl">
            Learn with Clarity, Purpose, and Guidance
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {highlights.map((item) => (
              <div key={item.title} className="card p-6">
                <span className="flex h-1.5 w-10 rounded-full bg-[#38BDF8]" aria-hidden="true" />
                <h3 className="mt-4 text-base font-bold text-[#102B4E]">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-sm leading-7 text-[#46607F]">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4 text-sm text-[#46607F]">
            <span>Student resources:</span>
            <Link
              href="/student-portal"
              className="font-semibold text-[#0369A1] underline underline-offset-4"
            >
              Student Portal
            </Link>
            <Link
              href="/contact"
              className="font-semibold text-[#0369A1] underline underline-offset-4"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
