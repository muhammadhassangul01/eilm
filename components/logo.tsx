type LogoProps = {
  tone?: "dark" | "light";
  size?: number;
  withWordmark?: boolean;
  className?: string;
};

export function Logo({
  tone = "dark",
  size = 38,
  withWordmark = true,
  className = "",
}: LogoProps) {
  const light = tone === "light";
  const markFill = light ? "#FFFFFF" : "#102B4E";
  const starStroke = light ? "#102B4E" : "#38BDF8";
  const centreFill = light ? "#0369A1" : "#38BDF8";

  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        aria-hidden="true"
        focusable="false"
        className="shrink-0"
      >
        <rect width="40" height="40" rx="12" fill={markFill} />
        <g
          fill="none"
          stroke={starStroke}
          strokeWidth="1.6"
          strokeLinejoin="round"
        >
          <path d="M20 6 34 20 20 34 6 20Z" />
          <path d="M10.1 10.1H29.9V29.9H10.1Z" />
        </g>
        <circle cx="20" cy="20" r="3" fill={centreFill} />
      </svg>

      {withWordmark ? (
        <span className="flex flex-col leading-none">
          <span
            className={`text-[1.02rem] font-bold tracking-tight ${
              light ? "text-white" : "text-[#102B4E]"
            }`}
          >
            Eilm <span className={light ? "text-white/75" : "text-[#173C69]"}>
              Academy
            </span>
          </span>
          <span
            className={`mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.24em] ${
              light ? "text-white/60" : "text-[#0369A1]"
            }`}
          >
            Islamic Learning
          </span>
        </span>
      ) : null}
    </span>
  );
}
