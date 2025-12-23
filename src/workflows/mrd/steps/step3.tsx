'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { useWorkflow } from '@/components/workflow/WorkflowContext';
import { PatientsStore } from '@/store/patientsStore';
import type { PlasmaSample } from '@/store/patientsStore';

type FileSlotKey = 'pR1' | 'pR2';

type Slot = {
  key: FileSlotKey;
  title: string;
  file: File | null;
  error?: string;
};

const VALIDATE_TIME_MS = 3000; // simulated validation time (3s)

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

  // ✅ important: when state resets (file=null), also reset the underlying DOM input value
  React.useEffect(() => {
    if (!file && inputRef.current) {
      inputRef.current.value = '';
    }
  }, [file]);

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
              onChange={e => {
                const f = e.currentTarget.files?.[0] ?? null;
                onPick(f);

                // ✅ critical: reset so the same file can be selected again
                e.currentTarget.value = '';
              }}
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
              onClick={() => {
                onClear();
                // ✅ and here as well
                if (inputRef.current) inputRef.current.value = '';
              }}
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


/**
 * IMPORTANT:
 * Previously, if surgeryDate was missing, we returned "first plasma".
 * That made every timepoint without surgery look the same.
 * Now: if there is no surgery date — relation = "—" (undefined).
 */
function computeRelation(drawDateISO: string, surgeryDateISO?: string) {
  if (!surgeryDateISO) return { relation: '—', dayOffset: 0 };

  const draw = new Date(drawDateISO);
  const surg = new Date(surgeryDateISO);

  const diffMs = draw.getTime() - surg.getTime();
  const dayOffset = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (dayOffset < 0) return { relation: `pre-op day ${Math.abs(dayOffset)}`, dayOffset };
  if (dayOffset === 0) return { relation: 'day 0', dayOffset };
  return { relation: `post-op day ${dayOffset}`, dayOffset };
}

/**
 * Generate display label based on plasma draw date.
 * - Base: "Plasma YYYY-MM-DD"
 * - If surgery date exists: append "(pre-op day X / day 0 / post-op day X)"
 */
function makeAutoLabel(drawDateISO: string, surgeryDateISO?: string) {
  const base = `Plasma ${drawDateISO}`;
  if (!surgeryDateISO) return base;

  const rel = computeRelation(drawDateISO, surgeryDateISO).relation;
  return rel && rel !== '—' ? `${base} (${rel})` : base;
}

