'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { useWorkflow } from '@/components/workflow/WorkflowContext';
import { PatientsStore } from '@/store/patientsStore';
import type { StoredPatient, AnalysisChannelState, AnalysisConfig } from '@/store/patientsStore';

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

const DEFAULT_CONFIG: AnalysisConfig = {
  mode: 'auto',
  thresholdPct: 0.03,
  channels: { SNV: true, CNV: true }, // fixed; UI does not expose
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

export function Step4() {
  const { state, setActiveStepId } = useWorkflow();

  const patientId = state.selectedPatient?.id ?? '';
  const patientLabel = (state.selectedPatient?.label || patientId).trim();

  const stored = patientId ? PatientsStore.findById(patientId) : undefined;

  const [cfg, setCfg] = React.useState<AnalysisConfig>(stored?.analysisConfig ?? DEFAULT_CONFIG);

  // Sync only when patient changes (avoid infinite loops due to store object identity)
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
  const imprintReady = !!stored?.imprintCreated || !!stored?.imprintSkipped;

  const snvState: AnalysisChannelState = stored?.analysisChannels?.SNV ?? 'idle';
  const cnvState: AnalysisChannelState = stored?.analysisChannels?.CNV ?? 'idle';

  const runStarted = !!stored?.analysisRunStarted;
  const runCompleted = !!stored?.analysisCompleted;

  const running =
    snvState === 'running' ||
    cnvState === 'running' ||
    (runStarted && !runCompleted);

  const canRun = imprintReady && hasPlasma && !running && !runCompleted;

  function upsertPatient(patch: Partial<StoredPatient>) {
    const base: StoredPatient = stored
      ? stored
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

  function handleRun() {
    if (!canRun) return;

    // Channels are fixed for the demo
    const fixedCfg: AnalysisConfig = { ...cfg, channels: { SNV: true, CNV: true } };

    upsertPatient({
      analysisConfig: fixedCfg,
      analysisRunStarted: true,
      analysisCompleted: false,
      analysisRunAt: new Date().toISOString(),
      analysisChannels: { SNV: 'idle', CNV: 'idle' },
    });

    // Start with SNV
    setTimeout(() => setActiveStepId('step4_snv'), 300);
  }

  const statusText = runCompleted
    ? 'Completed'
    : running
      ? 'Running…'
      : canRun
        ? 'Ready to run'
        : 'Waiting for inputs';

  const requirements: string[] = [];
  if (!imprintReady) requirements.push('Complete Step 2 (create imprint or mark tumor unavailable).');
  if (!hasPlasma) requirements.push('Add plasma timepoints in Step 3.');

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Step 4 — Review &amp; Run</div>
          <div className="mt-1 text-sm text-slate-600">
            Configure analysis and start the run.
          </div>
        </div>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-12 gap-4 items-stretch">
          {/* Patient */}
          <div className="col-span-12 lg:col-span-5 flex">
            <div className="h-full w-full rounded-2xl border border-slate-200 bg-white p-4 flex flex-col">
              <SectionTitle title="Patient" subtitle="Inputs and readiness" />

              <div className="mt-3 space-y-2">
                <InfoRow
                  label="Selected"
                  value={
                    <>
                      {patientLabel} <span className="text-slate-400">({patientId})</span>
                    </>
                  }
                />
                <InfoRow label="Indication" value={stored?.indication || state.indication || '—'} />
                <InfoRow label="Surgery date" value={stored?.surgeryDate || state.surgeryDate || '—'} />
                <InfoRow
                  label="Imprint"
                  value={stored?.imprintCreated ? 'created' : stored?.imprintSkipped ? 'skipped' : '—'}
                />
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

              {/* Mode toggle FIRST */}
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Mode</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Auto = defaults. Manual = set threshold &amp; PON.
                    </div>
                  </div>
                  <ModeToggle
                    value={cfg.mode}
                    onChange={(v) => setCfg((p) => ({ ...p, mode: v }))}
                  />
                </div>
              </div>

              {/* Manual-only settings */}
              {cfg.mode === 'manual' ? (
                <div className="mt-5 space-y-5">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">MRD threshold</div>
                    <div className="mt-1 text-xs text-slate-500">Below threshold = satisfactory.</div>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        step={0.01}
                        value={cfg.thresholdPct}
                        onChange={(e) =>
                          setCfg((p) => ({
                            ...p,
                            thresholdPct: Number(e.target.value) || p.thresholdPct,
                          }))
                        }
                        className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                      <span className="text-sm text-slate-600">%</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-900">PON (panel of normals)</div>
                    <div className="mt-1 text-xs text-slate-500">Used mainly for CNV denoising.</div>
                    <select
                      value={cfg.pon}
                      onChange={(e) => setCfg((p) => ({ ...p, pon: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="default_v1">Default PON v1</option>
                      <option value="pon_crc_v1">CRC PON v1</option>
                      <option value="pon_crc_v2">CRC PON v2</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
                  Auto mode uses default threshold and PON. Switch to Manual to customize.
                </div>
              )}

              <div className="mt-auto pt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={!canRun}
                  className={[
                    'rounded-xl px-6 py-2 text-sm font-semibold',
                    canRun
                      ? 'bg-sky-600 text-white hover:bg-sky-700'
                      : 'cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200',
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
