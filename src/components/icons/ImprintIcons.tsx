"use client";

import React from "react";

type IconProps = {
  size?: number;
  className?: string;
};

const SKY = "#60A5FA";      // контур
const SKY_FILL = "#E0F2FE"; // заливка ножек
const DOT = "#047857";      // emerald-700 — контрастнее на голубом
const LOH_RED = "#F87171";  // метки LOH/CNV

export function DNAHelixIcon({ size = 22, className }: IconProps) {
  // Оставляю как есть на всякий случай 
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 3.5c-2.2 2.4-2.2 4.7 0 7.1 2.2 2.4 2.2 4.7 0 7.0" stroke={SKY} strokeWidth="2" strokeLinecap="round" />
      <path d="M15 3.5c2.2 2.4 2.2 4.7 0 7.1-2.2 2.4-2.2 4.7 0 7.0" stroke={SKY} strokeWidth="2" strokeLinecap="round" />
      <path d="M9.6 5.4 L14.4 7.0" stroke={SKY} strokeWidth="2" strokeLinecap="round" />
      <path d="M9.3 8.4 L14.7 10.2" stroke={SKY} strokeWidth="2" strokeLinecap="round" />
      <path d="M9.3 13.8 L14.7 12.0" stroke={SKY} strokeWidth="2" strokeLinecap="round" />
      <path d="M9.6 16.8 L14.4 15.2" stroke={SKY} strokeWidth="2" strokeLinecap="round" />
      <path d="M9.9 19.0 L14.1 18.0" stroke={SKY} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** База X-хромосомы. Для CNV нужно удлинить правую ножку. */
function ChromosomeBase({
  size = 44,
  className,
  rightLegExtra = 0,
  children,
}: IconProps & { rightLegExtra?: number; children?: React.ReactNode }) {
  const rEnd = 35 + rightLegExtra;

  return (
    <svg width={size} height={size} viewBox="0 0 44 44" className={className}>
      <rect x="1" y="1" width="42" height="42" rx="14" fill="#F8FAFC" stroke="#E2E8F0" />

      {/* заливка */}
      <path
        d={`
          M18.2 10.2
          C16.2 13 16.6 15.8 18.8 18.2
          C21.2 20.8 21.2 23.2 18.8 25.8
          C16.6 28.2 16.2 31 18.2 33.8

          M25.8 10.2
          C27.8 13 27.4 15.8 25.2 18.2
          C22.8 20.8 22.8 23.2 25.2 25.8
          C27.4 28.2 27.8 31 25.8 ${33.8 + rightLegExtra}
        `}
        stroke={SKY_FILL}
        strokeWidth="4.8"
        strokeLinecap="round"
        fill="none"
        opacity="0.95"
      />

      {/* контур */}
      <path
        d={`
          M18 9
          C15.5 12.5 15.5 16 18 19
          C20 21.3 20 22.7 18 25
          C15.5 28 15.5 31.5 18 35

          M26 9
          C28.5 12.5 28.5 16 26 19
          C24 21.3 24 22.7 26 25
          C28.5 28 28.5 31.5 26 ${rEnd}
        `}
        stroke={SKY}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />

      {children}
    </svg>
  );
}

/** LOH/CNV метки */
function LOHBands({ mode }: { mode: "both-one" | "right-two" }) {
  const w = 4.6;
  const h = 2.2;
  const rx = 1.1;

  if (mode === "both-one") {
    return (
      <>
        <rect x="14.5" y="30.6" width={w} height={h} rx={rx} fill={LOH_RED} opacity="0.95" />
        <rect x="24.5" y="30.6" width={w} height={h} rx={rx} fill={LOH_RED} opacity="0.95" />
      </>
    );
  }

  return (
    <>
      <rect x="25.0" y="30.6" width={w} height={h} rx={rx} fill={LOH_RED} opacity="0.95" />
      <rect x="24.0" y="34.4" width={w} height={h} rx={rx} fill={LOH_RED} opacity="0.95" />
    </>
  );
}

/** SNV точки (всегда на ножках) */
function SNVDots() {
  const pts = [
   /** { x: 17.6, y: 12.3 },
    { x: 16.9, y: 16.2 },*/
    { x: 18.6, y: 19.9 },
    { x: 17.1, y: 27.7 },
   /**  { x: 18.8, y: 31.7 }, */

    { x: 26.4, y: 12.5 },
    { x: 27.1, y: 16.0 },
   /** { x: 25.4, y: 19.8 },
    { x: 27.0, y: 27.4 },
    { x: 25.2, y: 31.6 },*/
  ];

  const r = [1.15, 1.35, 1.2, 1.4, 1.25, 1.2, 1.35, 1.15, 1.4, 1.25];

  return (
    <>
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={r[i]} fill={DOT} />
      ))}
    </>
  );
}

export function ChromosomeLOHIcon({ size = 44, className }: IconProps) {
  return (
    <ChromosomeBase size={size} className={className}>
      <LOHBands mode="both-one" />
    </ChromosomeBase>
  );
}

export function ChromosomeCNVIcon({ size = 44, className }: IconProps) {
  return (
    <ChromosomeBase size={size} className={className} rightLegExtra={2.0}>
      <LOHBands mode="right-two" />
    </ChromosomeBase>
  );
}

export function ChromosomeSNVIcon({ size = 44, className }: IconProps) {
  return (
    <ChromosomeBase size={size} className={className}>
      <SNVDots />
    </ChromosomeBase>
  );
}

export function ChromosomeImprintIcon({ size = 44, className }: IconProps) {
  return (
    <ChromosomeBase size={size} className={className} rightLegExtra={2.0}>
      <LOHBands mode="both-one" />
      <LOHBands mode="right-two" />
      <SNVDots />
    </ChromosomeBase>
  );
}