export function Step3() {
  const { state } = useWorkflow();
  const patientId = state.selectedPatient?.id ?? null;

  const [drawDate, setDrawDate] = React.useState<string>(''); // yyyy-mm-dd
  const [customLabel, setCustomLabel] = React.useState<string>(''); // keep for later (optional override)

  const [slots, setSlots] = React.useState<Slot[]>([
    { key: 'pR1', title: 'Plasma FASTQ — R1', file: null },
    { key: 'pR2', title: 'Plasma FASTQ — R2', file: null },
  ]);

  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [validating, setValidating] = React.useState(false);
  const [validated, setValidated] = React.useState(false);

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
    setValidated(false);
    setGlobalError(null);
  }

  function clearSlot(key: FileSlotKey) {
    setSlotFile(key, null);
  }

  function validateInputs(): boolean {
    setGlobalError(null);

    let ok = true;
    setSlots(prev =>
      prev.map(s => {
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

    if (!drawDate) {
      ok = false;
      setGlobalError('Select plasma draw date first.');
    }

    if (!ok && !globalError) setGlobalError('Fix file errors first.');
    return ok;
  }

  async function handleValidate() {
    if (!patientId) return;

    const r1 = slots.find(s => s.key === 'pR1')?.file;
    const r2 = slots.find(s => s.key === 'pR2')?.file;

    if (!drawDate || !r1 || !r2) {
      setGlobalError('Select date and upload Plasma R1/R2 first.');
      validateInputs();
      return;
    }

    const ok = validateInputs();
    if (!ok) return;

    setValidating(true);
    await new Promise<void>(resolve => setTimeout(resolve, VALIDATE_TIME_MS));
    setValidating(false);
    setValidated(true);
  }

  function handleAddTimepoint() {
    if (!patientId) return;
    if (!validated) {
      setGlobalError('Validate to enable Add.');
      return;
    }

    const r1 = slots.find(s => s.key === 'pR1')?.file;
    const r2 = slots.find(s => s.key === 'pR2')?.file;
    if (!r1 || !r2 || !drawDate) return;

    const stored = PatientsStore.findById(patientId);
    const surgeryDateISO = stored?.surgeryDate;
    const computed = computeRelation(drawDate, surgeryDateISO);

    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? `plasma_${crypto.randomUUID()}`
        : `plasma_${drawDate}_${r1.name}_${r2.name}`;

    // key change: label is derived from draw date
    const autoLabel = makeAutoLabel(drawDate, surgeryDateISO);
    const finalLabel = customLabel?.trim() || autoLabel;

    const sample: PlasmaSample = {
      id,
      drawDate,
      label: finalLabel,
      relationToSurgery: computed.relation,
      dayOffset: computed.dayOffset,
      fastqValidated: true,
      validationAt: new Date().toISOString(),
      files: {
        r1Name: r1.name,
        r2Name: r2.name,
        r1Size: r1.size,
        r2Size: r2.size,
      },
    };

    const nextSamples = [...(stored?.plasmaSamples ?? []), sample];
    upsertPatient({ plasmaSamples: nextSamples });

    // reset draft for next timepoint
    setDrawDate('');
    setCustomLabel('');
    setSlots(prev => prev.map(s => ({ ...s, file: null, error: undefined })));
    setValidated(false);
    setGlobalError(null);
  }

  if (!patientId) {
    return (
      <div className="space-y-2">
        <div className="text-lg font-semibold">Step 3 — Add plasma sample</div>
        <div className="text-sm text-slate-600">Select a patient in Step 1 first.</div>
      </div>
    );
  }

  const stored = PatientsStore.findById(patientId);
  const patientLabel = state.selectedPatient?.label ?? patientId;

  const modeValue = stored?.imprintCreated ? 'tumor-informed' : 'indication-guided';
  const rel = drawDate ? computeRelation(drawDate, stored?.surgeryDate) : null;

  const canValidate = !validating;
  const canAdd = validated && !validating;

  // what to show as the preview "Label"
  const previewLabel = drawDate ? (customLabel?.trim() || makeAutoLabel(drawDate, stored?.surgeryDate)) : '—';

  return (
    <div className="space-y-5">
      <div className="text-lg font-semibold">Step 3 — Add plasma sample</div>

      {/* key change: show surgery date next to the patient */}
      <div className="text-sm text-slate-600">
        Patient: <span className="font-medium text-slate-900">{patientLabel}</span>{' '}
        <span className="text-slate-400">({patientId})</span>
        <span className="text-slate-400"> • Surgery: {stored?.surgeryDate ?? '—'}</span>
      </div>

      <Card className="p-5">
        {globalError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {globalError}
          </div>
        ) : null}

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-6">
            <div className="text-xs text-slate-500">Plasma draw date</div>
            <input
              type="date"
              value={drawDate}
              onChange={e => {
                setDrawDate(e.target.value);
                setValidated(false);
                setGlobalError(null);
              }}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
            />
            <div className="mt-2 text-xs text-slate-500">
              Label: <span className="font-medium text-slate-800">{previewLabel}</span>
            </div>
            {/* customLabel stays in state (may be useful later), but we do not add an input UI yet
                to avoid changing the current UX without an explicit request */}
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="text-xs text-slate-500">Mode</div>
            <div className="mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800">
              {modeValue}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Relation: <span className="font-medium text-slate-800">{rel?.relation ?? '—'}</span>
            </div>
          </div>

          <div className="col-span-12">
            <div className="mt-1 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="grid grid-cols-12 gap-4">
                {slots.map(s => {
                  const validatedOk = validated && !!s.file && !s.error;
                  return (
                    <div key={s.key} className="col-span-12 md:col-span-6">
                      <FileUploadRow
                        title={s.title}
                        file={s.file}
                        error={s.error}
                        disabled={validating}
                        validating={validating}
                        validatedOk={validatedOk}
                        onPick={f => setSlotFile(s.key, f)}
                        onClear={() => clearSlot(s.key)}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!canValidate}
                  onClick={handleValidate}
                  className={[
                    'inline-flex items-center gap-2 rounded-2xl border px-5 py-2 text-sm font-semibold',
                    !canValidate
                      ? 'border-slate-200 bg-slate-100 text-slate-400'
                      : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {validating ? <Spinner /> : null}
                  {validating ? 'Validating…' : 'Validate'}
                </button>

                <button
                  type="button"
                  disabled={!canAdd}
                  onClick={handleAddTimepoint}
                  className={[
                    'rounded-2xl border px-5 py-2 text-sm font-semibold',
                    !canAdd
                      ? 'border-slate-200 bg-slate-100 text-slate-400'
                      : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
                  ].join(' ')}
                >
                  Add timepoint
                </button>

                {!validated ? <div className="text-xs text-slate-500">Validate to enable Add.</div> : null}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-sm font-semibold text-slate-900">Timepoints</div>

        {stored?.plasmaSamples?.length ? (
          <div className="mt-3 grid grid-cols-12 gap-3">
            {stored.plasmaSamples.map(s => (
              <div key={s.id} className="col-span-12 md:col-span-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs text-slate-500">{s.drawDate}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{s.label}</div>
                  <div className="mt-2 text-xs text-slate-600">
                    {(s.files?.r1Name ?? 'R1')} / {(s.files?.r2Name ?? 'R2')}
                  </div>
                  <div className="mt-2 text-xs text-emerald-700">✓ Added</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 text-sm text-slate-600">No plasma timepoints added yet.</div>
        )}
      </Card>
    </div>
  );
}
