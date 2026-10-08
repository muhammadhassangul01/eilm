import Link from "next/link";

import { siteConfig } from "@/lib/site-config";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mb-10 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1a4d3d]">
          About us
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#17372d] sm:text-5xl">
          A calm place to learn Quran with clarity.
        </h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-[#d9c8b2] bg-[#fffaf4] p-6 shadow-sm sm:p-8">
          <p className="text-base leading-8 text-[#32514a]">{siteConfig.about}</p>
          <p className="mt-5 text-base leading-8 text-[#32514a]" dir="rtl" lang="ur">
            {siteConfig.aboutUrdu}
          </p>
        </div>

        <div className="rounded-3xl border border-[#d9c8b2] bg-[#edf5ef] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-[#17372d]">What we aim to offer</h2>
          <ul className="mt-5 space-y-4 text-sm leading-7 text-[#33544b]">
            <li>• Clear guidance for students at different levels of readiness.</li>
            <li>• A calm and respectful learning environment.</li>
            <li>• A simple path toward regular practice and confidence.</li>
            <li>• Content updates and student support as the academy develops.</li>
          </ul>
        </div>
      </div>

      <div className="mt-10 rounded-3xl border border-[#d9c8b2] bg-[#f7f0e7] p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-[#17372d]">Our learning approach</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            "Step-by-step support",
            "Gentle accountability",
            "Encouraging progress",
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-[#d8c3a3] bg-[#fffaf4] p-5 text-sm leading-7 text-[#31514a]">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 flex justify-center">
        <Link
          href="/student-portal"
          className="rounded-full bg-[#1a4d3d] px-6 py-3 text-sm font-semibold text-[#f9f3ea] transition-opacity hover:opacity-90"
        >
          View Student Portal
        </Link>
      </div>
    </div>
  );
}
