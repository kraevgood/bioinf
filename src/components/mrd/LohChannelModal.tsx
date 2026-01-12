"use client";

import React from "react";
import type { ImprintReport } from "@/store/patientsStore";

function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Point = { x: number; y: number };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/**
 * Make a plot that visually matches the reference:
 * - Long baseline at y=0.5 on the left (x ~ 0..20)
 * - LOH block with split bands (y~0.95 and y~0.05) around x ~ 20..35
 * - Small “islands” around x ~ 38..45 at y~0.66 / 0.34 + small y~0.5 segment
 * - Long baseline at y=0.5 on the right (x ~ 45..100)
 */
function buildDemoLohPoints(seedStr: string): Point[] {
  const seed = xmur3(seedStr)();
  const rnd = mulberry32(seed);

  const points: Point[] = [];

  const pushBandRange = (
    x0: number,
    x1: number,
    y: number,
    n: number,
    yJitter = 0.01,
    xJitter = 0.25
  ) => {
    for (let i = 0; i < n; i += 1) {
      const baseX = x0 + rnd() * (x1 - x0);
      const xx = baseX + (rnd() - 0.5) * xJitter;
      const yy = clamp(y + (rnd() - 0.5) * yJitter, 0, 1);
      points.push({ x: xx, y: yy });
    }
  };

  // Baseline left: looks like a near-continuous band at 0.5 from 0..20
  pushBandRange(0, 20, 0.5, 520, 0.004, 0.08);

  // LOH zone 20..35: split bands at top and bottom
  pushBandRange(20, 35, 0.95, 160, 0.012, 0.12);
  pushBandRange(20, 35, 0.05, 160, 0.012, 0.12);

  // Small islands around ~40 at intermediate bands (like reference)
  pushBandRange(38, 46, 0.66, 34, 0.015, 0.14);
  pushBandRange(38, 46, 0.34, 34, 0.015, 0.14);

  // Tiny baseline segment around ~40 at 0.5 (short)
  pushBandRange(36, 43, 0.5, 46, 0.006, 0.10);

  // Baseline right: near-continuous at 0.5 from 45..100
  pushBandRange(45, 100, 0.5, 720, 0.004, 0.08);

  return points;
}

function LohScatter({ seedStr }: { seedStr: string }) {
  const pts = React.useMemo(() => buildDemoLohPoints(seedStr), [seedStr]);

  // Match “matplotlib default” proportions
  const w = 820;
  const h = 360;

  // More “matplotlib-like” margins
  const padL = 62;
  const padR = 18;
  const padT = 34;
  const padB = 54;

  const xMin = 0;
  const xMax = 100;

  const xToPx = (x: number) =>
    padL + ((x - xMin) / (xMax - xMin)) * (w - padL - padR);
  const yToPx = (y: number) => padT + (1 - y) * (h - padT - padB);

  const ticksY = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  const ticksX = [0, 20, 40, 60, 80, 100];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <svg width={w} height={h} className="block">
        {/* background */}
        <rect x={0} y={0} width={w} height={h} fill="#ffffff" />

        {/* Title (matplotlib-like) */}
        <text
          x={w / 2}
          y={18}
          textAnchor="middle"
          fontSize={16}
          fill="#000000"
        >
          LOH / BAF profile
        </text>

        {/* Axes lines (black) */}
        <line
          x1={padL}
          x2={w - padR}
          y1={h - padB}
          y2={h - padB}
          stroke="#000000"
          strokeWidth={1.2}
        />
        <line
          x1={padL}
          x2={padL}
          y1={padT}
          y2={h - padB}
          stroke="#000000"
          strokeWidth={1.2}
        />

        {/* Y ticks + labels */}
        {ticksY.map((yy) => {
          const ypx = yToPx(yy);
          return (
            <g key={yy}>
              <line
                x1={padL - 6}
                x2={padL}
                y1={ypx}
                y2={ypx}
                stroke="#000000"
                strokeWidth={1}
              />
              <text
                x={padL - 10}
                y={ypx + 4}
                textAnchor="end"
                fontSize={12}
                fill="#000000"
              >
                {yy.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* X ticks + labels */}
        {ticksX.map((xx) => {
          const xpx = xToPx(xx);
          return (
            <g key={xx}>
              <line
                x1={xpx}
                x2={xpx}
                y1={h - padB}
                y2={h - padB + 6}
                stroke="#000000"
                strokeWidth={1}
              />
              <text
                x={xpx}
                y={h - padB + 22}
                textAnchor="middle"
                fontSize={12}
                fill="#000000"
              >
                {xx}
              </text>
            </g>
          );
        })}

        {/* Points ( default blue) */}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={xToPx(p.x)}
            cy={yToPx(p.y)}
            r={1.2}
            fill="#1f77b4"
            opacity={1}
          />
        ))}

        {/* y-axis label */}
        <text
          x={18}
          y={(padT + (h - padB)) / 2}
          transform={`rotate(-90 18 ${(padT + (h - padB)) / 2})`}
          textAnchor="middle"
          fontSize={13}
          fill="#000000"
        >
          B-allele frequency
        </text>

        {/* x-axis label */}
        <text
          x={(padL + (w - padR)) / 2}
          y={h - 12}
          textAnchor="middle"
          fontSize={13}
          fill="#000000"
        >
          Chromosome
        </text>
      </svg>
    </div>
  );
}

export function LohChannelModal(props: {
  open: boolean;
  onClose: () => void;
  patientName: string;
  imprintCreatedAt?: string;
  report?: ImprintReport;
}) {
  const { open, onClose, patientName, imprintCreatedAt, report } = props;

  React.useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const createdAtText = imprintCreatedAt
    ? new Date(imprintCreatedAt).toLocaleString()
    : null;

  const seedStr = `${patientName}|${imprintCreatedAt ?? ""}|${
    report?.loh.lohWindows1Mb ?? 0
  }`;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
      />

      <div className="absolute left-1/2 top-1/2 w-[min(980px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.25)] overflow-hidden">
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  LOH channel
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Patient:{" "}
                  <span className="font-semibold text-slate-900">
                    {patientName}
                  </span>
                  {createdAtText ? (
                    <span className="ml-2">• {createdAtText}</span>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>

          <div className="max-h-[75vh] overflow-auto p-5">
            <LohScatter seedStr={seedStr} />
          </div>
        </div>
      </div>
    </div>
  );
}
