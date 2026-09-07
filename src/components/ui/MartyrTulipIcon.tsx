import React, { useId } from "react";

interface MartyrTulipIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  glow?: boolean;
}

/**
 * Red Tulip Martyr Icon (نشان لاله سرخ شهدای والامقام)
 * Inspired by the authentic memorial calligraphy poster:
 * Sweeping crimson tulip cup petals, crowning diamond with the Emblem of the Islamic Republic of Iran,
 * and delicate brushstroke stem.
 */
export default function MartyrTulipIcon({
  className = "w-6 h-6",
  glow = true,
  ...props
}: MartyrTulipIconProps) {
  const id = useId().replace(/:/g, "");
  const leftGradId = `tulip-left-${id}`;
  const rightGradId = `tulip-right-${id}`;
  const topGradId = `tulip-top-${id}`;
  const stemGradId = `stem-grad-${id}`;
  const glowFilterId = `tulip-glow-${id}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 125"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id={leftGradId} x1="0%" y1="20%" x2="90%" y2="90%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="25%" stopColor="#e11d48" />
          <stop offset="60%" stopColor="#be123c" />
          <stop offset="100%" stopColor="#881337" />
        </linearGradient>

        <linearGradient id={rightGradId} x1="100%" y1="20%" x2="10%" y2="90%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="25%" stopColor="#e11d48" />
          <stop offset="60%" stopColor="#be123c" />
          <stop offset="100%" stopColor="#881337" />
        </linearGradient>

        <linearGradient id={topGradId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="40%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#9f1239" />
        </linearGradient>

        <linearGradient id={stemGradId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#be123c" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#9f1239" stopOpacity="0.75" />
          <stop offset="85%" stopColor="#881337" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#881337" stopOpacity="0" />
        </linearGradient>

        {glow && (
          <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="#e11d48" floodOpacity="0.4" />
          </filter>
        )}
      </defs>

      <g filter={glow ? `url(#${glowFilterId})` : undefined}>
        {/* Stem & dry-brush root streaks */}
        <path d="M48.5 78 Q47 96 48.5 118 Q49.8 122 51.5 118 Q53 96 51.5 78 Z" fill={`url(#${stemGradId})`} />
        <path d="M46.8 80 Q45.5 94 47 108 Q47.8 110 48.2 105 Q47.5 93 48 80 Z" fill={`url(#${stemGradId})`} opacity="0.65" />
        <path d="M51.8 80 Q53 94 52.2 110 Q52.6 112 53.2 106 Q53.8 93 52.8 80 Z" fill={`url(#${stemGradId})`} opacity="0.6" />
        <path d="M45.5 82 Q44.5 90 45.8 98 Q46.2 100 46.8 96 Q46 89 46.5 82 Z" fill={`url(#${stemGradId})`} opacity="0.4" />
        <path d="M53.5 82 Q54.5 91 53.8 100 Q54.2 102 54.8 97 Q55 90 54.2 82 Z" fill={`url(#${stemGradId})`} opacity="0.4" />

        {/* Left Main Petal (Bold, sweeping tulip-cup) */}
        <path
          d="M48.5 78
             C40 80, 24 75, 15 62
             C6 48, 6 32, 11 18
             C12 15, 14 11, 16 8
             C17 11, 21 21, 26 31
             C32 43, 40 57, 47.5 69
             Z"
          fill={`url(#${leftGradId})`}
        />

        {/* Right Petal (Slender, soaring, hugging the contour) */}
        <path
          d="M52 78
             C60 78, 73 72, 81 60
             C89 48, 90 33, 85 20
             C84 17, 82 13, 80 9
             C79 13, 75 22, 69 32
             C63 43, 56 56, 51 69
             Z"
          fill={`url(#${rightGradId})`}
        />

        {/* Top Diamond Petal (Crowning the flower) */}
        <path
          d="M50 3
             C53 8, 60 16, 66 21
             C60 26, 54 32, 50 38
             C46 32, 40 26, 34 21
             C40 16, 47 8, 50 3
             Z"
          fill={`url(#${topGradId})`}
        />

        {/* Emblem of Iran inside Top Petal in crisp white */}
        <g transform="translate(50, 21) scale(0.72)" fill="#FFFFFF">
          {/* Center vertical sword */}
          <path d="M-0.85 -11.5 L0.85 -11.5 L0.95 10.5 L-0.95 10.5 Z" />
          {/* Tashdid above blade */}
          <path d="M-2.6 -13 C-2 -14.2 -1 -14.8 0 -14.8 C1 -14.8 2 -14.2 2.6 -13 C2 -12.4 1 -11.8 0 -11.8 C-1 -11.8 -2 -12.4 -2.6 -13 Z" />

          {/* Inner left crescent */}
          <path d="M-2 -9.5 C-4.2 -4.8 -4.2 4.8 -2 9.5 C-3.1 8.3 -4.2 2.8 -4.2 0 C-4.2 -2.8 -3.1 -8.3 -2 -9.5 Z" />
          {/* Inner right crescent */}
          <path d="M2 -9.5 C4.2 -4.8 4.2 4.8 2 9.5 C3.1 8.3 4.2 2.8 4.2 0 C4.2 -2.8 3.1 -8.3 2 -9.5 Z" />

          {/* Outer left crescent */}
          <path d="M-4 -7.2 C-7.6 -2.8 -7.6 3.8 -4 7.8 C-5.3 6.1 -6.6 2.2 -6.6 0 C-6.6 -2.2 -5.3 -6.1 -4 -7.2 Z" />
          {/* Outer right crescent */}
          <path d="M4 -7.2 C7.6 -2.8 7.6 3.8 4 7.8 C5.3 6.1 6.6 2.2 6.6 0 C6.6 -2.2 5.3 -6.1 4 -7.2 Z" />
        </g>
      </g>
    </svg>
  );
}
