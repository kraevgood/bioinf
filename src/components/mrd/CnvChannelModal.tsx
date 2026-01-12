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

type StepPoint = { x: number; y: number };

function buildDemoCnvStep(seedStr: string): StepPoint[] {
  const seed = xmur3(seedStr)();
  const rnd = mulberry32(seed);

  const dipStart = 18 + Math.floor(rnd() * 4); // 18..21
  const dipEnd = dipStart + (12 + Math.floor(rnd() * 5)); // ~30..36
  const peakStart = 38 + Math.floor(rnd() * 4); // 38..41
  const peakEnd = peakStart + (5 + Math.floor(rnd() * 4)); // ~43..48

  const baseline = 1.0;
  const dip = 0.5;
  const peak = 1.8;

  const segs: Array<{ from: number; to: number; y: number }> = [
    { from: 0, to: dipStart, y: baseline },
    { from: dipStart, to: dipEnd, y: dip },
    { from: dipEnd, to: peakStart, y: baseline },
    { from: peakStart, to: peakEnd, y: peak },
    { from: peakEnd, to: 100, y: baseline },
  ];

  const pts: StepPoint[] = [];
  for (const s of segs) {
    if (pts.length === 0) {
      pts.push({ x: s.from, y: s.y });
      pts.push({ x: s.to, y: s.y });
      continue;
    }
    const prev = pts[pts.length - 1];
    if (prev.x !== s.from) pts.push({ x: s.from, y: prev.y });
    if (prev.y !== s.y) pts.push({ x: s.from, y: s.y });
    pts.push({ x: s.to, y: s.y });
  }

  return pts;
}

function CnvStepPlot({ seedStr }: { seedStr: string }) {
  const pts = React.useMemo(() => buildDemoCnvStep(seedStr), [seedStr]);

  const w = 820;
  const h = 360;

  const padL = 54;
  const padR = 18;
  const padT = 34;
  const padB = 46;

  const xMin = 0;
  const xMax = 100;

  const yMin = 0.4;
  const yMax = 1.9;

  const xToPx = (x: number) =>
    padL + ((x - xMin) / (xMax - xMin)) * (w - padL - padR);

  const yToPx = (y: number) =>
    padT + (1 - (y - yMin) / (yMax - yMin)) * (h - padT - padB);

  // grid positions (как ты делал)
  const gridX = [0, 20, 40, 60, 80, 100];
  const gridY = [0.5, 1.0, 1.5, 1.8];

  const pathD = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xToPx(p.x)} ${yToPx(p.y)}`)
    .join(" ");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-start">
      <div className="text-sm font-semibold text-slate-900">
        CNV profile (log2 ratio)
      </div>

      <div className="mt-3 overflow-x-auto">
        <svg width={w} height={h} className="block">
          <rect x={0} y={0} width={w} height={h} fill="#ffffff" />

          {/* grid Y + labels */}
          {gridY.map((yy) => (
            <g key={yy}>
              <line
                x1={padL}
                x2={w - padR}
                y1={yToPx(yy)}
                y2={yToPx(yy)}
                stroke="#e2e8f0"
                strokeWidth={1}
              />

              {/* ✅ Y tick (маленькая засечка) */}
              <line
                x1={padL - 6}
                x2={padL}
                y1={yToPx(yy)}
                y2={yToPx(yy)}
                stroke="#000000"
                strokeWidth={1}
              />

              <text
                x={padL - 10}
                y={yToPx(yy) + 4}
                textAnchor="end"
                fontSize={11}
                fill="#000000"
              >
                {yy.toFixed(1)}
              </text>
            </g>
          ))}

          {/* grid X + labels */}
          {gridX.map((xx) => (
            <g key={xx}>
              <line
                x1={xToPx(xx)}
                x2={xToPx(xx)}
                y1={padT}
                y2={h - padB}
                stroke="#f1f5f9"
                strokeWidth={1}
              />

              {/* ✅ X tick (маленькая засечка) */}
              <line
                x1={xToPx(xx)}
                x2={xToPx(xx)}
                y1={h - padB}
                y2={h - padB + 6}
                stroke="#000000"
                strokeWidth={1}
              />

              <text
                x={xToPx(xx)}
                y={h - padB + 18}
                textAnchor="middle"
                fontSize={11}
                fill="#000000"
              >
                {xx}
              </text>
            </g>
          ))}

          {/* axes (как в LOH) */}
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

          {/* step line */}
          <path d={pathD} fill="none" stroke="#2563eb" strokeWidth={2} />

          {/* y-axis label */}
          <text
            x={18}
            y={(padT + (h - padB)) / 2}
            transform={`rotate(-90 18 ${(padT + (h - padB)) / 2})`}
            textAnchor="middle"
            fontSize={12}
            fill="#000000"
          >
            Copy number signal
          </text>

          {/* x-axis label */}
          <text
            x={(padL + (w - padR)) / 2}
            y={h - 12}
            textAnchor="middle"
            fontSize={12}
            fill="#000000"
          >
            Chromosome
          </text>
        </svg>
      </div>
    </div>
  );
}

export function CnvChannelModal(props: {
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

  if (!open) return null;

  const createdAtText = imprintCreatedAt
    ? new Date(imprintCreatedAt).toLocaleString()
    : null;

  const seedStr = `${patientName}|${imprintCreatedAt ?? ""}|${
    report?.cnv.cnvSegmentsGE1_5Mb ?? 0
  }`;

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
                  CNV channel
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
            <CnvStepPlot seedStr={seedStr} />
          </div>
        </div>
      </div>
    </div>
  );
}
