import Link from "next/link";

import { AcademyVisual } from "@/components/academy-visual";
import { EnquiryForm } from "@/components/enquiry-form";
import { siteConfig } from "@/lib/site-config";

function Icon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={path} />
    </svg>
  );
}

const monitorPath = "M4 5h16v10H4zM9 19h6M12 15v4";
const buildingPath = "M4 20h16M6 20V9l6-4 6 4v11M10 20v-5h4v5";
const bookPath = "M4 5.5A2.5 2.5 0 0 1 6.5 3H12v16H6.5A2.5 2.5 0 0 0 4 21.5zM20 5.5A2.5 2.5 0 0 0 17.5 3H12v16h5.5A2.5 2.5 0 0 1 20 21.5z";
const scholarPath = "M12 4 2 9l10 5 10-5zM6 11.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5";
const layersPath = "M12 3 3 8l9 5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5";
const heartPath = "M12 20s-7-4.4-7-9.5A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.5C19 15.6 12 20 12 20z";
const pinPath = "M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z";
const phonePath = "M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z";
const mailPath = "M3 6h18v12H3zM3 7l9 6 9-6";

const features = [
  {
    title: "Rooted in Qur’an & Sunnah",
    text: "An approach to learning grounded in the primary sources of Islam.",
    path: bookPath,
  },
  {
    title: "Qualified Scholarly Guidance",
    text: "Study with teachers who help explain Islamic knowledge with care and clarity.",
    path: scholarPath,
  },
  {
    title: "Structured Learning",
    text: "Follow an organised path that supports steady progress and deeper understanding.",
    path: layersPath,
  },
  {
    title: "Knowledge for Daily Life",
    text: "Connect your studies with worship, personal conduct, and spiritual growth.",
    path: heartPath,
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="section-dark relative overflow-hidden bg-[#102B4E] text-white">
        <div className="pattern-dark absolute inset-0" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -top-32 right-0 h-[420px] w-[420px] rounded-full bg-[#38BDF8]/15 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
          <div>
            <p className="eyebrow text-[0.68rem] tracking-[0.13em]">
              Authentic Knowledge • Structured Learning • Spiritual Growth
            </p>

            <h1 className="mt-5 text-4xl leading-[1.08] font-bold tracking-tight sm:text-5xl lg:text-[3.5rem]">
              Understand Your Faith.{" "}
              <span className="text-[#38BDF8]">Enrich Your Life.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-white/75 sm:text-lg">
              Learn the Qur’an and deepen your understanding of Islam through
              structured programs guided by qualified scholars. Explore online
              and onsite learning that connects knowledge with worship,
              character, and everyday life.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/#courses" className="btn btn-sky">
                Explore Courses
              </Link>
              <Link href="/student-portal" className="btn btn-light">
                Student Portal
              </Link>
            </div>

            <p className="mt-9 flex items-start gap-3 text-sm leading-6 text-white/70">
              <span
                className="mt-2.5 h-px w-8 shrink-0 bg-[#38BDF8]"
                aria-hidden="true"
              />
              Online Qur’an learning • Onsite Islamic studies in Islamabad
            </p>
          </div>

          <AcademyVisual className="lg:pl-6" />
        </div>
      </section>

      {/* Courses */}
      <section id="courses" className="bg-[#F0F7FC]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="eyebrow">Our Programs</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#102B4E] sm:text-4xl">
              A Structured Path to Islamic Learning
            </h2>
            <p className="mt-4 text-base leading-8 text-[#46607F]">
              Explore three focused programs designed to strengthen your
              understanding of the Qur’an and Islamic teachings.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {siteConfig.courses.map((course) => {
              const isOnline = course.format === "Online";
              return (
                <article
                  key={course.title}
                  className="card relative flex flex-col overflow-hidden p-6"
                >
                  <span
                    className={`absolute inset-x-0 top-0 h-1 ${
                      isOnline ? "bg-[#38BDF8]" : "bg-[#102B4E]"
                    }`}
                    aria-hidden="true"
                  />

                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.7rem] font-bold tracking-wide ${
                        isOnline
                          ? "bg-[#38BDF8] text-[#102B4E]"
                          : "bg-[#102B4E] text-white"
                      }`}
                    >
                      <Icon
                        path={isOnline ? monitorPath : buildingPath}
                        className="h-3.5 w-3.5"
                      />
                      {course.badge}
                    </span>

                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#DCE8F4] bg-[#F0F7FC] text-[#0284C7]">
                      <Icon
                        path={isOnline ? monitorPath : buildingPath}
                        className="h-5 w-5"
                      />
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-bold tracking-tight text-[#102B4E]">
                    {course.title}
                  </h3>

                  <p className="mt-3 flex-1 text-sm leading-7 text-[#46607F]">
                    {course.summary}
                  </p>

                  <Link
                    href={course.enquiryHref}
                    className="btn btn-primary btn-sm mt-7 w-full"
                  >
                    Enquire About This Course
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <p className="eyebrow">About the Academy</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#102B4E] sm:text-4xl">
              Knowledge That Guides Understanding and Practice
            </h2>

            <div className="mt-6 space-y-5 text-base leading-8 text-[#46607F]">
              {siteConfig.about.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <Link href="/about" className="btn btn-primary mt-8">
              About Eilm Academy
            </Link>
          </div>

          <div className="pattern-light relative overflow-hidden rounded-[1.75rem] border border-[#DCE8F4] bg-[#F0F7FC] p-6 sm:p-8">
            <p className="eyebrow">Our Approach</p>

            <div className="mt-6 space-y-4">
              {[
                "Learning that is grounded in the Qur’an and Sunnah",
                "Reflection on what is studied and its message",
                "Practical application in everyday life",
              ].map((item) => (
                <div
                  key={item}
                  className="card flex items-start gap-3 p-4 sm:p-5"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#38BDF8] text-[#102B4E]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="h-4 w-4"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <p className="text-sm leading-6 font-medium text-[#102B4E]">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why choose */}
      <section className="bg-[#F0F7FC]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="eyebrow">Why Eilm Academy</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#102B4E] sm:text-4xl">
              Learn with Clarity, Purpose, and Guidance
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="card p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#102B4E] text-[#38BDF8]">
                  <Icon path={feature.path} className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-base font-bold tracking-tight text-[#102B4E]">
                  {feature.title}
                </h3>
                <p className="mt-2.5 text-sm leading-7 text-[#46607F]">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Onsite learning and venue */}
      <section id="venue" className="bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <p className="eyebrow">Our Learning Environment</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#102B4E] sm:text-4xl">
              Join Us in Islamabad
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#46607F]">
              Attend our onsite Dars e Nizami and 2-Year Ilm e Deen programs in
              an environment dedicated to Islamic learning and spiritual
              development.
            </p>

            <div className="card mt-7 flex items-start gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F0F7FC] text-[#0284C7]">
                <Icon path={pinPath} className="h-5 w-5" />
              </span>
              <div>
                <p className="text-base font-bold text-[#102B4E]">
                  {siteConfig.venue.name}
                </p>
                <p className="mt-1 text-sm leading-6 text-[#46607F]">
                  {siteConfig.venue.area}
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href={siteConfig.venue.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Get Directions
              </a>
              <Link href="/contact" className="btn btn-outline">
                Enquire About Onsite Programs
              </Link>
            </div>
          </div>

          <div className="card relative overflow-hidden p-0">
            <svg
              viewBox="0 0 640 460"
              preserveAspectRatio="xMidYMid slice"
              role="img"
              aria-label={`Map sketch showing the location of ${siteConfig.venue.name} in Islamabad`}
              className="block h-[300px] w-full sm:h-[360px] lg:h-[430px]"
            >
              <rect width="640" height="460" fill="#E8F3FC" />
              <g fill="#DCE8F4">
                <rect x="24" y="24" width="180" height="120" rx="10" />
                <rect x="238" y="24" width="200" height="88" rx="10" />
                <rect x="472" y="24" width="144" height="150" rx="10" />
                <rect x="24" y="200" width="150" height="100" rx="10" />
                <rect x="208" y="176" width="176" height="130" rx="10" />
                <rect x="418" y="212" width="198" height="88" rx="10" />
                <rect x="24" y="342" width="220" height="94" rx="10" />
                <rect x="286" y="348" width="150" height="88" rx="10" />
                <rect x="470" y="342" width="146" height="94" rx="10" />
              </g>
              <g
                stroke="#FFFFFF"
                strokeWidth="16"
                strokeLinecap="round"
                fill="none"
              >
                <path d="M-10 176H650" />
                <path d="M196 -10V470" />
                <path d="M398 -10V470" />
                <path d="M-10 320H650" />
              </g>
              <g stroke="#38BDF8" strokeOpacity="0.35" strokeWidth="3" fill="none">
                <path d="M-10 320H650" />
              </g>

              <ellipse cx="330" cy="268" rx="34" ry="10" fill="#102B4E" opacity="0.15" />
              <g transform="translate(330 218)">
                <path
                  d="M0 46s26-27 26-48A26 26 0 1 0-26-2c0 21 26 48 26 48z"
                  fill="#102B4E"
                />
                <circle cy="-3" r="9.5" fill="#38BDF8" />
              </g>
            </svg>

            <div className="absolute right-4 bottom-4 left-4 flex flex-col gap-3 rounded-2xl border border-[#DCE8F4] bg-white/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#102B4E]">
                  {siteConfig.venue.name}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-[#46607F]">
                  {siteConfig.venue.area}
                </p>
              </div>
              <a
                href={siteConfig.venue.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm shrink-0"
              >
                Open in Maps
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Admission call to action */}
      <section
        id="admission"
        className="section-dark relative overflow-hidden bg-[#102B4E] text-white"
      >
        <div className="pattern-dark absolute inset-0" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <p className="eyebrow">Admissions</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Take the Next Step in Your Islamic Learning
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/75">
              Interested in studying with Eilm Academy? Contact us to learn more
              about course availability, admission requirements, and how to
              apply.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#enquiry-form" className="btn btn-sky">
                Admission Enquiry
              </a>
              <Link href="/contact" className="btn btn-light">
                Contact Us
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <a
                href={siteConfig.contact.phoneHref}
                className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 transition-colors hover:border-[#38BDF8]/60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#38BDF8] text-[#102B4E]">
                  <Icon path={phonePath} className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-[0.68rem] font-bold tracking-[0.16em] text-white/60 uppercase">
                    Phone
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold">
                    {siteConfig.contact.phone}
                  </span>
                </span>
              </a>

              <a
                href={siteConfig.contact.emailHref}
                className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 transition-colors hover:border-[#38BDF8]/60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#38BDF8] text-[#102B4E]">
                  <Icon path={mailPath} className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-[0.68rem] font-bold tracking-[0.16em] text-white/60 uppercase">
                    Email
                  </span>
                  <span className="mt-0.5 block text-[0.82rem] leading-5 font-semibold break-words">
                    {siteConfig.contact.email}
                  </span>
                </span>
              </a>
            </div>
          </div>

          <div
            id="enquiry-form"
            className="card scroll-mt-28 rounded-[1.5rem] p-6 sm:p-8"
          >
            <p className="text-xs font-bold tracking-[0.18em] text-[#0369A1] uppercase">
              Admission Enquiry
            </p>
            <h3 className="mt-2 text-xl font-bold text-[#102B4E]">
              Send us a short message
            </h3>
            <div className="mt-6">
              <EnquiryForm idPrefix="home-enquiry" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
