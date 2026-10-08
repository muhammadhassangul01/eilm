"use client";

import { useState } from "react";

import { siteConfig } from "@/lib/site-config";

type EnquiryFormProps = {
  initialCourse?: string;
  idPrefix?: string;
};

export function EnquiryForm({
  initialCourse = "",
  idPrefix = "enquiry",
}: EnquiryFormProps) {
  const [sent, setSent] = useState(false);
  const courseTitles = siteConfig.courses.map((course) => course.title);
  const selectedCourse =
    courseTitles.includes(initialCourse) ? initialCourse : "Not sure yet";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const name = String(data.get("name") ?? "").trim();
    const contact = String(data.get("contact") ?? "").trim();
    const course = String(data.get("course") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    const subject = `Admission Enquiry — ${course || "Eilm Academy"}`;
    const body = [
      `Name: ${name}`,
      `Phone or Email: ${contact}`,
      `Course of Interest: ${course || "Not sure yet"}`,
      "",
      message || "Please share admission details.",
    ].join("\n");

    window.location.href = `mailto:${siteConfig.contact.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
      <div>
        <label
          htmlFor={`${idPrefix}-name`}
          className="mb-2 block text-sm font-semibold text-[#102B4E]"
        >
          Name
        </label>
        <input
          id={`${idPrefix}-name`}
          name="name"
          type="text"
          required
          autoComplete="name"
          placeholder="Your full name"
          className="field"
        />
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-contact`}
          className="mb-2 block text-sm font-semibold text-[#102B4E]"
        >
          Phone or Email
        </label>
        <input
          id={`${idPrefix}-contact`}
          name="contact"
          type="text"
          required
          autoComplete="tel"
          placeholder="How should we reach you?"
          className="field"
        />
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-course`}
          className="mb-2 block text-sm font-semibold text-[#102B4E]"
        >
          Course of Interest
        </label>
        <div className="relative">
          <select
            id={`${idPrefix}-course`}
            name="course"
            defaultValue={selectedCourse}
            className="field appearance-none pr-11"
          >
            {courseTitles.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
            <option value="Not sure yet">Not sure yet</option>
          </select>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-[#46607F]"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-message`}
          className="mb-2 block text-sm font-semibold text-[#102B4E]"
        >
          Message
        </label>
        <textarea
          id={`${idPrefix}-message`}
          name="message"
          rows={4}
          placeholder="Tell us what you would like to know"
          className="field resize-y"
        />
      </div>

      <button type="submit" className="btn btn-sky w-full">
        Send Enquiry
      </button>

      <p className="text-xs leading-6 text-[#46607F]">
        Submitting opens your email app with the details filled in, addressed to{" "}
        <a
          href={siteConfig.contact.emailHref}
          className="font-semibold text-[#0369A1] underline underline-offset-2"
        >
          {siteConfig.contact.email}
        </a>
        . You can also call{" "}
        <a
          href={siteConfig.contact.phoneHref}
          className="font-semibold text-[#0369A1] underline underline-offset-2"
        >
          {siteConfig.contact.phone}
        </a>
        .
      </p>

      {sent ? (
        <p
          role="status"
          className="rounded-xl border border-[#38BDF8]/50 bg-[#F0F7FC] px-4 py-3 text-sm font-medium text-[#102B4E]"
        >
          Your email app should now be open with the enquiry ready to send.
        </p>
      ) : null}
    </form>
  );
}
