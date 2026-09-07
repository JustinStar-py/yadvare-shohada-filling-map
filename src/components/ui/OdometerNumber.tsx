"use client";

import React from "react";
import { toPersianDigits } from "@/lib/utils";

interface OdometerNumberProps {
  value: number;
  className?: string;
  usePersian?: boolean;
  vertical?: boolean;
  showCommas?: boolean;
}

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const ENGLISH_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

interface SingleDigitProps {
  digit: number;
  usePersian: boolean;
}

function SingleDigit({ digit, usePersian }: SingleDigitProps) {
  const digits = usePersian ? PERSIAN_DIGITS : ENGLISH_DIGITS;
  const safeDigit = Math.max(0, Math.min(9, Math.floor(Number(digit) || 0)));

  return (
    <span
      className="relative inline-block h-[1.18em] overflow-hidden align-middle tabular-nums leading-none select-none text-center"
      style={{ width: "0.85em", minWidth: "0.85em" }}
      aria-hidden="true"
    >
      <span
        className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] text-current"
        style={{
          transform: `translateY(-${safeDigit * 10}%)`,
          willChange: "transform",
        }}
      >
        {digits.map((d, idx) => (
          <span
            key={idx}
            className="flex items-center justify-center h-[1.18em] leading-none text-current"
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function OdometerNumber({
  value,
  className = "",
  usePersian = true,
  vertical = false,
  showCommas = !vertical,
}: OdometerNumberProps) {
  const safeVal = Math.max(0, Math.floor(Number(value) || 0));
  const rawStr = safeVal.toString();
  const formattedStr = showCommas ? safeVal.toLocaleString("en-US") : rawStr;

  const chars = formattedStr.split("");
  const totalChars = chars.length;

  return (
    <div
      className={`tabular-nums select-none ${
        vertical
          ? "inline-flex flex-col items-center justify-center gap-0.5 sm:gap-1"
          : "inline-flex items-center justify-center tracking-tight"
      } ${className}`}
      style={{ direction: "ltr" }}
      role="status"
      aria-live="polite"
      aria-label={usePersian ? toPersianDigits(safeVal) : rawStr}
    >
      {chars.map((char, index) => {
        const placeFromRight = totalChars - 1 - index;
        if (char === ",") {
          return (
            <span
              key={`sep-${placeFromRight}`}
              className="inline-block px-[0.04em] text-[0.82em] leading-none opacity-80 select-none align-middle text-current"
              aria-hidden="true"
            >
              {usePersian ? "٬" : ","}
            </span>
          );
        }

        const digitVal = parseInt(char, 10);
        if (isNaN(digitVal)) {
          return (
            <span key={`char-${placeFromRight}`} className="text-current">
              {char}
            </span>
          );
        }

        return (
          <SingleDigit
            key={`pos-${placeFromRight}`}
            digit={digitVal}
            usePersian={usePersian}
          />
        );
      })}
    </div>
  );
}

