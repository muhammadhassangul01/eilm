import Link from "next/link";
import type { ReactNode } from "react";

import { siteConfig } from "@/lib/site-config";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/student-portal", label: "Student Portal" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-50 border-b border-[#d8c3a3]/80 bg-[#f8f1e7]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Home page">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1a4d3d] bg-[#1a4d3d] text-sm font-semibold text-[#f9f3ea]">
              {siteConfig.shortName}
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1a4d3d]">
                {siteConfig.instituteName}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-[#1a4d3d] md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-[#2c6a5b]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/student-portal"
            className="rounded-full bg-[#1a4d3d] px-4 py-2 text-sm font-semibold text-[#f9f3ea] shadow-sm transition-opacity hover:opacity-90"
          >
            Student Portal
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-[#d8c3a3] bg-[#f3e7d7] text-[#183a2f]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
          <div>
            <p className="text-lg font-semibold tracking-[0.12em] text-[#1a4d3d]">
              {siteConfig.instituteName}
            </p>
            <p className="mt-3 max-w-md text-sm leading-7 text-[#39574f]">
              {siteConfig.tagline}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1a4d3d]">
              Contact
            </p>
            <ul className="mt-3 space-y-2 text-sm text-[#39574f]">
              <li>{siteConfig.contact.phone}</li>
              <li>{siteConfig.contact.email}</li>
              <li>{siteConfig.contact.address}</li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1a4d3d]">
              Quick Links
            </p>
            <ul className="mt-3 space-y-2 text-sm text-[#39574f]">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition-colors hover:text-[#224d42]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
