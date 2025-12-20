'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { useWorkflow } from '@/components/workflow/WorkflowContext';
import { PatientsStore } from '@/store/patientsStore';
import type { StoredPatient } from '@/store/patientsStore';

const PROCESS_TIME_MS = 6000;

function ProgressBar({ running }: { running: boolean }) {
  if (!running) return null;
  return (
    <div className="mt-4">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-2 w-1/3 animate-pulse rounded-full bg-slate-300" />
      </div>
      <div className="mt-2 text-xs text-slate-500">AI-denoise → segmentation → scoring…</div>
    </div>
  );
}

export function Step4Cnv() {
  const { state, activeStepId, setActiveStepId } = useWorkflow();

  const patientId = state.selectedPatient?.id ?? '';
  const patientLabel = (state.selectedPatient?.label || patientId).trim();

  const isHere = activeStepId === 'step4_cnv';

  const upsertPatient = React.useCallback(
    (patch: Partial<StoredPatient>) => {
      if (!patientId) return;

      const current = PatientsStore.findById(patientId);
      const base: StoredPatient = current
        ? current
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
    },
    [patientId, patientLabel],
  );

  React.useEffect(() => {
    if (!patientId) return;
    if (!isHere) return;

    const p = PatientsStore.findById(patientId);
    if (!p?.analysisRunStarted) return;

    const st = p.analysisChannels?.CNV ?? 'idle';

    // если уже done — возвращаемся на Step4
    if (st === 'done') {
      const t = setTimeout(() => setActiveStepId('step4'), 800);
      return () => clearTimeout(t);
    }

    upsertPatient({
      analysisChannels: {
        SNV: p.analysisChannels?.SNV ?? 'idle',
        CNV: 'running',
      },
    });

    const timer = setTimeout(() => {
      const p2 = PatientsStore.findById(patientId);

      const nextChannels = {
        SNV: p2?.analysisChannels?.SNV ?? 'idle',
        CNV: 'done',
      } as const;

      upsertPatient({
        analysisChannels: nextChannels,
        analysisCompleted: nextChannels.SNV === 'done' && nextChannels.CNV === 'done',
      });

      setActiveStepId('step4');
    }, PROCESS_TIME_MS);

    return () => clearTimeout(timer);
  }, [patientId, isHere, setActiveStepId, upsertPatient]);

  if (!patientId) {
    return (
      <div className="space-y-2">
        <div className="text-lg font-semibold">Step 4 — CNV channel</div>
        <div className="text-sm text-slate-600">Сначала выбери пациента на Step 1.</div>
      </div>
    );
  }

  const p = PatientsStore.findById(patientId);
  const st = p?.analysisChannels?.CNV ?? 'idle';

  return (
    <div className="space-y-5">
      <div>
        <div className="text-lg font-semibold">CNV channel</div>
        <div className="mt-1 text-sm text-slate-600">Read-depth + BAF + fragmentomics (demo)</div>
      </div>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">AI-denoise + CNV segmentation</div>
            <div className="mt-1 text-xs text-slate-500">Демо: прогресс → ✓ → возврат в Step 4.</div>
          </div>
          <div className="text-xs text-slate-600">
            {st === 'done' ? <span className="font-semibold text-emerald-700">✓ Done</span> : st === 'running' ? 'Running…' : 'Idle'}
          </div>
        </div>

        <ProgressBar running={st === 'running'} />

        {st === 'done' ? <div className="mt-4 text-xs text-emerald-700">✓ CNV channel completed</div> : null}
      </Card>

      <div className="text-xs text-slate-500">Time: {PROCESS_TIME_MS / 1000}s • return: step4</div>
    </div>
  );
}
