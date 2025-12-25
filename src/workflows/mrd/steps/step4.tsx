'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { useWorkflow } from '@/components/workflow/WorkflowContext';
import { PatientsStore } from '@/store/patientsStore';
import type { StoredPatient, AnalysisChannelState } from '@/store/patientsStore';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xs font-medium text-slate-900">{value}</div>
    </div>
  );
}

/**
 * Step 4 requirements (from your task list):
 * - Make blocks equal height (Patient / SNV / CNV)
 * - Remove "Reset demo"
 *
 * Implementation notes:
 * - Each "card-like" block is `h-full flex flex-col`
 * - The action button is `mt-auto` so it sticks to bottom
 */
export function Step4() {
  const { state, activeStepId, setActiveStepId } = useWorkflow();

  const selected = state.selectedPatient;
  if (!selected?.id) {
    return (
      <div className="space-y-2">
        <div className="text-lg font-semibold">Step 4 — Review &amp; Run (configurable)</div>
        <div className="text-sm text-slate-600">Select a patient in Step 1 first.</div>
      </div>
    );
  }

  const patientId: string = selected.id;
  const patientLabel: string = selected.label || patientId;

  const stored = PatientsStore.findById(patientId);

  const plasmaCount = stored?.plasmaSamples?.length ?? 0;
  const hasPlasma = plasmaCount > 0;

  const imprintReady = !!stored?.imprintCreated || !!stored?.imprintSkipped;
  const mode = stored?.imprintCreated
    ? 'tumor-informed'
    : stored?.imprintSkipped
      ? 'indication-guided (ImprintAI+)'
      : 'auto';

  const snvState: AnalysisChannelState = stored?.analysisChannels?.SNV ?? 'idle';
  const cnvState: AnalysisChannelState = stored?.analysisChannels?.CNV ?? 'idle';

  const runStarted = !!stored?.analysisRunStarted;
  const runCompleted = !!stored?.analysisCompleted;
  const running = snvState === 'running' || cnvState === 'running' || (runStarted && !runCompleted);

  const canRun = imprintReady && hasPlasma && !running && !runCompleted;

  function upsertPatient(patch: Partial<StoredPatient>) {
    const base: StoredPatient = stored
      ? stored
      : {
          id: patientId,
          label: patientLabel,
        };

    PatientsStore.upsert({
      ...base,
      ...patch,
      id: patientId,
      label: patientLabel,
    });
  }

  function handleRun() {
    if (!canRun) return;

    upsertPatient({
      analysisRunStarted: true,
      analysisCompleted: false,
      analysisRunAt: new Date().toISOString(),
      analysisChannels: { SNV: 'idle', CNV: 'idle' },
    });

    // Demo behavior kept: run starts -> open SNV substep
    setTimeout(() => setActiveStepId('step4_snv'), 600);
  }

  const statusText = runCompleted
    ? 'Completed'
    : running
      ? 'Running…'
      : canRun
        ? 'Ready to run'
        : 'Waiting for inputs';

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Step 4 — Review &amp; Run (configurable)</div>
          <div className="mt-1 text-sm text-slate-600">
            Configuration summary and run. Two channels (SNV and CNV), each with its own AI denoise.
          </div>
        </div>

        <div className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
          Mode: {mode}
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Review</div>
            <div className="mt-1 text-xs text-slate-500">
              Before running: you need an imprint (or skip) and at least one plasma timepoint.
            </div>
          </div>

          {/* ✅ Reset demo removed полностью */}
          <button
            type="button"
            onClick={handleRun}
            disabled={!canRun}
            className={[
              'rounded-full px-4 py-2 text-sm',
              canRun
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400',
            ].join(' ')}
          >
            Run analysis
          </button>
        </div>

        <div className="mt-4 grid grid-cols-12 gap-4 items-stretch">
          {/* Patient block (left) */}
          <div className="col-span-12 lg:col-span-5 flex">
            <div className="h-full w-full rounded-2xl border border-slate-200 bg-white p-4 flex flex-col">
              <div className="text-xs font-semibold text-slate-900">Patient</div>

              <div className="mt-2 space-y-2">
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

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                Status: <span className="font-semibold">{statusText}</span>
              </div>

              {!imprintReady ? (
                <div className="mt-3 text-xs text-red-600">
                  Requirement: complete Step 2 first (imprint created or tumor unavailable).
                </div>
              ) : null}

              {!hasPlasma ? <div className="mt-2 text-xs text-red-600">Requirement: add plasma in Step 3.</div> : null}

              {runCompleted ? <div className="mt-3 text-xs text-emerald-700">✓ Analysis completed</div> : null}

              {/* Spacer so height matches and looks consistent */}
              <div className="mt-auto" />
            </div>
          </div>

          {/* Channels (right) */}
          <div className="col-span-12 lg:col-span-7 flex">
            <div className="w-full grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-6 flex">
                <div className="h-full w-full rounded-2xl border border-slate-200 bg-white p-4 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">SNV channel</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Tumor-informed OR indication-guided. Noise suppression with AI-denoise.
                      </div>
                    </div>
                    <div className="text-xs text-slate-600">
                      {snvState === 'done' ? (
                        <span className="font-semibold text-emerald-700">✓ Done</span>
                      ) : snvState === 'running' ? (
                        'Running…'
                      ) : (
                        'Idle'
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveStepId('step4_snv')}
                    className="mt-auto rounded-full border border-slate-200 bg-white px-4 py-2 text-sm hover:border-slate-300"
                  >
                    Open SNV channel
                  </button>
                </div>
              </div>

              <div className="col-span-12 md:col-span-6 flex">
                <div className="h-full w-full rounded-2xl border border-slate-200 bg-white p-4 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">CNV channel</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Read-depth + BAF + fragmentomics. AI-denoise via PON.
                      </div>
                    </div>
                    <div className="text-xs text-slate-600">
                      {cnvState === 'done' ? (
                        <span className="font-semibold text-emerald-700">✓ Done</span>
                      ) : cnvState === 'running' ? (
                        'Running…'
                      ) : (
                        'Idle'
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveStepId('step4_cnv')}
                    className="mt-auto rounded-full border border-slate-200 bg-white px-4 py-2 text-sm hover:border-slate-300"
                  >
                    Open CNV channel
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 mt-1 text-xs text-slate-500">
            Demo: Run → auto SNV → auto CNV → return. Auto-jump to Step 5 is disabled.
            <span className="ml-2">(active: {activeStepId})</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
