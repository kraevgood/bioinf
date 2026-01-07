'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { useWorkflow } from '@/components/workflow/WorkflowContext';
import { PatientsStore } from '@/store/patientsStore';
import type {
  StoredPatient,
  AnalysisConfig,
  AnalysisChannelKey,
  AnalysisChannelState,
  AnalysisChannelState as ChannelState,
} from '@/store/patientsStore';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xs font-medium text-slate-900">{value}</div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
    </div>
  );
}

function getEnrichmentModelLabel(indication: string | undefined): string {
  const raw = (indication ?? '').trim();
  return raw ? `${raw} enrichment model` : 'Cancer-type enrichment model';
}

const DEFAULT_CONFIG: AnalysisConfig = {
  mode: 'auto',
  thresholdPct: 0.03,
  channels: { SNV: true, CNV: true },
  pon: 'default_v1',
};

function ModeToggle({
  value,
  onChange,
}: {
  value: AnalysisConfig['mode'];
  onChange: (v: AnalysisConfig['mode']) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
      <button
        type="button"
        onClick={() => onChange('auto')}
        className={[
          'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
          value === 'auto' ? 'bg-sky-600 text-white' : 'text-slate-700 hover:bg-slate-50',
        ].join(' ')}
      >
        Auto
      </button>
      <button
        type="button"
        onClick={() => onChange('manual')}
        className={[
          'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
          value === 'manual' ? 'bg-sky-600 text-white' : 'text-slate-700 hover:bg-slate-50',
        ].join(' ')}
      >
        Manual
      </button>
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function Step4() {
  const { state, setActiveStepId } = useWorkflow();

  const patientId = state.selectedPatient?.id ?? '';
  const patientLabel = (state.selectedPatient?.label || patientId).trim();

  const stored = patientId ? PatientsStore.findById(patientId) : undefined;

  const [cfg, setCfg] = React.useState<AnalysisConfig>(stored?.analysisConfig ?? DEFAULT_CONFIG);

  // load per patient
  React.useEffect(() => {
    if (!patientId) {
      setCfg(DEFAULT_CONFIG);
      return;
    }
    const fresh = PatientsStore.findById(patientId);
    setCfg(fresh?.analysisConfig ?? DEFAULT_CONFIG);
  }, [patientId]);

  if (!patientId) {
    return (
      <div className="space-y-2">
        <div className="text-lg font-semibold">Step 4 — Review &amp; Run</div>
        <div className="text-sm text-slate-600">Select a patient in Step 1 first.</div>
      </div>
    );
  }

  const plasmaCount = stored?.plasmaSamples?.length ?? 0;
  const hasPlasma = plasmaCount > 0;

  const imprintCreated = !!stored?.imprintCreated;
  const imprintSkipped = !!stored?.imprintSkipped;
  const imprintReady = imprintCreated || imprintSkipped;

  const indication = stored?.indication || state.indication;

  const analysisModeLabel = imprintCreated
    ? 'Tumor-informed'
    : imprintSkipped
      ? 'ImprintAI+ (denoise-only)'
      : '—';

  const analysisModeHint = imprintCreated
    ? `Denoise + signal enrichment. Model: ${getEnrichmentModelLabel(indication)}.`
    : imprintSkipped
      ? 'Noise suppression only (not cancer-type dependent; cannot enrich signal).'
      : '';

  const snvState: ChannelState = stored?.analysisChannels?.SNV ?? 'idle';
  const cnvState: ChannelState = stored?.analysisChannels?.CNV ?? 'idle';
  const lohState: ChannelState = stored?.analysisChannels?.LOH ?? 'idle';

  const runStarted = !!stored?.analysisRunStarted;
  const runCompleted = !!stored?.analysisCompleted;

  const running =
    snvState === 'running' ||
    cnvState === 'running' ||
    lohState === 'running' ||
    (runStarted && !runCompleted);

  const canRun = imprintReady && hasPlasma && !running && !runCompleted;

  function upsertPatient(patch: Partial<StoredPatient>) {
    const fresh = PatientsStore.findById(patientId);
    const base: StoredPatient = fresh
      ? fresh
      : {
          id: patientId,
          label: patientLabel || patientId,
        };

    PatientsStore.upsert({
      ...base,
      ...patch,
      id: patientId,
      label: patientLabel || patientId,
    });
  }

  function commitCfg(next: AnalysisConfig) {
    setCfg(next);
    upsertPatient({ analysisConfig: next });
  }

  function handleRun() {
    if (!canRun) return;

    const fixedCfg: AnalysisConfig = {
      ...cfg,
      channels: imprintCreated ? { SNV: true, CNV: true, LOH: true } : { SNV: true, CNV: true, LOH: false },
    };

    const initialChannels = (
      imprintCreated
        ? { LOH: 'idle', CNV: 'idle', SNV: 'idle' }
        : { SNV: 'idle', CNV: 'idle' }
    ) satisfies Partial<Record<AnalysisChannelKey, AnalysisChannelState>>;

    upsertPatient({
      analysisConfig: fixedCfg,
      analysisRunStarted: true,
      analysisCompleted: false,
      analysisRunAt: new Date().toISOString(),
      analysisChannels: initialChannels,
    });

    const firstStep = imprintCreated ? 'step4_loh' : 'step4_snv';
    setTimeout(() => setActiveStepId(firstStep), 250);
  }

  const statusText = runCompleted ? 'Completed' : running ? 'Running…' : canRun ? 'Ready to run' : 'Waiting for inputs';

  const requirements: string[] = [];
  if (!imprintReady) requirements.push('Complete Step 2 (create imprint or mark tumor unavailable).');
  if (!hasPlasma) requirements.push('Add plasma timepoints in Step 3.');

  // Manual controls state (safe bounds)
  const threshold = clamp(cfg.thresholdPct ?? DEFAULT_CONFIG.thresholdPct, 0.001, 0.2);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="grid grid-cols-12 gap-4 items-stretch">
          {/* Patient */}
          <div className="col-span-12 lg:col-span-5 flex">
            <div className="h-full w-full rounded-2xl border border-slate-200 bg-white p-4 flex flex-col">
              <SectionTitle title="Patient" subtitle="Inputs and readiness" />

              <div className="mt-3 space-y-2">
                <InfoRow label="Selected" value={<>{patientLabel}</>} />
                <InfoRow label="Indication" value={indication || '—'} />
                <InfoRow label="Surgery date" value={stored?.surgeryDate || state.surgeryDate || '—'} />
                <InfoRow label="Imprint" value={imprintCreated ? 'created' : imprintSkipped ? 'skipped' : '—'} />
                <InfoRow label="Analysis mode" value={analysisModeLabel} />
                {analysisModeHint ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    {analysisModeHint}
                  </div>
                ) : null}
                <InfoRow label="Plasma timepoints" value={plasmaCount} />
              </div>

              <div className="mt-auto pt-4 space-y-2">
                <div
                  className={[
                    'rounded-xl px-3 py-2 text-xs',
                    runCompleted
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border border-slate-200 bg-slate-50 text-slate-700',
                  ].join(' ')}
                >
                  Status: <span className="font-semibold">{statusText}</span>
                </div>

                {requirements.length ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <div className="font-semibold">Requirements</div>
                    <ul className="mt-1 list-disc pl-4">
                      {requirements.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className="col-span-12 lg:col-span-7 flex">
            <div className="h-full w-full rounded-2xl border border-slate-200 bg-white p-4 flex flex-col">
              <SectionTitle title="Configuration" subtitle="Auto hides advanced parameters." />

              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Mode</div>
                    <div className="mt-1 text-xs text-slate-500">Auto = defaults. Manual = set threshold &amp; PON.</div>
                  </div>
                  <ModeToggle
                    value={cfg.mode}
                    onChange={(v) => commitCfg({ ...cfg, mode: v })}
                  />
                </div>
              </div>

              {/* AUTO panel */}
              {cfg.mode === 'auto' ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold text-slate-900">Auto mode uses default threshold and PON.</div>
                  <div className="mt-1 text-xs text-slate-600">
                    Defaults: threshold <span className="font-semibold">{DEFAULT_CONFIG.thresholdPct}</span>, PON{' '}
                    <span className="font-semibold">{DEFAULT_CONFIG.pon}</span>.
                  </div>
                </div>
              ) : null}

              {/* MANUAL panel */}
              {cfg.mode === 'manual' ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-900">Threshold</div>
                        <div className="mt-1 text-xs text-slate-600">MRD call threshold (fraction).</div>
                      </div>
                      <input
                        type="number"
                        value={threshold}
                        min={0.001}
                        max={0.2}
                        step={0.001}
                        onChange={(e) => {
                          const v = clamp(Number(e.target.value || '0'), 0.001, 0.2);
                          commitCfg({ ...cfg, thresholdPct: v });
                        }}
                        className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
                      />
                    </div>

                    <input
                      type="range"
                      min={0.001}
                      max={0.2}
                      step={0.001}
                      value={threshold}
                      onChange={(e) => {
                        const v = clamp(Number(e.target.value || '0'), 0.001, 0.2);
                        commitCfg({ ...cfg, thresholdPct: v });
                      }}
                      className="mt-3 w-full"
                    />

                    <div className="mt-2 text-[11px] text-slate-500">
                      Tip: typical demo range 0.01–0.05. Current: <span className="font-semibold text-slate-700">{threshold}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-900">Panel of Normals (PON)</div>
                    <div className="mt-1 text-xs text-slate-600">Choose a reference noise model.</div>

                    <select
                      value={cfg.pon ?? DEFAULT_CONFIG.pon}
                      onChange={(e) => commitCfg({ ...cfg, pon: e.target.value })}
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
                    >
                      <option value="default_v1">Default PON_v1</option>
                      <option value="default_v2">CRC PON_v1</option>
                      <option value="strict_v1">CRC PON_v2</option>
                    </select>
                  </div>
                </div>
              ) : null}

              <div className="mt-auto pt-6 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={!canRun}
                  className={[
                    'rounded-xl px-5 py-2 text-sm font-semibold transition',
                    canRun ? 'bg-sky-600 text-white hover:bg-sky-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed',
                  ].join(' ')}
                >
                  Run analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
