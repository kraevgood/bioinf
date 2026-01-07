"use client";

import React from "react";

export default function Logo({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  // Imprinta-style logo: rounded gradient square + rounded white wedge
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Imprinta logo"
      role="img"
    >
      <defs>
        <linearGradient id="imprinta_g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        <filter id="imprinta_shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#2563EB" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* background */}
      <rect x="0" y="0" width="40" height="40" rx="12" fill="url(#imprinta_g)" filter="url(#imprinta_shadow)" />

      {/* inner rounded wedge */}
      <path
        d="
          M12.4 11.0
          Q11.0 11.0 11.0 12.4
          L11.0 27.6
          Q11.0 29.0 12.4 29.0
          L24.9 29.0
          Q26.2 29.0 26.6 27.7
          L29.1 13.3
          Q29.4 12.1 28.4 11.4
          Q27.8 11.0 27.2 11.0
          Z
        "
        fill="rgba(255,255,255,0.90)"
      />
    </svg>
  );
}
