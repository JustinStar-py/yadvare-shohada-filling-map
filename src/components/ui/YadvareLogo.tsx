"use client";

import React from "react";
import Image from "next/image";

interface YadvareLogoProps {
  className?: string;
  size?: number;
  priority?: boolean;
  loading?: "eager" | "lazy";
  alt?: string;
}

export default function YadvareLogo({
  className = "w-10 h-10",
  size = 96,
  priority = true,
  loading = "eager",
  alt = "نشان رسمی پویش معنوی یادواره ۷۶ شهید شهیدیه میبد",
}: YadvareLogoProps) {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <Image
        src="/images/shohada/Yadvarh Shohada Logo.webp"
        alt={alt}
        width={size}
        height={size}
        priority={priority}
        loading="eager"
        className="w-full h-full object-contain select-none pointer-events-none drop-shadow-sm"
      />
    </div>
  );
}

