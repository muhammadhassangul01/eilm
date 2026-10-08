import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/lib/site-config";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#102B4E]">
      <SiteHeader />

      <main className="flex-1">{children}</main>

      <footer className="section-dark relative overflow-hidden bg-[#102B4E] text-white">
        <div className="pattern-dark absolute inset-0 opacity-70" aria-hidden="true" />

        <div className="relative mx-auto max-w-6xl px-4 pt-14 pb-8 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.1fr_1.3fr]">
            <div>
              <Logo tone="light" />
              <p className="mt-5 max-w-sm text-sm leading-7 text-white/70">
                {siteConfig.tagline}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#38BDF8]">
                Quick Links
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                {siteConfig.navigation.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-white/75 transition-colors hover:text-[#38BDF8]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#38BDF8]">
                Programs
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                {siteConfig.courses.map((course) => (
                  <li key={course.title}>
                    <Link
                      href={course.enquiryHref}
                      className="text-white/75 transition-colors hover:text-[#38BDF8]"
                    >
                      {course.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#38BDF8]">
                Contact
              </p>
              <ul className="mt-4 space-y-3 text-sm text-white/75">
                <li>
                  <a
                    href={siteConfig.contact.phoneHref}
                    className="transition-colors hover:text-[#38BDF8]"
                  >
                    {siteConfig.contact.phone}
                  </a>
                </li>
                <li>
                  <a
                    href={siteConfig.contact.emailHref}
                    className="break-all transition-colors hover:text-[#38BDF8]"
                  >
                    {siteConfig.contact.email}
                  </a>
                </li>
                <li className="leading-6">
                  {siteConfig.contact.address}
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-white/12 pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
            <p>Copyright © 2026 Eilm Academy. All rights reserved.</p>
            <Link
              href="/student-portal"
              className="font-semibold text-white/75 transition-colors hover:text-[#38BDF8]"
            >
              Student Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
