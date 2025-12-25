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

const VALIDATE_TIME_MS = 3000;

function extOk(name: string) {
  const n = name.toLowerCase();
  return n.endsWith('.fastq') || n.endsWith('.fq') || n.endsWith('.fastq.gz') || n.endsWith('.fq.gz');
}

function bytesToHuman(n: number) {
  const kb = n / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(iso: string, days: number) {
  const d = iso ? new Date(`${iso}T00:00:00`) : new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function uid(prefix = 'plasma') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function computeRelationToSurgery(drawDate: string, surgeryDate?: string) {
  if (!drawDate || !surgeryDate) return { relation: 'Plasma', dayOffset: undefined as number | undefined };

  const d1 = new Date(`${drawDate}T00:00:00`);
  const d2 = new Date(`${surgeryDate}T00:00:00`);
  const diffDays = Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { relation: `Pre-op (day ${diffDays})`, dayOffset: diffDays };
  if (diffDays === 0) return { relation: 'Op day', dayOffset: diffDays };
  return { relation: `Post-op (day ${diffDays})`, dayOffset: diffDays };
}

function getSamplesFromStored(stored: unknown): PlasmaSample[] {
  if (!stored || typeof stored !== 'object') return [];
  const rec = stored as { plasmaSamples?: unknown };
  if (!Array.isArray(rec.plasmaSamples)) return [];
  return rec.plasmaSamples as PlasmaSample[];
}

function FieldBlock({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="h-14">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-xs text-slate-500">{description}</div>
      </div>
      {children}
    </div>
  );
}

function FileSlot({
  title,
  file,
  error,
  validating,
  inputKey,
  isValidated,
  onPick,
  onClear,
}: {
  title: string;
  file: File | null;
  error?: string;
  validating: boolean;
  inputKey: string;
  isValidated: boolean;
  onPick: (f: File | null) => void;
  onClear: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const border = error
    ? 'border-red-200'
    : isValidated
      ? 'border-emerald-300'
      : file
        ? 'border-slate-300'
        : 'border-slate-200';

  const bg = error ? 'bg-red-50' : isValidated ? 'bg-emerald-50/40' : 'bg-white';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-slate-500">{title}</div>
        {isValidated ? (
          <div className="rounded-full border border-emerald-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            Validated
          </div>
        ) : null}
      </div>

      <div className={['rounded-2xl border px-4 py-3', border, bg].join(' ')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-900">{file ? file.name : 'No file selected'}</div>
            <div className="mt-1 text-xs text-slate-500">{file ? bytesToHuman(file.size) : 'Pick a FASTQ(.gz) file.'}</div>
            {error ? <div className="mt-1 text-xs font-medium text-red-700">{error}</div> : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <input
              key={inputKey}
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0] ?? null;
                onPick(f);
              }}
            />
            <button
              type="button"
              disabled={validating}
              onClick={() => inputRef.current?.click()}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Upload
            </button>
            <button
              type="button"
              disabled={validating || !file}
              onClick={() => {
                onClear();
                if (inputRef.current) inputRef.current.value = '';
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Step3() {
  const { state } = useWorkflow();

  const patientId = state.selectedPatient?.id ?? null;
  const patientLabel = state.selectedPatient?.label ?? patientId;

  const [drawDate, setDrawDate] = React.useState('');
  const [customLabel, setCustomLabel] = React.useState('');

  const [slots, setSlots] = React.useState<Slot[]>([
    { key: 'pR1', title: 'Plasma FASTQ — R1', file: null },
    { key: 'pR2', title: 'Plasma FASTQ — R2', file: null },
  ]);

  const [validating, setValidating] = React.useState(false);
  const [validated, setValidated] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);

  const [resetNonce, setResetNonce] = React.useState(0);

  // форсим перерисовку после изменений localStorage
  const [storeTick, setStoreTick] = React.useState(0);

  const stored = patientId ? PatientsStore.findById(patientId) : null;
  const surgeryDate = stored?.surgeryDate;

  const samples: PlasmaSample[] = getSamplesFromStored(stored);

  function touchStore() {
    setStoreTick(t => t + 1);
  }

  function upsertSamples(nextSamples: PlasmaSample[]) {
    if (!patientId) return;
    PatientsStore.upsert({
      id: patientId,
      label: state.selectedPatient?.label || patientId,
      plasmaSamples: nextSamples,
    });
    touchStore();
  }

  function resetUploadState() {
    setSlots(prev => prev.map(s => ({ ...s, file: null, error: undefined })));
    setValidated(false);
    setValidating(false);
    setResetNonce(n => n + 1);
  }

  function setSlotFile(key: FileSlotKey, file: File | null) {
    setSlots(prev => prev.map(s => (s.key === key ? { ...s, file, error: undefined } : s)));
    setValidated(false); // сменили файл => нужна новая валидация
    setGlobalError(null);
  }

  function validateFilesLocal(): boolean {
    let ok = true;

    setSlots(prev =>
      prev.map(s => {
        if (!s.file) {
          ok = false;
          return { ...s, error: 'Missing file' };
        }
        if (!extOk(s.file.name)) {
          ok = false;
          return { ...s, error: 'Expected FASTQ / FASTQ.GZ' };
        }
        return { ...s, error: undefined };
      }),
    );

    if (!ok) setGlobalError('Fix file errors first.');
    return ok;
  }

  async function handleValidate() {
    setGlobalError(null);

    const ok = validateFilesLocal();
    if (!ok) return;

    setValidating(true);
    await new Promise<void>(resolve => setTimeout(resolve, VALIDATE_TIME_MS));
    setValidating(false);
    setValidated(true);
  }

  function hasDateAlready(date: string) {
    return samples.some(s => (s.drawDate || '') === date);
  }

  function handleAddTimepoint() {
    if (!patientId) return;
    setGlobalError(null);

    if (!validated) {
      setGlobalError('Validate to enable Add.');
      return;
    }

    const r1 = slots.find(s => s.key === 'pR1')?.file ?? null;
    const r2 = slots.find(s => s.key === 'pR2')?.file ?? null;

    if (!r1 || !r2) {
      setGlobalError('Upload R1 and R2.');
      return;
    }

    if (!drawDate) {
      setGlobalError('Please set draw date.');
      return;
    }

    if (hasDateAlready(drawDate)) {
      setGlobalError(`A timepoint for ${drawDate} already exists. Pick another date.`);
      return;
    }

    const computed = computeRelationToSurgery(drawDate, surgeryDate);
    const finalLabel = customLabel.trim() || computed.relation;

    const sample: PlasmaSample = {
      id: uid('tp'),
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

    upsertSamples([...samples, sample]);

    setDrawDate('');
    setCustomLabel('');
    resetUploadState();
  }

  function handleDeleteTimepoint(id: string) {
    if (!patientId) return;
    upsertSamples(samples.filter(s => s.id !== id));
    setGlobalError(null);
  }

  function handleAdd3DemoTimepoints() {
    if (!patientId) return;

    const base = surgeryDate || toISODate(new Date());

    const candidates: Array<{ date: string; label: string }> = [
      { date: addDays(base, -10), label: 'Pre-op (day -10)' },
      { date: addDays(base, 0), label: 'Op day' },
      { date: addDays(base, 60), label: 'Post-op (day 60)' },
    ];

    const existingDates = new Set(samples.map(s => s.drawDate || ''));

    const toAdd: PlasmaSample[] = [];
    for (const c of candidates) {
      if (existingDates.has(c.date)) continue;
      const computed = computeRelationToSurgery(c.date, surgeryDate);
      toAdd.push({
        id: uid('demo'),
        drawDate: c.date,
        label: c.label,
        relationToSurgery: computed.relation,
        dayOffset: computed.dayOffset,
        fastqValidated: true,
        validationAt: new Date().toISOString(),
        files: {
          r1Name: 'demo_R1.fastq.gz',
          r2Name: 'demo_R2.fastq.gz',
          r1Size: 12_345_678,
          r2Size: 12_789_012,
        },
      });
    }

    if (!toAdd.length) {
      setGlobalError('Demo timepoints already exist for these dates.');
      return;
    }

    upsertSamples([...samples, ...toAdd]);

    setDrawDate('');
    setCustomLabel('');
    setGlobalError(null);
    resetUploadState();
  }

  if (!patientId) {
    return (
      <div className="space-y-2">
        <div className="text-lg font-semibold">Step 3 — Add plasma sample</div>
        <div className="text-sm text-slate-600">Select a patient in Step 1 first.</div>
      </div>
    );
  }

  const r1File = slots.find(s => s.key === 'pR1')?.file ?? null;
  const r2File = slots.find(s => s.key === 'pR2')?.file ?? null;
  const allFilesPicked = !!r1File && !!r2File;

  return (
    <div className="space-y-5">
      <div className="text-lg font-semibold">Step 3 — Add plasma sample</div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <div>
          Patient: <span className="font-medium text-slate-900">{patientLabel}</span>{' '}
          <span className="text-slate-400">({patientId})</span>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
          Surgery date: <span className="font-semibold text-slate-900">{surgeryDate || '—'}</span>
        </div>
      </div>

      <Card className="p-5">
        {globalError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {globalError}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          <FieldBlock title="Draw date" description="Used to label pre/post-op (if surgery date exists).">
            <input
              value={drawDate}
              onChange={e => setDrawDate(e.target.value)}
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </FieldBlock>

          <FieldBlock title="Custom label (optional)" description="If empty, label is generated from surgery date.">
            <input
              value={customLabel}
              onChange={e => setCustomLabel(e.target.value)}
              type="text"
              placeholder="e.g. Pre-op, 1m, 3m"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </FieldBlock>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <FileSlot
            title={slots.find(s => s.key === 'pR1')?.title ?? 'Plasma R1'}
            file={r1File}
            error={slots.find(s => s.key === 'pR1')?.error}
            validating={validating}
            inputKey={`pR1_${resetNonce}`}
            isValidated={validated && allFilesPicked}
            onPick={f => setSlotFile('pR1', f)}
            onClear={() => setSlotFile('pR1', null)}
          />
          <FileSlot
            title={slots.find(s => s.key === 'pR2')?.title ?? 'Plasma R2'}
            file={r2File}
            error={slots.find(s => s.key === 'pR2')?.error}
            validating={validating}
            inputKey={`pR2_${resetNonce}`}
            isValidated={validated && allFilesPicked}
            onPick={f => setSlotFile('pR2', f)}
            onClear={() => setSlotFile('pR2', null)}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={validating}
            onClick={handleValidate}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            Validate
          </button>

          <button
            type="button"
            disabled={!validated || validating}
            onClick={handleAddTimepoint}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            Add timepoint
          </button>

          <button
            type="button"
            onClick={handleAdd3DemoTimepoints}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Add 3 timepoints (demo)
          </button>

          <div className="text-xs text-slate-500">
            Current samples: <span className="font-semibold text-slate-900">{samples.length}</span>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Saved plasma timepoints</div>
            <div className="mt-1 text-xs text-slate-500">Stored locally per patient (demo).</div>
          </div>
          <div className="text-xs text-slate-600">{samples.length ? `${samples.length} items` : 'No samples'}</div>
        </div>

        {samples.length ? (
          <div className="mt-4 space-y-2">
            {samples
              .slice()
              .sort((a, b) => (a.drawDate || '').localeCompare(b.drawDate || ''))
              .map(s => (
                <div key={s.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{s.label || 'Plasma'}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Date: <span className="text-slate-700">{s.drawDate || '—'}</span>
                        {s.relationToSurgery ? (
                          <>
                            {' '}
                            • <span className="text-slate-700">{s.relationToSurgery}</span>
                          </>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-emerald-700 font-semibold">✓ Validated</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTimepoint(s.id)}
                      className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                      title="Delete this timepoint"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="mt-4 text-sm text-slate-500">No plasma samples added yet.</div>
        )}
      </Card>

      <span className="hidden">{storeTick}</span>
    </div>
  );
}
