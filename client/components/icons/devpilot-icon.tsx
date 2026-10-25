import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type GitSenseIconProps = SVGProps<SVGSVGElement> & {
  variant?: "color" | "mono";
};

/** GitSense app icon: git-fork lines + golden sparkle */
export function DevPilotIcon({
  className,
  variant = "color",
  ...props
}: GitSenseIconProps) {
  const mono = variant === "mono";
  const bg   = mono ? "currentColor" : "#2563eb";
  const fg   = mono ? "var(--background)" : "#ffffff";

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("shrink-0", className)}
      {...props}
    >
      <rect width="64" height="64" rx="15" fill={bg} />
      {/* fork lines */}
      <circle cx="22" cy="18" r="5" fill={fg} />
      <circle cx="42" cy="18" r="5" fill={fg} />
      <circle cx="22" cy="46" r="5" fill={fg} />
      <path
        d="M22 23v8M22 31c0 5 4 8 9 8h11"
        stroke={fg}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* sparkle */}
      <path
        d="M43 10l1.5 3.5L48 15l-3.5 1.5L43 20l-1.5-3.5L38 15l3.5-1.5z"
        fill="#fbbf24"
      />
    </svg>
  );
}

/** GitSense wordmark (icon + text) */
export function DevPilotLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 240 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("shrink-0", className)}
      {...props}
    >
      <rect width="64" height="64" rx="15" fill="#2563eb" />
      <circle cx="22" cy="18" r="5" fill="white" />
      <circle cx="42" cy="18" r="5" fill="white" />
      <circle cx="22" cy="46" r="5" fill="white" />
      <path d="M22 23v8M22 31c0 5 4 8 9 8h11" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M43 10l1.5 3.5L48 15l-3.5 1.5L43 20l-1.5-3.5L38 15l3.5-1.5z" fill="#fbbf24" />
      <text x="78" y="43" fontFamily="Outfit,sans-serif" fontWeight="700" fontSize="28" letterSpacing="-0.5" fill="currentColor">GitSense</text>
    </svg>
  );
}
