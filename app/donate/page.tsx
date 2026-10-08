import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Donate — Eilm Academy",
  description:
    "Support Eilm Academy’s work in authentic Islamic education through online and onsite programs.",
};

export default function DonatePage() {
  return (
    <>
      <section className="border-b border-[#DCE8F4] bg-[#F0F7FC]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="eyebrow">Support the Academy</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-[#102B4E] sm:text-4xl lg:text-5xl">
            Support Authentic Islamic Learning
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[#46607F]">
            Your support helps Eilm Academy continue offering structured Qur’an
            and Islamic studies programs for online and onsite learners.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
          <div className="space-y-5 text-base leading-8 text-[#46607F]">
            <p>
              Eilm Academy is dedicated to making authentic Islamic education
              accessible through structured online and onsite programs. Donations
              support this educational work and the learning environment it
              depends on.
            </p>
            <p>
              Donation details are shared directly by the academy so that every
              contribution is handled clearly and transparently. Contact us to
              learn about current ways to give.
            </p>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <Link href="/contact" className="btn btn-primary">
                Contact Us
              </Link>
              <a href={siteConfig.contact.phoneHref} className="btn btn-outline">
                Call {siteConfig.contact.phone}
              </a>
            </div>
          </div>

          <div className="card pattern-light h-fit p-6 sm:p-8">
            <p className="eyebrow">Get in Touch</p>
            <h2 className="mt-3 text-xl font-bold text-[#102B4E]">
              Ask about donating
            </h2>

            <ul className="mt-5 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#38BDF8]" aria-hidden="true" />
                <a
                  href={siteConfig.contact.emailHref}
                  className="font-semibold break-all text-[#102B4E] transition-colors hover:text-[#0369A1]"
                >
                  {siteConfig.contact.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#38BDF8]" aria-hidden="true" />
                <a
                  href={siteConfig.contact.phoneHref}
                  className="font-semibold text-[#102B4E] transition-colors hover:text-[#0369A1]"
                >
                  {siteConfig.contact.phone}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#38BDF8]" aria-hidden="true" />
                <span className="leading-6 text-[#46607F]">
                  {siteConfig.contact.address}
                </span>
              </li>
            </ul>

            <div className="mt-7 border-t border-[#DCE8F4] pt-6">
              <p className="text-sm font-semibold text-[#102B4E]">
                Prefer to write a message?
              </p>
              <Link href="/contact" className="btn btn-sky btn-sm mt-4 w-full">
                Open the Enquiry Form
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
