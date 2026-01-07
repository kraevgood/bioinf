'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { useWorkflow } from '@/components/workflow/WorkflowContext';
import { PatientsStore } from '@/store/patientsStore';
import type {
  StoredPatient,
  AnalysisChannelKey,
  AnalysisChannelState,
} from '@/store/patientsStore';

const PROCESS_TIME_MS = 4000;

function getEnrichmentModelLabel(indication: string | undefined): string {
  const raw = (indication ?? '').trim();
  return raw ? `${raw} enrichment model` : 'Cancer-type enrichment model';
}

function ProgressBar({ running }: { running: boolean }) {
  if (!running) return null;
  return (
    <div className="mt-4">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-2 w-1/3 animate-pulse rounded-full bg-slate-300" />
      </div>
      <div className="mt-2 text-xs text-slate-500">AI-denoise → BAF windows → LOH calls…</div>
    </div>
  );
}

export function Step4Loh() {
  const { state, activeStepId, setActiveStepId } = useWorkflow();

  const patientId = state.selectedPatient?.id ?? '';
  const patientLabel = (state.selectedPatient?.label || patientId).trim();
  const isHere = activeStepId === 'step4_loh';

  const upsertPatient = React.useCallback(
    (patch: Partial<StoredPatient>) => {
      if (!patientId) return;

      const current = PatientsStore.findById(patientId);
      const base: StoredPatient = current
        ? current
        : { id: patientId, label: patientLabel || patientId };

      PatientsStore.upsert({
        ...base,
        ...patch,
        id: patientId,
        label: patientLabel || patientId,
      });
    },
    [patientId, patientLabel],
  );

  React.useEffect(() => {
    if (!patientId || !isHere) return;

    const p = PatientsStore.findById(patientId);
    if (!p?.analysisRunStarted) return;

    // Guard: LOH is only meaningful in tumor-informed (imprintCreated)
    if (!p.imprintCreated) {
      setActiveStepId('step4_snv');
      return;
    }

    const st = p.analysisChannels?.LOH ?? 'idle';
    if (st === 'done') return;

    const startChannels = {
      ...(p.analysisChannels ?? {}),
      LOH: 'running',
    } satisfies Partial<Record<AnalysisChannelKey, AnalysisChannelState>>;

    upsertPatient({ analysisChannels: startChannels });

    const timer = window.setTimeout(() => {
      const p2 = PatientsStore.findById(patientId);

      const nextChannels = {
        ...(p2?.analysisChannels ?? {}),
        LOH: 'done',
      } satisfies Partial<Record<AnalysisChannelKey, AnalysisChannelState>>;

      upsertPatient({ analysisChannels: nextChannels });

      setActiveStepId('step4_cnv');
    }, PROCESS_TIME_MS);

    return () => window.clearTimeout(timer);
  }, [patientId, isHere, setActiveStepId, upsertPatient]);

  if (!patientId) {
    return (
      <div className="space-y-2">
        <div className="text-lg font-semibold">BAF / LOH channel</div>
        <div className="text-sm text-slate-600">Select a patient in Step 1 first.</div>
      </div>
    );
  }

  const p = PatientsStore.findById(patientId);
  const st = p?.analysisChannels?.LOH ?? 'idle';

  const indication = p?.indication || state.indication;

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600">
        Patient: <span className="font-medium text-slate-900">{patientLabel}</span>{' '}
         • Mode:{' '}
        <span className="font-medium text-slate-900">tumor-informed</span>
      </div>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              AI-denoise + signal enrichment + BAF/LOH inference
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Signal enrichment model: {getEnrichmentModelLabel(indication)}
            </div>
          </div>
          <div className="text-xs text-slate-600">
            {st === 'done' ? (
              <span className="font-semibold text-emerald-700">✓ Done</span>
            ) : st === 'running' ? (
              'Running…'
            ) : (
              'Idle'
            )}
          </div>
        </div>

        <ProgressBar running={st === 'running'} />
        {st === 'done' ? <div className="mt-4 text-xs text-emerald-700">✓ LOH channel completed</div> : null}
      </Card>

      <div className="text-xs text-slate-500">Time: {PROCESS_TIME_MS / 1000}s • next: step4_cnv</div>
    </div>
  );
}
