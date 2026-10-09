import Image from "next/image";

type LogoProps = {
  className?: string;
  priority?: boolean;
  sizes?: string;
};

export function Logo({ className = "", priority = false, sizes }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Eilm Academy"
      width={656}
      height={380}
      priority={priority}
      sizes={sizes}
      className={className}
    />
  );
}
