/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { useWorkflow } from '@/components/workflow/WorkflowContext';
import { PatientsStore } from '@/store/patientsStore';

type Point = { x: number; y: number; label: string; date: string };

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
  return Number.isFinite(t) ? t : 0;
}

function buildSeries(patientId: string, stored: any): Point[] {
  const samples: any[] = Array.isArray(stored?.plasmaSamples) ? stored.plasmaSamples : [];
  if (!samples.length) return [];

  const sorted = [...samples].sort((a, b) => parseDate(a.drawDate) - parseDate(b.drawDate));

  // если step4 уже «заканчивали» — делаем тренд вниз (демо-логика)
  const analysisCompleted = !!stored?.analysisCompleted;
  const imprint = !!stored?.imprintCreated;

  let prev = 0;
  return sorted.map((s, i) => {
    // если позже появится реальное поле из бэкенда
    const explicit = (s as any).tumorFractionPct;
    let tf = typeof explicit === 'number' ? explicit : NaN;

    if (!Number.isFinite(tf)) {
      // демо: маленькие проценты, детерминированно
      const u = hashToUnit(`${patientId}:${s.id}:${s.drawDate}`);
      const base = imprint ? 0.03 : 0.06; // percent
      const noise = (u - 0.5) * (analysisCompleted ? 0.01 : 0.03);
      const trend = analysisCompleted ? -0.01 * i : -0.003 * i;
      tf = clamp(base + noise + trend, 0.001, 0.12);

      // сглаживание
      if (i > 0) tf = clamp(prev * 0.65 + tf * 0.35, 0.001, 0.12);
    }

    prev = tf;
    return {
      x: i,
      y: tf,
      label: String(s.label ?? `Sample ${i + 1}`),
      date: String(s.drawDate ?? ''),
    };
  });
}

function TimelinePlot({ points }: { points: Point[] }) {
  if (!points.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        Пока нет плазменных сэмплов (Step 3). Добавь хотя бы один образец — и здесь появится график.
      </div>
    );
  }

  const W = 760;
  const H = 220;
  const pad = 22;

  const ys = points.map(p => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(0.001, maxY - minY);

  const sx = (i: number) => {
    const denom = Math.max(1, points.length - 1);
    return pad + (i / denom) * (W - pad * 2);
  };

  const sy = (v: number) => {
    const t = (v - minY) / span;
    return H - pad - t * (H - pad * 2);
  };

  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(p.y).toFixed(1)}`)
    .join(' ');

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-55 w-full">
        <path
          d={`M ${pad} ${pad} L ${pad} ${H - pad} L ${W - pad} ${H - pad}`}
          fill="none"
          stroke="#e2e8f0"
        />
        <path d={d} fill="none" stroke="#0f172a" strokeWidth="2" />
        {points.map((p, i) => (
          <g key={p.label + i}>
            <circle cx={sx(i)} cy={sy(p.y)} r={4} fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
          </g>
        ))}
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
            <div className="mt-1 text-xs text-slate-500">
              Список всех пациентов и всех инстансов плазмы (как в PDF-таблице).
            </div>
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
                  <tr
                    key={`${r.patientId}_${r.sampleId}_${idx}`}
                    className={idx % 2 ? 'bg-white' : 'bg-slate-50/30'}
                  >
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
            Примечание: сейчас TF — демо-значения. Позже заменим на реальные результаты из анализа.
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
        <div className="text-sm text-slate-600">Сначала выбери пациента на Step 1.</div>
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
      ? 'Вероятный ответ на терапию / низкий риск рецидива (демо-логика)'
      : 'Нет ответа / высокий риск рецидива (демо-логика)'
    : 'Добавь плазменный сэмпл (Step 3), чтобы рассчитать MRD.';

  const imprintMode = stored?.imprintCreated ? 'tumor-informed' : 'indication-guided (ImprintAI+)';

  const minY = points.length ? Math.min(...points.map(p => p.y)) : NaN;
  const maxY = points.length ? Math.max(...points.map(p => p.y)) : NaN;

  return (
    <div className="space-y-5">
      {/* header */}
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

      {/* ====== LAYOUT: SUMMARY ON TOP, TIMELINE BELOW ====== */}
      <div className="space-y-4">
        {/* Summary (horizontal) */}
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

        {/* Timeline (chart + timepoints) */}
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">Tumor fraction timeline (demo)</div>
            <div className="text-xs text-slate-500">
              {points.length ? `Range: ${fmtPct(minY)} → ${fmtPct(maxY)}` : 'Range: —'}
            </div>
          </div>

          <div className="mt-4">
            <TimelinePlot points={points} />
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
        Для демо: график и TF сейчас считаются детерминированно на фронте. Позже заменим на реальные результаты из анализа.
      </div>

      <StatusModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
