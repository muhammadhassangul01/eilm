"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Logo } from "@/components/logo";
import { siteConfig } from "@/lib/site-config";

export function SiteHeader() {
  const pathname = usePathname();
  const [menu, setMenu] = useState({ open: false, path: pathname });
  const isOpen = menu.open && menu.path === pathname;

  function setMenuOpen(open: boolean) {
    setMenu({ open, path: pathname });
  }

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-[#102B4E]/10 bg-white/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Eilm Academy home" className="shrink-0">
          <Logo />
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-7 md:flex"
        >
          {siteConfig.navigation.map((item) => {
            const isActive = !item.href.includes("#") && pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`text-sm font-medium transition-colors hover:text-[#0369A1] ${
                  isActive ? "text-[#0369A1]" : "text-[#102B4E]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/#admission" className="btn btn-primary btn-sm hidden md:inline-flex">
            Admission Enquiry
          </Link>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#102B4E]/15 text-[#102B4E] transition-colors hover:bg-[#F0F7FC] md:hidden"
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen(!isOpen)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {isOpen ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {isOpen ? (
        <div
          id="mobile-menu"
          className="border-t border-[#102B4E]/10 bg-white md:hidden"
        >
          <nav aria-label="Mobile" className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
            <ul className="flex flex-col">
              {siteConfig.navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block border-b border-[#DCE8F4] py-3 text-[0.95rem] font-medium text-[#102B4E] transition-colors hover:text-[#0369A1]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href="/#admission"
              onClick={() => setMenuOpen(false)}
              className="btn btn-primary mt-4 w-full"
            >
              Admission Enquiry
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
