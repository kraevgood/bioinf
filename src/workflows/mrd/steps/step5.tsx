/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { useWorkflow } from '@/components/workflow/WorkflowContext';
import { PatientsStore } from '@/store/patientsStore';

type Point = { x: number; y: number; label: string; date: string; t: number };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function hashToUnit(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

function fmtPct(n: number) {
  // n is percent, e.g. 0.02 means 0.02%
  if (!Number.isFinite(n)) return '—';
  if (n < 0.01) return `${n.toFixed(3)}%`;
  if (n < 1) return `${n.toFixed(2)}%`;
  return `${n.toFixed(1)}%`;
}

function parseDate(d: string): number {
  const t = Date.parse(d);
  return Number.isFinite(t) ? t : NaN;
}

function buildSeries(patientId: string, stored: any): Point[] {
  const samples: any[] = Array.isArray(stored?.plasmaSamples) ? stored.plasmaSamples : [];
  if (!samples.length) return [];

  const sorted = [...samples].sort((a, b) => (parseDate(a.drawDate) || 0) - (parseDate(b.drawDate) || 0));

  // demo trend logic
  const analysisCompleted = !!stored?.analysisCompleted;
  const imprint = !!stored?.imprintCreated;

  let prev = 0;

  return sorted.map((s, i) => {
    const explicit = (s as any).tumorFractionPct;
    let tf = typeof explicit === 'number' ? explicit : NaN;

    if (!Number.isFinite(tf)) {
      const u = hashToUnit(`${patientId}:${s.id}:${s.drawDate}`);
      const base = imprint ? 0.03 : 0.06; // percent
      const noise = (u - 0.5) * (analysisCompleted ? 0.01 : 0.03);
      const trend = analysisCompleted ? -0.01 * i : -0.003 * i;
      tf = clamp(base + noise + trend, 0.001, 0.12);

      if (i > 0) tf = clamp(prev * 0.65 + tf * 0.35, 0.001, 0.12);
    }

    prev = tf;

    const date = String(s.drawDate ?? '');
    const t = parseDate(date);

    return {
      x: i,
      y: tf,
      label: String(s.label ?? `Sample ${i + 1}`),
      date,
      t: Number.isFinite(t) ? t : NaN,
    };
  });
}

/**
 * Smooth curve via Catmull–Rom to Bezier conversion.
 */
function catmullRomToBezierPath(pts: { x: number; y: number }[]) {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

  const path: string[] = [];
  path.push(`M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`);

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    path.push(
      `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    );
  }

  return path.join(' ');
}

function makeYTicks(minY: number, maxY: number) {
  // 4 ticks is enough (including min/max)
  const ticks: number[] = [];
  const steps = 3;
  for (let i = 0; i <= steps; i++) {
    const v = minY + (i / steps) * (maxY - minY);
    ticks.push(v);
  }
  return ticks;
}

function TimelinePlot({
  points,
  threshold,
  surgeryDate,
}: {
  points: Point[];
  threshold: number;
  surgeryDate?: string;
}) {
  if (!points.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        No plasma samples yet (Step 3). Add at least one timepoint to see the timeline.
      </div>
    );
  }

  // ---- COLORS (only blues inside the chart) ----
  const BLUE_LINE = '#0ea5e9'; // sky-500
  const BLUE_TEXT = '#0284c7'; // sky-600
  const BLUE_FAINT = '#0ea5e9'; // same, but via opacity
  const AXIS = '#e2e8f0';
  const LABEL = '#94a3b8'; // gray labels OK

  const W = 760;
  const H = 240;

  // extra space on the left for Y labels
  const padL = 54;
  const padR = 24;
  const padT = 22;
  const padB = 28;

  // ---- X scale by date, IMPORTANT: include surgery date in domain ----
  const tsPoints = points.map(p => p.t).filter(t => Number.isFinite(t)) as number[];
  const tSurg = surgeryDate ? parseDate(surgeryDate) : NaN;

  const domainTs = [...tsPoints];
  if (Number.isFinite(tSurg)) domainTs.push(tSurg);

  const minT = Math.min(...domainTs);
  const maxT = Math.max(...domainTs);
  const spanT = Math.max(1, maxT - minT);

  const sx = (t: number) => {
    if (!Number.isFinite(t)) return padL;
    if (domainTs.length === 1) return (padL + (W - padR)) / 2;
    const u = (t - minT) / spanT;
    return padL + u * (W - padL - padR);
  };

  // ---- Y scale (include threshold in domain) ----
  const ys = points.map(p => p.y);
  const minY = Math.min(...ys, threshold);
  const maxY = Math.max(...ys, threshold);
  const spanY = Math.max(0.001, maxY - minY);

  const sy = (v: number) => {
    const u = (v - minY) / spanY;
    return (H - padB) - u * (H - padT - padB);
  };

  const pxPts = points.map(p => ({ x: sx(p.t), y: sy(p.y) }));
  const dCurve = catmullRomToBezierPath(pxPts);

  const yThr = sy(threshold);

  const hasSurgery = Number.isFinite(tSurg);
  const xSurg = hasSurgery ? sx(tSurg) : NaN;

  // Area between curve and threshold
  const areaPath = (() => {
    if (pxPts.length < 2) {
      const x = pxPts[0]?.x ?? padL;
      const y = pxPts[0]?.y ?? yThr;
      return `M ${x} ${y} L ${x} ${yThr} Z`;
    }
    const first = pxPts[0];
    const last = pxPts[pxPts.length - 1];
    return `${dCurve} L ${last.x.toFixed(2)} ${yThr.toFixed(2)} L ${first.x.toFixed(2)} ${yThr.toFixed(2)} Z`;
  })();

  // Y ticks (include threshold visually by drawing it; ticks are generic)
  const ticks = makeYTicks(minY, maxY);

  const gradId = 'tfBlueGrad';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-60 w-full">
        <defs>
          {/* Light blue gradient: darker near curve -> lighter towards threshold */}
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BLUE_FAINT} stopOpacity="0.18" />
            <stop offset="100%" stopColor={BLUE_FAINT} stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Axes */}
        <path
          d={`M ${padL} ${padT} L ${padL} ${H - padB} L ${W - padR} ${H - padB}`}
          fill="none"
          stroke={AXIS}
        />

        {/* Y ticks + labels */}
        {ticks.map((v, i) => {
          const y = sy(v);
          const isEdge = i === 0 || i === ticks.length - 1;
          return (
            <g key={`yt_${i}`}>
              <line x1={padL - 6} y1={y} x2={padL} y2={y} stroke={AXIS} />
              {/* optional faint grid */}
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={AXIS} opacity={isEdge ? 0.35 : 0.15} />
              <text x={padL - 10} y={y + 4} textAnchor="end" fontSize="10" fill={LABEL}>
                {fmtPct(v)}
              </text>
            </g>
          );
        })}

        {/* Threshold line + label */}
        <line
          x1={padL}
          y1={yThr}
          x2={W - padR}
          y2={yThr}
          stroke={BLUE_LINE}
          strokeDasharray="6 5"
          opacity={0.55}
        />
        <text x={W - padR} y={yThr - 8} textAnchor="end" fontSize="11" fill={LABEL}>
          Threshold
        </text>

        {/* Surgery vertical dashed line in correct X position */}
        {hasSurgery ? (
          <>
            <line
              x1={xSurg}
              y1={padT}
              x2={xSurg}
              y2={H - padB}
              stroke={BLUE_LINE}
              strokeDasharray="4 4"
              opacity={0.9}
            />
            <text x={xSurg} y={padT - 6} textAnchor="middle" fontSize="11" fill={BLUE_TEXT}>
              SURGERY
            </text>
          </>
        ) : null}

        {/* Area */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Curved line (blue) */}
        <path d={dCurve} fill="none" stroke={BLUE_LINE} strokeWidth="2.4" />

        {/* Points */}
        {points.map((p, i) => (
          <g key={`${p.label}_${i}`}>
            <circle cx={sx(p.t)} cy={sy(p.y)} r={4} fill="#ffffff" stroke={BLUE_LINE} strokeWidth="2" />
          </g>
        ))}

        {/* X labels (dates) - gray */}
        {(() => {
          const idxToShow = new Set<number>();
          if (points.length <= 4) {
            points.forEach((_, i) => idxToShow.add(i));
          } else {
            idxToShow.add(0);
            idxToShow.add(points.length - 1);
            idxToShow.add(Math.floor(points.length / 2));
          }

          return points.map((p, i) => {
            if (!idxToShow.has(i)) return null;
            const x = sx(p.t);
            const y = H - 8;
            return (
              <text key={`d_${i}`} x={x} y={y} textAnchor="middle" fontSize="10" fill={LABEL}>
                {p.date || '—'}
              </text>
            );
          });
        })()}
      </svg>
    </div>
  );
}

function StatusModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = React.useState('');
  const patients = React.useMemo(() => PatientsStore.list(), []);

  const rows = React.useMemo(() => {
    const out: any[] = [];
    for (const p of patients as any[]) {
      const samples: any[] = Array.isArray(p.plasmaSamples) ? p.plasmaSamples : [];

      if (!samples.length) {
        out.push({
          patientId: p.id,
          patientLabel: p.label,
          sampleId: '',
          sampleLabel: '—',
          drawDate: '—',
          tf: NaN,
          imprint: !!p.imprintCreated,
        });
        continue;
      }

      const series = buildSeries(p.id, p);
      samples.forEach((s, i) => {
        out.push({
          patientId: p.id,
          patientLabel: p.label,
          sampleId: s.id,
          sampleLabel: s.label ?? `Sample ${i + 1}`,
          drawDate: s.drawDate ?? '—',
          tf: series[i]?.y ?? NaN,
          imprint: !!p.imprintCreated,
        });
      });
    }

    const qq = q.trim().toLowerCase();
    return out.filter(r => {
      if (!qq) return true;
      return (
        String(r.patientId).toLowerCase().includes(qq) ||
        String(r.patientLabel).toLowerCase().includes(qq) ||
        String(r.sampleLabel).toLowerCase().includes(qq)
      );
    });
  }, [patients, q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute left-1/2 top-6 w-[min(1100px,95vw)] -translate-x-1/2 rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <div className="text-base font-semibold text-slate-900">Status page (demo)</div>
            <div className="mt-1 text-xs text-slate-500">All patients and all plasma instances (demo).</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm hover:border-slate-300"
          >
            Close
          </button>
        </div>

        <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search patient / sample…"
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
            />
            <div className="text-xs text-slate-500">Rows: {rows.length}</div>
          </div>

          <div className="mt-4 overflow-auto rounded-2xl border border-slate-200">
            <table className="min-w-245 w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Plasma sample</th>
                  <th className="px-4 py-3">Draw date</th>
                  <th className="px-4 py-3">Imprint</th>
                  <th className="px-4 py-3">Tumor fraction</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={`${r.patientId}_${r.sampleId}_${idx}`} className={idx % 2 ? 'bg-white' : 'bg-slate-50/30'}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{r.patientLabel || r.patientId}</div>
                      <div className="text-xs text-slate-500">{r.patientId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-900">{r.sampleLabel}</div>
                      {r.sampleId ? <div className="text-xs text-slate-500">{r.sampleId}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.drawDate}</td>
                    <td className="px-4 py-3">
                      <Pill variant={r.imprint ? 'on' : 'off'}>{r.imprint ? 'Tumor-informed' : 'ImprintAI+'}</Pill>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{fmtPct(r.tf)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Note: tumor fraction values are demo-generated on the frontend for now.
          </div>
        </div>
      </div>
    </div>
  );
}

export function Step5() {
  const { state } = useWorkflow();
  const patientId = state.selectedPatient?.id ?? null;

  const [open, setOpen] = React.useState(false);

  // percent, e.g. 0.02 means 0.02%
  const [threshold, setThreshold] = React.useState(0.02);

  if (!patientId) {
    return (
      <div className="space-y-2">
        <div className="text-lg font-semibold">Step 5 — Results</div>
        <div className="text-sm text-slate-600">Select a patient in Step 1 first.</div>
      </div>
    );
  }

  const stored: any = PatientsStore.findById(patientId);
  const patientLabel = state.selectedPatient?.label ?? patientId;

  const points = buildSeries(patientId, stored);
  const last = points.length ? points[points.length - 1].y : NaN;

  const below = Number.isFinite(last) ? last < threshold : false;
  const mrd = Number.isFinite(last) ? (below ? 'Below threshold' : 'Above threshold') : '—';

  const interpretation = Number.isFinite(last)
    ? below
      ? 'Likely response / lower relapse risk (demo logic)'
      : 'No response / higher relapse risk (demo logic)'
    : 'Add a plasma timepoint (Step 3) to compute MRD.';

  const imprintMode = stored?.imprintCreated ? 'tumor-informed' : 'indication-guided (ImprintAI+)';

  const minY = points.length ? Math.min(...points.map(p => p.y)) : NaN;
  const maxY = points.length ? Math.max(...points.map(p => p.y)) : NaN;

  const surgeryDate: string | undefined = stored?.surgeryDate || state.surgeryDate || undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Step 5 — Results</div>
          <div className="text-sm text-slate-600">
            Patient: <span className="font-medium text-slate-900">{patientLabel}</span>{' '}
            <span className="text-slate-400">({patientId})</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm hover:border-slate-300"
        >
          Open status page
        </button>
      </div>

      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="text-xs text-slate-500">Overall tumor fraction</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{fmtPct(last)}</div>
              <div className="mt-1 text-xs text-slate-500">Mode: {imprintMode}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs text-slate-500">Threshold</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{fmtPct(threshold)}</div>
              <div className="mt-2">
                <input
                  type="number"
                  step="0.001"
                  value={threshold}
                  onChange={e => setThreshold(Number(e.target.value || 0))}
                  className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
                />
              </div>
            </div>

            <div className="min-w-60">
              <div className="text-xs text-slate-500">MRD status (demo)</div>
              <div className="mt-2">
                <Pill variant={Number.isFinite(last) ? (below ? 'on' : 'off') : 'neutral'}>{mrd}</Pill>
              </div>
              <div className="mt-2 text-xs text-slate-600">{interpretation}</div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">Tumor fraction timeline (demo)</div>
            <div className="text-xs text-slate-500">
              {points.length ? `Range: ${fmtPct(minY)} → ${fmtPct(maxY)}` : 'Range: —'}
            </div>
          </div>

          <div className="mt-4">
            <TimelinePlot points={points} threshold={threshold} surgeryDate={surgeryDate} />
          </div>

          {points.length ? (
            <div className="mt-4 grid grid-cols-12 gap-3">
              {points.map((p, i) => (
                <div key={p.label + i} className="col-span-12 sm:col-span-6 lg:col-span-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-semibold text-slate-800">{p.label}</div>
                    <div className="mt-1 text-xs text-slate-500">{p.date || '—'}</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">{fmtPct(p.y)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </div>

      <div className="text-xs text-slate-500">
        Demo note: timeline and tumor fraction values are generated deterministically on the frontend for now.
      </div>

      <StatusModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
