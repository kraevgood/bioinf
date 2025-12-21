'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { useWorkflow } from '@/components/workflow/WorkflowContext';
import { PatientsStore } from '@/store/patientsStore';
import type { ImprintModuleKey } from '@/store/patientsStore';

type FileSlotKey = 'nR1' | 'nR2' | 'tR1' | 'tR2';

type Slot = {
  key: FileSlotKey;
  title: string;
  file: File | null;
  error?: string;
};

const VALIDATE_TIME_MS = 3000; // имитация времени валидации (3s)
const PROCESS_TIME_MS = 4000; // время демо-сканирования сабстепа

function extOk(name: string) {
  const n = name.toLowerCase();
  return n.endsWith('.fastq') || n.endsWith('.fq') || n.endsWith('.fastq.gz') || n.endsWith('.fq.gz');
}

function bytesToHuman(n: number) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v = v / 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={[
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700',
        className,
      ].join(' ')}
      aria-label="loading"
    />
  );
}

function FileUploadRow({
  title,
  file,
  error,
  disabled,
  validating,
  validatedOk,
  onPick,
  onClear,
}: {
  title: string;
  file: File | null;
  error?: string;
  disabled: boolean;
  validating: boolean;
  validatedOk: boolean;
  onPick: (f: File | null) => void;
  onClear: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const border = error ? 'border-red-200' : validatedOk ? 'border-emerald-200' : 'border-slate-200';
  const bg = error ? 'bg-red-50' : validatedOk ? 'bg-emerald-50' : 'bg-white';

  return (
    <div className="space-y-1">
      <div className="text-xs text-slate-500">{title}</div>

      <div className={['rounded-2xl border px-4 py-3', border, bg].join(' ')}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {file ? (
              <div className="truncate text-sm">
                <span className="font-medium text-slate-900">{file.name}</span>{' '}
                <span className="text-slate-400">({bytesToHuman(file.size)})</span>
              </div>
            ) : (
              <div className="text-sm text-slate-500">No file selected</div>
            )}

            {error ? <div className="mt-1 text-xs text-red-700">{error}</div> : null}
            {!error && validatedOk ? <div className="mt-1 text-xs text-emerald-700">✓ Validated</div> : null}
          </div>

          <div className="flex items-center gap-2">
            {validating ? <Spinner /> : null}
            {!validating && validatedOk ? <span className="text-emerald-700 text-sm font-semibold">✓</span> : null}

            <input
              ref={inputRef}
              type="file"
              className="hidden"
              disabled={disabled}
              accept=".fastq,.fq,.fastq.gz,.fq.gz"
              onChange={e => onPick(e.target.files?.[0] ?? null)}
            />

            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className={[
                'rounded-xl border px-3 py-2 text-xs font-semibold',
                disabled
                  ? 'border-slate-200 bg-slate-100 text-slate-400'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              ].join(' ')}
            >
              Browse
            </button>

            <button
              type="button"
              disabled={disabled || !file}
              onClick={onClear}
              className={[
                'rounded-xl border px-3 py-2 text-xs font-semibold',
                disabled || !file
                  ? 'border-slate-200 bg-slate-100 text-slate-400'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              ].join(' ')}
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScanCard({
  title,
  subtitle,
  running,
  done,
}: {
  title: string;
  subtitle: string;
  running: boolean;
  done: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
        </div>
        <div className="text-xs text-slate-600">
          {done ? <span className="font-semibold text-emerald-700">✓ Done</span> : running ? 'Scanning…' : 'Idle'}
        </div>
      </div>

      {running ? (
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-2 w-1/3 animate-pulse rounded-full bg-slate-300" />
          </div>
          <div className="mt-2 text-xs text-slate-500">Analyzing reads, suppressing noise, extracting features…</div>
        </div>
      ) : null}

      {done ? <div className="mt-4 text-xs text-emerald-700">✓ Completed</div> : null}
    </div>
  );
}

export function Step2() {
  const { state, activeStepId, setActiveStepId } = useWorkflow();
  const patientId = state.selectedPatient?.id ?? null;

  const isMain = activeStepId === 'step2';
  const isLoh = activeStepId === 'step2_loh';
  const isCnv = activeStepId === 'step2_cnv';
  const isSnv = activeStepId === 'step2_snv';

  const [tumorAvailable, setTumorAvailable] = React.useState(true);

  const [slots, setSlots] = React.useState<Slot[]>([
    { key: 'nR1', title: 'Normal FASTQ — R1', file: null },
    { key: 'nR2', title: 'Normal FASTQ — R2', file: null },
    { key: 'tR1', title: 'Tumor FASTQ — R1', file: null },
    { key: 'tR2', title: 'Tumor FASTQ — R2', file: null },
  ]);

  const [busy, setBusy] = React.useState(false);
  const [validating, setValidating] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!patientId) return;
    const p = PatientsStore.findById(patientId);
    if (p?.tumorAvailable !== undefined) setTumorAvailable(!!p.tumorAvailable);
  }, [patientId]);

  function upsertPatient(patch: Record<string, unknown>) {
    if (!patientId) return;
    PatientsStore.upsert({
      id: patientId,
      label: state.selectedPatient?.label || patientId,
      ...patch,
    });
  }

  function setSlotFile(key: FileSlotKey, file: File | null) {
    setSlots(prev =>
      prev.map(s => {
        if (s.key !== key) return s;
        return { ...s, file, error: undefined };
      }),
    );
    setGlobalError(null);

    // поменяли файлы → сбросили валидацию
    if (patientId) upsertPatient({ imprintValidated: false });
  }

  function clearSlot(key: FileSlotKey) {
    setSlotFile(key, null);
  }

  function validateInputs(): boolean {
    setGlobalError(null);
    let ok = true;

    setSlots(prev =>
      prev.map(s => {
        const isTumor = s.key === 'tR1' || s.key === 'tR2';
        if (isTumor && !tumorAvailable) return { ...s, error: undefined };

        if (!s.file) {
          ok = false;
          return { ...s, error: 'File required' };
        }
        if (!extOk(s.file.name)) {
          ok = false;
          return { ...s, error: 'Invalid extension (fastq/fq/fastq.gz/fq.gz)' };
        }
        if (s.file.size <= 0) {
          ok = false;
          return { ...s, error: 'File is empty' };
        }
        return { ...s, error: undefined };
      }),
    );

    if (!ok) setGlobalError('Fix file errors first.');
    return ok;
  }

  function haveAllRequiredFiles(): boolean {
    const nR1 = slots.find(s => s.key === 'nR1')?.file;
    const nR2 = slots.find(s => s.key === 'nR2')?.file;
    if (!nR1 || !nR2) return false;

    if (!tumorAvailable) return true;

    const tR1 = slots.find(s => s.key === 'tR1')?.file;
    const tR2 = slots.find(s => s.key === 'tR2')?.file;
    return !!(tR1 && tR2);
  }

  async function handleValidate() {
    if (!patientId) return;

    if (!tumorAvailable) {
      upsertPatient({
        tumorAvailable,
        imprintSkipped: true,
        imprintSkipReason: 'no_tumor',
        imprintValidated: false,
      });
      setGlobalError(null);
      return;
    }

    if (!haveAllRequiredFiles()) {
      setGlobalError('Upload all required FASTQ files first (Normal R1/R2 + Tumor R1/R2).');
      validateInputs();
      return;
    }

    const ok = validateInputs();
    if (!ok) return;

    setBusy(true);
    setValidating(true);

    await new Promise<void>(resolve => setTimeout(resolve, VALIDATE_TIME_MS));

    upsertPatient({
      tumorAvailable,
      imprintSkipped: false,
      imprintSkipReason: undefined,
      imprintValidated: true,
      imprintValidationAt: new Date().toISOString(),
    });

    setBusy(false);
    setValidating(false);
  }

  function handleNext() {
    if (!patientId) return;

    const stored = PatientsStore.findById(patientId);

    if (!tumorAvailable) {
      setActiveStepId('step3');
      return;
    }

    if (!stored?.imprintValidated) {
      setGlobalError('Validate files first.');
      return;
    }

    if (stored.imprintRunStarted) return;

    upsertPatient({
      imprintRunStarted: true,
      imprintInputsReady: true,
      imprintCreated: false,
      imprintCreatedAt: '',
      imprintModules: { LOH: 'idle', CNV: 'idle', SNV: 'idle' },
    });

    setTimeout(() => setActiveStepId('step2_loh'), 800);
  }

  React.useEffect(() => {
    if (!patientId) return;

    const moduleKey: ImprintModuleKey | null = isLoh ? 'LOH' : isCnv ? 'CNV' : isSnv ? 'SNV' : null;
    if (!moduleKey) return;

    const p = PatientsStore.findById(patientId);

    if (p?.imprintSkipped) {
      setActiveStepId('step2');
      return;
    }

    const current = p?.imprintModules?.[moduleKey];
    if (current === 'done') {
      const next = moduleKey === 'LOH' ? 'step2_cnv' : moduleKey === 'CNV' ? 'step2_snv' : 'step2';
      const t = setTimeout(() => setActiveStepId(next), 800);
      return () => clearTimeout(t);
    }

    setBusy(true);

    upsertPatient({
      imprintModules: {
        LOH: p?.imprintModules?.LOH ?? 'idle',
        CNV: p?.imprintModules?.CNV ?? 'idle',
        SNV: p?.imprintModules?.SNV ?? 'idle',
        [moduleKey]: 'running',
      },
    });

    const timer = setTimeout(() => {
      const p2 = PatientsStore.findById(patientId);

      upsertPatient({
        imprintModules: {
          LOH: p2?.imprintModules?.LOH ?? 'idle',
          CNV: p2?.imprintModules?.CNV ?? 'idle',
          SNV: p2?.imprintModules?.SNV ?? 'idle',
          [moduleKey]: 'done',
        },
      });

      setBusy(false);

      if (moduleKey === 'LOH') setActiveStepId('step2_cnv');
      if (moduleKey === 'CNV') setActiveStepId('step2_snv');

      if (moduleKey === 'SNV') {
        upsertPatient({
          imprintCreated: true,
          imprintCreatedAt: new Date().toISOString(),
        });

        setTimeout(() => setActiveStepId('step2'), 1200);
        // ВАЖНО: не прыгаем автоматически на Step3
      }
    }, PROCESS_TIME_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, isLoh, isCnv, isSnv]);

  if (!patientId) {
    return (
      <div className="space-y-2">
        <div className="text-lg font-semibold">Step 2 — Create imprint</div>
        <div className="text-sm text-slate-600">Сначала выбери пациента на Step 1.</div>
      </div>
    );
  }

  const patientLabel = state.selectedPatient?.label ?? patientId;
  const stored = PatientsStore.findById(patientId);

  if (!isMain) {
    const title = isLoh ? 'LOH discovery' : isCnv ? 'CNV segments' : 'SNV compendium';
    const subtitle = isLoh
      ? 'Windows + major allele inference for BAF'
      : isCnv
        ? 'Tumor CNV profile used as tags'
        : 'Tumor-confirmed SNVs (no indels)';

    const moduleKey: ImprintModuleKey = isLoh ? 'LOH' : isCnv ? 'CNV' : 'SNV';
    const st = stored?.imprintModules?.[moduleKey] ?? 'idle';

    return (
      <div className="space-y-4">
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm text-slate-600">
          Patient: <span className="font-medium text-slate-900">{patientLabel}</span>{' '}
          <span className="text-slate-400">({patientId})</span>
        </div>

        <ScanCard title={title} subtitle={subtitle} running={st === 'running'} done={st === 'done'} />
        <div className="text-xs text-slate-500">Демо: сканирование → галочка → следующий сабстеп.</div>
      </div>
    );
  }

  const canValidate = !busy && tumorAvailable && !stored?.imprintCreated;
  const canNext = !busy && (tumorAvailable ? !!stored?.imprintValidated : true);

  return (
    <div className="space-y-5">
      <div className="text-lg font-semibold">Step 2 — FASTQ upload</div>

      <div className="text-sm text-slate-600">
        Patient: <span className="font-medium text-slate-900">{patientLabel}</span>{' '}
        <span className="text-slate-400">({patientId})</span>
      </div>

      {stored?.imprintCreated ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Imprint already created for this patient.
        </div>
      ) : null}

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Upload files</div>
            <div className="mt-1 text-xs text-slate-500">
              Normal R1/R2 + Tumor R1/R2 → Validate → Next (запуск LOH→CNV→SNV).
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={tumorAvailable}
              onChange={e => {
                const next = e.target.checked;
                setTumorAvailable(next);

                setGlobalError(null);
                upsertPatient({
                  tumorAvailable: next,
                  imprintSkipped: !next,
                  imprintSkipReason: !next ? 'no_tumor' : undefined,
                  imprintValidated: false,
                  imprintValidationAt: undefined,
                });
              }}
            />
            Tumor available
          </label>
        </div>

        {!tumorAvailable ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Tumor files not available → Step 2 can be skipped.
            <div className="mt-2 text-xs text-slate-600">
              В Step 3 будет подключен <span className="font-semibold">ImprintAI+</span> (учёт нозологии:{' '}
              <span className="font-semibold">{state.indication || '—'}</span>).
            </div>
          </div>
        ) : null}

        {globalError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {globalError}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-12 gap-4">
          {slots.map(s => {
            const isTumor = s.key === 'tR1' || s.key === 'tR2';
            const disabled = busy || stored?.imprintCreated || (isTumor && !tumorAvailable);
            const validatedOk = !!stored?.imprintValidated && !!s.file && !s.error && (!isTumor || tumorAvailable);

            return (
              <div key={s.key} className="col-span-12 md:col-span-6">
                <FileUploadRow
                  title={s.title}
                  file={s.file}
                  error={s.error}
                  disabled={disabled}
                  validating={validating}
                  validatedOk={validatedOk}
                  onPick={f => setSlotFile(s.key, f)}
                  onClear={() => clearSlot(s.key)}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canValidate || validating}
            onClick={handleValidate}
            className={[
              'inline-flex items-center gap-2 rounded-2xl border px-5 py-2 text-sm font-semibold',
              !canValidate || validating
                ? 'border-slate-200 bg-slate-100 text-slate-400'
                : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
            ].join(' ')}
          >
            {validating ? <Spinner /> : null}
            {validating ? 'Validating…' : 'Validate'}
          </button>

          <button
            type="button"
            disabled={!canNext}
            onClick={handleNext}
            className={[
              'rounded-2xl border px-5 py-2 text-sm font-semibold',
              !canNext ? 'border-slate-200 bg-slate-100 text-slate-400' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
            ].join(' ')}
          >
            Next
          </button>

          {tumorAvailable && !stored?.imprintValidated ? <div className="text-xs text-slate-500">Validate to enable Next.</div> : null}
        </div>
      </Card>
    </div>
  );
}
