export function AcademyVisual({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.65)]">
        <svg
          viewBox="0 0 560 680"
          role="img"
          aria-label="Illustration of the Eilm Academy learning environment in Islamabad"
          className="block h-full w-full"
        >
          <defs>
            <linearGradient id="academy-sky" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0B2244" />
              <stop offset="55%" stopColor="#123457" />
              <stop offset="100%" stopColor="#0A1B33" />
            </linearGradient>
            <radialGradient id="academy-glow" cx="50%" cy="26%" r="55%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
            </radialGradient>
            <pattern
              id="academy-stars"
              width="72"
              height="72"
              patternUnits="userSpaceOnUse"
            >
              <g
                fill="none"
                stroke="#FFFFFF"
                strokeOpacity="0.07"
                strokeWidth="1"
              >
                <path d="M36 10 62 36 36 62 10 36Z" />
                <path d="M17.6 17.6H54.4V54.4H17.6Z" />
              </g>
            </pattern>
          </defs>

          <rect width="560" height="680" fill="url(#academy-sky)" />
          <rect width="560" height="680" fill="url(#academy-stars)" />
          <rect width="560" height="680" fill="url(#academy-glow)" />

          {/* Minarets */}
          <g stroke="#38BDF8" strokeOpacity="0.5" strokeWidth="2" fill="#0C2344">
            <path d="M70 600V260h34v340Z" />
            <path d="M64 260c6-32 22-52 23-64 1 12 17 32 23 64Z" fill="#123457" />
            <path d="M87 196v-22" fill="none" />
            <circle cx="87" cy="168" r="6" fill="#38BDF8" stroke="none" />
            <path d="M62 330h50v14H62Z" fill="#123457" />
            <path d="M62 440h50v14H62Z" fill="#123457" />
            <path d="M76 372h22v34H76Z" fill="#0A1B33" strokeOpacity="0.35" />

            <path d="M456 600V260h34v340Z" />
            <path d="M450 260c6-32 22-52 23-64 1 12 17 32 23 64Z" fill="#123457" />
            <path d="M473 196v-22" fill="none" />
            <circle cx="473" cy="168" r="6" fill="#38BDF8" stroke="none" />
            <path d="M448 330h50v14h-50Z" fill="#123457" />
            <path d="M448 440h50v14h-50Z" fill="#123457" />
            <path d="M462 372h22v34h-22Z" fill="#0A1B33" strokeOpacity="0.35" />
          </g>

          {/* Main arch */}
          <path
            d="M170 600V300c0-80 62-136 110-170 48 34 110 90 110 170v300Z"
            fill="#0E2A4E"
            stroke="#38BDF8"
            strokeOpacity="0.55"
            strokeWidth="2.5"
          />
          <path
            d="M196 600V308c0-66 52-114 84-142 32 28 84 76 84 142v292Z"
            fill="#0A1B33"
            fillOpacity="0.75"
            stroke="#FFFFFF"
            strokeOpacity="0.16"
            strokeWidth="1.5"
          />

          {/* Eight-pointed star inside the arch */}
          <g
            transform="translate(280 330)"
            fill="none"
            stroke="#38BDF8"
            strokeOpacity="0.85"
            strokeWidth="2"
            strokeLinejoin="round"
          >
            <path d="M0-58 58 0 0 58-58 0Z" />
            <path d="M-41-41H41V41H-41Z" />
            <circle r="10" strokeOpacity="0.6" />
          </g>

          {/* Rays */}
          <g stroke="#38BDF8" strokeOpacity="0.28" strokeWidth="2" strokeLinecap="round">
            <path d="M280 232v-34" />
            <path d="M203 263l-24-24" />
            <path d="M357 263l24-24" />
            <path d="M175 330h-34" />
            <path d="M385 330h34" />
          </g>

          {/* Base plinth with arch openings */}
          <g fill="#0A1B33" stroke="#38BDF8" strokeOpacity="0.3" strokeWidth="1.5">
            <path d="M120 600v-70c0-24 20-42 45-42s45 18 45 42v70Z" fillOpacity="0.7" />
            <path d="M350 600v-70c0-24 20-42 45-42s45 18 45 42v70Z" fillOpacity="0.7" />
          </g>

          <rect y="600" width="560" height="80" fill="#081527" />
          <path
            d="M0 600h560"
            stroke="#38BDF8"
            strokeOpacity="0.45"
            strokeWidth="2"
          />
        </svg>

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#081527]/70 via-transparent to-transparent"
          aria-hidden="true"
        />
      </div>

      <div className="absolute -top-4 -left-4 hidden rounded-2xl border border-[#102B4E]/10 bg-white px-4 py-3 shadow-lg sm:block">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#0369A1]">
          Online Program
        </p>
        <p className="mt-1 text-sm font-semibold text-[#102B4E]">
          Fehm e Quran Course
        </p>
      </div>

      <div className="absolute -right-4 -bottom-4 hidden rounded-2xl border border-white/15 bg-[#102B4E] px-4 py-3 shadow-lg sm:block">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#38BDF8]">
          Onsite Programs
        </p>
        <p className="mt-1 text-sm font-semibold text-white">Islamabad</p>
      </div>
    </div>
  );
}
