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
      <div className="mt-2 text-xs text-slate-500">AI-denoise → calling → scoring…</div>
    </div>
  );
}

export function Step4Snv() {
  const { state, activeStepId, setActiveStepId } = useWorkflow();

  // ⚠️ хуки должны быть всегда, поэтому делаем значения, которые могут быть пустыми
  const patientId = state.selectedPatient?.id ?? '';
  const patientLabel = (state.selectedPatient?.label || patientId).trim();

  const isHere = activeStepId === 'step4_snv';

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

    const st = p.analysisChannels?.SNV ?? 'idle';

    // если уже done — пролистываем к CNV
    if (st === 'done') {
      const t = setTimeout(() => setActiveStepId('step4_cnv'), 800);
      return () => clearTimeout(t);
    }

    // mark running
    upsertPatient({
      analysisChannels: {
        SNV: 'running',
        CNV: p.analysisChannels?.CNV ?? 'idle',
      },
    });

    const timer = setTimeout(() => {
      const p2 = PatientsStore.findById(patientId);

      upsertPatient({
        analysisChannels: {
          SNV: 'done',
          CNV: p2?.analysisChannels?.CNV ?? 'idle',
        },
      });

      setActiveStepId('step4_cnv');
    }, PROCESS_TIME_MS);

    return () => clearTimeout(timer);
  }, [patientId, isHere, setActiveStepId, upsertPatient]);

  // ✅ теперь можно условно рендерить, потому что все хуки уже вызваны
  if (!patientId) {
    return (
      <div className="space-y-2">
        <div className="text-lg font-semibold">Step 4 — SNV channel</div>
        <div className="text-sm text-slate-600">Сначала выбери пациента на Step 1.</div>
      </div>
    );
  }

  const p = PatientsStore.findById(patientId);
  const st = p?.analysisChannels?.SNV ?? 'idle';
  const mode = p?.imprintCreated ? 'tumor-informed' : p?.imprintSkipped ? 'indication-guided (ImprintAI+)' : 'auto';

  return (
    <div className="space-y-5">
      <div>
        <div className="text-lg font-semibold">SNV channel</div>
        <div className="mt-1 text-sm text-slate-600">
          Mode: <span className="font-medium text-slate-900">{mode}</span>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">AI-denoise + SNV calling</div>
            <div className="mt-1 text-xs text-slate-500">Демо: прогресс → ✓ → переход к CNV.</div>
          </div>
          <div className="text-xs text-slate-600">
            {st === 'done' ? <span className="font-semibold text-emerald-700">✓ Done</span> : st === 'running' ? 'Running…' : 'Idle'}
          </div>
        </div>

        <ProgressBar running={st === 'running'} />

        {st === 'done' ? <div className="mt-4 text-xs text-emerald-700">✓ SNV channel completed</div> : null}
      </Card>

      <div className="text-xs text-slate-500">Time: {PROCESS_TIME_MS / 1000}s • next: step4_cnv</div>
    </div>
  );
}
