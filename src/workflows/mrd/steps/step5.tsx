// src/workflows/mrd/steps/step5.tsx

'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { useWorkflow } from '@/components/workflow/WorkflowContext';
import { PatientsStore } from '@/store/patientsStore';

type PlasmaSampleLite = {
  id?: string;
  drawDate?: string; // YYYY-MM-DD
  label?: string;
  tumorFractionPct?: number; // optional explicit TF (percent)
};

type StoredPatientLite = {
  id: string;
  label?: string;
  plasmaSamples?: PlasmaSampleLite[];
  imprintCreated?: boolean;
  analysisCompleted?: boolean;
  surgeryDate?: string;
  analysisConfig?: {
    thresholdPct?: number; // percent (0.02 means 0.02%)
  };
};

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

/**
 * DEMO SERIES (fixed shape):
 * - Pre-op: almost flat, slightly noisy, above threshold
 * - Surgery day: still above threshold (no drop on surgery day)
 * - Post-op: sharp drop right after surgery (first post point below threshold), then slow decay/plateau
 */
function buildSeries(patientId: string, stored: unknown, thresholdPct: number): Point[] {
  const rec = stored as StoredPatientLite | undefined;
  const samples = Array.isArray(rec?.plasmaSamples) ? rec!.plasmaSamples! : [];
  if (!samples.length) return [];

  const sorted = [...samples].sort((a, b) => (parseDate(a.drawDate || '') || 0) - (parseDate(b.drawDate || '') || 0));

  const tSurg = rec?.surgeryDate ? parseDate(rec.surgeryDate) : NaN;
  const hasSurgery = Number.isFinite(tSurg);

  const thr = clamp(thresholdPct, 0.001, 0.2); // percent units

  // target "low plateau" WELL below threshold (so it "almost always" ends below)
  const lowPlateau = clamp(thr * 0.55, 0.001, 0.2);

  // baseline above threshold for pre-op / surgery day
  const preHigh = clamp(Math.max(thr * 2.1, thr + 0.015, 0.04), 0.01, 0.12);

  // tiny deterministic jitter (never changes the overall scenario)
  const jitter = (key: string) => {
    const u = hashToUnit(`${patientId}:${key}`);
    return (u - 0.5) * 0.0012; // +/- 0.0006%
  };

  // classify points relative to surgery date
  let surgeryIdx = -1;
  const preIdxs: number[] = [];
  const postIdxs: number[] = [];

  sorted.forEach((s, i) => {
    const t = parseDate(String(s.drawDate ?? ''));
    if (!hasSurgery || !Number.isFinite(t)) return;

    // define "surgery day sample" as the one with exact same date
    if (t === tSurg && surgeryIdx === -1) surgeryIdx = i;

    if (t < tSurg) preIdxs.push(i);
    if (t > tSurg) postIdxs.push(i);
  });

  // If there is no exact surgery-day sample, treat the first >= surgery as "surgery point"
  if (hasSurgery && surgeryIdx === -1) {
    const firstGE = sorted.findIndex((s) => {
      const t = parseDate(String(s.drawDate ?? ''));
      return Number.isFinite(t) && t >= tSurg;
    });
    surgeryIdx = firstGE;
  }

  const firstPostIdx = postIdxs.length ? postIdxs[0] : -1;

  // if we don’t have surgery date, do a gentle almost-flat then decline at end
  const fallbackNoSurgery = (i: number, s: PlasmaSampleLite) => {
    const n = sorted.length;
    const u = n <= 1 ? 1 : i / (n - 1);
    // keep most of the path flat, then drop near the end
    const eased = u < 0.65 ? u * 0.05 : 0.05 + (u - 0.65) / 0.35; // 0..1-ish but flat first
    const val = preHigh + (lowPlateau - preHigh) * eased + jitter(`${s.id}:${s.drawDate}`);
    return clamp(val, 0.001, 0.12);
  };

  return sorted.map((s, i) => {
    const date = String(s.drawDate ?? '');
    const t = parseDate(date);

    const explicit = (s as PlasmaSampleLite).tumorFractionPct;
    let tf = typeof explicit === 'number' ? explicit : NaN;

    if (!Number.isFinite(tf)) {
      if (!hasSurgery || !Number.isFinite(t) || surgeryIdx === -1) {
        tf = fallbackNoSurgery(i, s);
      } else {
        // --- PRE-OP (flat) ---
        if (t < tSurg) {
          tf = preHigh + jitter(`${s.id}:${date}`);
          // keep safely above threshold
          tf = Math.max(tf, thr * 1.25);
          tf = clamp(tf, 0.001, 0.12);
        }
        // --- SURGERY DAY (still above threshold) ---
        else if (i === surgeryIdx || t === tSurg) {
          // very small change vs pre-op (still above threshold)
          tf = preHigh * 0.985 + jitter(`${s.id}:${date}`);
          tf = Math.max(tf, thr * 1.1);
          tf = clamp(tf, 0.001, 0.12);
        }
        // --- POST-OP (sharp drop right after surgery) ---
        else {
          // k: how many post-op points since the first post sample
          const k = firstPostIdx >= 0 ? Math.max(0, i - firstPostIdx) : 0;

          // first post point drops below threshold immediately
          const firstPost = clamp(thr * 0.78, 0.001, 0.2); // below threshold

          // then gently approaches lowPlateau
          const decay = 0.55; // fast initial, then plateau-ish
          tf = lowPlateau + (firstPost - lowPlateau) * Math.pow(decay, k) + jitter(`${s.id}:${date}`);

          // enforce: all post-op points must be below threshold
          tf = Math.min(tf, thr * 0.92);
          tf = clamp(tf, 0.001, 0.12);
        }
      }
    }

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

  const BLUE_LINE = '#0ea5e9';
  const BLUE_TEXT = '#0284c7';
  const BLUE_FAINT = '#0ea5e9';
  const AXIS = '#e2e8f0';
  const LABEL = '#94a3b8';

  const W = 760;
  const H = 240;

  const padL = 54;
  const padR = 24;
  const padT = 30;
  const padB = 28;

  const tsPoints = points.map((p) => p.t).filter((t) => Number.isFinite(t)) as number[];
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

  const ys = points.map((p) => p.y);
  const minY = Math.min(...ys, threshold);
  const maxY = Math.max(...ys, threshold);
  const spanY = Math.max(0.001, maxY - minY);

  const sy = (v: number) => {
    const u = (v - minY) / spanY;
    return H - padB - u * (H - padT - padB);
  };

  const pxPts = points.map((p) => ({ x: sx(p.t), y: sy(p.y) }));
  const dCurve = catmullRomToBezierPath(pxPts);

  const yThr = sy(threshold);

  const hasSurgery = Number.isFinite(tSurg);
  const xSurg = hasSurgery ? sx(tSurg) : NaN;

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

  const ticks = makeYTicks(minY, maxY);
  const gradId = 'tfBlueGrad';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-60 w-full">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BLUE_FAINT} stopOpacity="0.18" />
            <stop offset="100%" stopColor={BLUE_FAINT} stopOpacity="0.03" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />

        <path d={dCurve} fill="none" stroke={BLUE_LINE} strokeWidth="2.2" strokeLinecap="round" />

        {pxPts.map((p, i) => (
          <g key={`p_${i}`}>
            <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={BLUE_LINE} strokeWidth="2" />
          </g>
        ))}

        <line x1={padL} y1={yThr} x2={W - padR} y2={yThr} stroke={AXIS} strokeDasharray="4 4" />
        <text x={W - padR - 4} y={yThr - 6} textAnchor="end" fontSize="10" fill={LABEL}>
          Threshold {fmtPct(threshold)}
        </text>

        {hasSurgery ? (
          <>
            <line x1={xSurg} y1={padT} x2={xSurg} y2={H - padB} stroke={AXIS} strokeDasharray="4 4" />
            <text x={xSurg + 6} y={padT + 12} fontSize="10" fill={BLUE_TEXT}>
              SURGERY
            </text>
          </>
        ) : null}

        {ticks.map((v, i) => {
          const y = sy(v);
          return (
            <g key={`yt_${i}`}>
              <line x1={padL - 6} y1={y} x2={padL} y2={y} stroke={AXIS} />
              <text x={padL - 10} y={y + 3} textAnchor="end" fontSize="10" fill={LABEL}>
                {fmtPct(v)}
              </text>
            </g>
          );
        })}

        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke={AXIS} />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke={AXIS} />

        {points.map((p, i) => {
          const x = pxPts[i]?.x ?? padL;
          return (
            <text key={`xt_${i}`} x={x} y={H - 10} textAnchor="middle" fontSize="10" fill={LABEL}>
              {p.date || '—'}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function StatusModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = React.useState('');

  const patients: StoredPatientLite[] = React.useMemo(() => {
    if (!open) return [];
    return (PatientsStore.list() as unknown as StoredPatientLite[]) ?? [];
  }, [open]);

  const rows = React.useMemo(() => {
    const out: Array<{
      patientId: string;
      patientLabel: string;
      sampleId: string;
      sampleLabel: string;
      drawDate: string;
      tf: number;
      imprint: boolean;
    }> = [];

    for (const p of patients) {
      const samples = Array.isArray(p.plasmaSamples) ? p.plasmaSamples : [];

      if (!samples.length) {
        out.push({
          patientId: p.id,
          patientLabel: p.label || p.id,
          sampleId: '',
          sampleLabel: '—',
          drawDate: '—',
          tf: NaN,
          imprint: !!p.imprintCreated,
        });
        continue;
      }

      const thr = p.analysisConfig?.thresholdPct ?? 0.02;
      const series = buildSeries(p.id, p, thr);
      samples.forEach((s, i) => {
        out.push({
          patientId: p.id,
          patientLabel: p.label || p.id,
          sampleId: s.id ?? '',
          sampleLabel: s.label ?? `Plasma ${i + 1}`,
          drawDate: s.drawDate ?? '—',
          tf: series[i]?.y ?? NaN,
          imprint: !!p.imprintCreated,
        });
      });
    }

    const qq = q.trim().toLowerCase();
    return out.filter((r) => {
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
              placeholder="Search patient / sample…"
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
            />
            <div className="text-xs text-slate-500">Rows: {rows.length}</div>
          </div>

          <div className="mt-4 overflow-auto rounded-2xl border border-slate-200">
            <table className="min-w-61.25 w-full text-left text-sm">
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
                      <div className="font-medium text-slate-900">{r.patientLabel}</div>
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

          <div className="mt-3 text-xs text-slate-500">Note: tumor fraction values are demo-generated on the frontend for now.</div>
        </div>
      </div>
    </div>
  );
}

export function Step5() {
  const { state } = useWorkflow();
  const patientId = state.selectedPatient?.id ?? null;

  const [open, setOpen] = React.useState(false);

  if (!patientId) {
    return (
      <div className="space-y-2">
        <div className="text-lg font-semibold">Step 5 — Results</div>
        <div className="text-sm text-slate-600">Select a patient in Step 1 first.</div>
      </div>
    );
  }

  const stored = PatientsStore.findById(patientId) as unknown as StoredPatientLite | undefined;
  const patientLabel = state.selectedPatient?.label ?? patientId;

  // Threshold comes from Step 4 config now (no UI in Step 5)
  const threshold = stored?.analysisConfig?.thresholdPct ?? 0.02;

  const points = buildSeries(patientId, stored, threshold);
  const last = points.length ? points[points.length - 1].y : NaN;

  const below = Number.isFinite(last) ? last < threshold : false;
  const mrd = Number.isFinite(last) ? (below ? 'Below threshold' : 'Above threshold') : '—';

  const interpretation = Number.isFinite(last)
    ? below
      ? 'Likely response / lower relapse risk (demo logic)'
      : 'No response / higher relapse risk (demo logic)'
    : 'Add a plasma timepoint (Step 3) to compute MRD.';

  const imprintMode = stored?.imprintCreated ? 'tumor-informed' : 'indication-guided (ImprintAI+)';

  const minY = points.length ? Math.min(...points.map((p) => p.y)) : NaN;
  const maxY = points.length ? Math.max(...points.map((p) => p.y)) : NaN;

  const surgeryDate: string | undefined = stored?.surgeryDate || state.surgeryDate || undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-slate-700">
            Patient: <span className="font-medium text-slate-900">{patientLabel}</span>{' '}

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

          {/* ✅ Symmetric “readout” cards */}
          {points.length ? (
            <div
              className="mt-5 grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${Math.min(points.length, 4)}, minmax(0, 1fr))`,
              }}
            >
              {points.map((p, i) => (
                <div
                  key={`${p.date}_${i}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col min-h-24"
                >
                  <div className="text-xs font-semibold text-slate-800 leading-tight">{p.label}</div>
                  <div className="mt-1 text-xs text-slate-500">{p.date || '—'}</div>
                  <div className="mt-auto pt-3 text-base font-semibold text-slate-900 tabular-nums">
                    {fmtPct(p.y)}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </div>

      <StatusModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
