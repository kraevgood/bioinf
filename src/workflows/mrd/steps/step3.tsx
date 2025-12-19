"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { useWorkflow } from "@/components/workflow/WorkflowContext";
import { PatientsStore } from "@/store/patientsStore";
import type { PlasmaSample } from "@/store/patientsStore";

type FileSlotKey = "pR1" | "pR2";

type Slot = {
  key: FileSlotKey;
  title: string;
  file: File | null;
  error?: string;
};

function extOk(name: string) {
  const n = name.toLowerCase();
  return (
    n.endsWith(".fastq") ||
    n.endsWith(".fq") ||
    n.endsWith(".fastq.gz") ||
    n.endsWith(".fq.gz")
  );
}

function bytesToHuman(n: number) {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v = v / 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function daysBetween(aYYYYMMDD: string, bYYYYMMDD: string): number | null {
  if (!aYYYYMMDD || !bYYYYMMDD) return null;
  const a = new Date(`${aYYYYMMDD}T00:00:00`);
  const b = new Date(`${bYYYYMMDD}T00:00:00`);
  const ms = a.getTime() - b.getTime();
  if (Number.isNaN(ms)) return null;
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function makePlasmaLabel(
  drawDate: string,
  surgeryDate?: string,
  hasSurgeryDate?: boolean
) {
  if (!drawDate)
    return {
      label: "—",
      relation: "unknown" as const,
      dayOffset: undefined as number | undefined,
    };

  if (hasSurgeryDate && surgeryDate) {
    const d = daysBetween(drawDate, surgeryDate);
    if (d === null)
      return {
        label: drawDate,
        relation: "unknown" as const,
        dayOffset: undefined,
      };

    if (d < 0)
      return {
        label: `Pre-op (D${d})`,
        relation: "pre_op" as const,
        dayOffset: d,
      };
    if (d === 0)
      return {
        label: "Pre-op (Day 0)",
        relation: "pre_op" as const,
        dayOffset: 0,
      };
    return {
      label: `Post-op Day ${d}`,
      relation: "post_op" as const,
      dayOffset: d,
    };
  }

  // если нет surgery date — просто используем дату
  return {
    label: `Plasma • ${drawDate}`,
    relation: "unknown" as const,
    dayOffset: undefined,
  };
}

export function Step3() {
  const { state } = useWorkflow();
  const patientId = state.selectedPatient?.id ?? null;

  const [drawDate, setDrawDate] = React.useState("");
  const [customLabel, setCustomLabel] = React.useState("");

  const [slots, setSlots] = React.useState<Slot[]>([
    { key: "pR1", title: "Plasma FASTQ — R1", file: null },
    { key: "pR2", title: "Plasma FASTQ — R2", file: null },
  ]);

  const [validated, setValidated] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);

  const stored = patientId ? PatientsStore.findById(patientId) : undefined;
  const hasSurgeryDate = !!stored?.hasSurgeryDate;
  const surgeryDate = stored?.surgeryDate;

  const computed = makePlasmaLabel(drawDate, surgeryDate, hasSurgeryDate);
  const finalLabel = (customLabel || computed.label).trim();

  function upsertPatient(patch: Record<string, unknown>) {
    if (!patientId) return;
    PatientsStore.upsert({
      id: patientId,
      label: state.selectedPatient?.label || patientId,
      ...patch,
    });
  }

  function setSlotFile(key: FileSlotKey, file: File | null) {
    setSlots((prev) =>
      prev.map((s) => (s.key === key ? { ...s, file, error: undefined } : s))
    );
    setValidated(false);
    setGlobalError(null);
  }

  function allRequiredReady(): boolean {
    const r1 = slots.find((s) => s.key === "pR1")?.file;
    const r2 = slots.find((s) => s.key === "pR2")?.file;
    return !!drawDate && !!r1 && !!r2;
  }

  function validateInputs(): boolean {
    setGlobalError(null);

    if (!drawDate) {
      setGlobalError("Select plasma draw date first.");
      return false;
    }

    let ok = true;

    setSlots((prev) =>
      prev.map((s) => {
        if (!s.file) {
          ok = false;
          return { ...s, error: "File required" };
        }
        if (!extOk(s.file.name)) {
          ok = false;
          return { ...s, error: "Invalid extension (fastq/fq/fastq.gz/fq.gz)" };
        }
        if (s.file.size <= 0) {
          ok = false;
          return { ...s, error: "File is empty" };
        }
        return { ...s, error: undefined };
      })
    );

    if (!ok) setGlobalError("Fix file errors first.");
    return ok;
  }

  const validateDisabled = busy || validated || !allRequiredReady();

  function handleValidate() {
    if (!patientId) return;
    if (!allRequiredReady()) {
      setGlobalError("Upload R1/R2 and select draw date to enable validation.");
      return;
    }
    const ok = validateInputs();
    if (!ok) return;

    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setValidated(true);
      setGlobalError(null);
    }, 900);
  }

  function handleAddSample() {
    if (!patientId) return;
    if (!validated) return;

    const r1 = slots.find((s) => s.key === "pR1")?.file;
    const r2 = slots.find((s) => s.key === "pR2")?.file;

    const baseIndex = (stored?.plasmaSamples?.length ?? 0) + 1;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `plasma_${crypto.randomUUID()}`
        : `plasma_${patientId}_${drawDate}_${baseIndex}`;

    const sample: PlasmaSample = {
      id,
      drawDate,
      label: finalLabel || drawDate,
      relationToSurgery: computed.relation,
      dayOffset: computed.dayOffset,
      fastqValidated: true,
      validationAt: new Date().toISOString(),
      files: {
        r1Name: r1?.name,
        r2Name: r2?.name,
        r1Size: r1?.size,
        r2Size: r2?.size,
      },
    };

    const prev = stored?.plasmaSamples ?? [];
    upsertPatient({ plasmaSamples: [sample, ...prev] });

    // reset draft for next timepoint
    setDrawDate("");
    setCustomLabel("");
    setSlots([
      { key: "pR1", title: "Plasma FASTQ — R1", file: null },
      { key: "pR2", title: "Plasma FASTQ — R2", file: null },
    ]);
    setValidated(false);
    setGlobalError(null);
  }

  function removeSample(id: string) {
    if (!patientId) return;
    const next = (stored?.plasmaSamples ?? []).filter((x) => x.id !== id);
    upsertPatient({ plasmaSamples: next });
  }

  function clearAllSamples() {
    if (!patientId) return;
    upsertPatient({ plasmaSamples: [] });
  }

  if (!patientId) {
    return (
      <div className="space-y-2">
        <div className="text-lg font-semibold">Step 3 — Add plasma sample</div>
        <div className="text-sm text-slate-600">
          Сначала выбери пациента на Step 1.
        </div>
      </div>
    );
  }

  const patientLabel = state.selectedPatient?.label ?? patientId;

  return (
    <div className="space-y-5">
      <div className="text-lg font-semibold">Step 3 — Add plasma sample</div>

      <div className="text-sm text-slate-600">
        Patient:{" "}
        <span className="font-medium text-slate-900">{patientLabel}</span>{" "}
        <span className="text-slate-400">({patientId})</span>
      </div>

      {/* Blue marker card */}
      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <div className="font-semibold">Plasma labeling</div>
        <div className="mt-1 text-xs text-sky-800">
          Label is linked to plasma draw date
          {hasSurgeryDate && surgeryDate
            ? ` and surgery date (${surgeryDate}).`
            : "."}
        </div>
        <div className="mt-2 text-xs text-sky-900">
          Suggested label:{" "}
          <span className="rounded-full bg-sky-100 px-2 py-1 font-semibold">
            {computed.label}
          </span>
          {hasSurgeryDate && surgeryDate ? (
            <span className="ml-2 text-sky-700">
              {computed.dayOffset !== undefined
                ? `Δdays=${computed.dayOffset}`
                : ""}
            </span>
          ) : null}
        </div>
      </div>

      <Card className="p-5">
        <div className="text-sm font-semibold text-slate-900">Timepoint</div>

        <div className="mt-4 grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-6">
            <label className="text-xs text-slate-500">Plasma draw date</label>
            <input
              type="date"
              value={drawDate}
              onChange={(e) => {
                setDrawDate(e.target.value);
                setValidated(false);
                setGlobalError(null);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
            />
            <div className="mt-1 text-xs text-slate-500">
              Маркировка строится от этой даты (и surgery date, если задана).
            </div>
          </div>

          <div className="col-span-12 md:col-span-6">
            <label className="text-xs text-slate-500">
              Custom label (optional)
            </label>
            <input
              value={customLabel}
              onChange={(e) => {
                setCustomLabel(e.target.value);
                setValidated(false);
              }}
              placeholder="e.g., First plasma / Pre-op baseline"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
            />
            <div className="mt-1 text-xs text-slate-500">
              По умолчанию используем suggested label.
            </div>
          </div>
        </div>

        <div className="mt-5 text-sm font-semibold text-slate-900">
          FASTQ upload
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Plasma R1/R2 → Validate → Add sample (как в Step 2).
        </div>

        {globalError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {globalError}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-12 gap-4">
          {slots.map((s) => (
            <div key={s.key} className="col-span-12 md:col-span-6">
              <div className="text-xs text-slate-500">{s.title}</div>

              <div className="mt-1 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <input
                  type="file"
                  disabled={busy}
                  accept=".fastq,.fq,.fastq.gz,.fq.gz"
                  onChange={(e) =>
                    setSlotFile(s.key, e.target.files?.[0] ?? null)
                  }
                  className="w-full text-sm"
                />

                <div className="mt-2 text-xs text-slate-600">
                  {s.file ? (
                    <div className="truncate">
                      <span className="font-medium text-slate-900">
                        {s.file.name}
                      </span>{" "}
                      <span className="text-slate-400">
                        ({bytesToHuman(s.file.size)})
                      </span>
                    </div>
                  ) : (
                    <div className="text-slate-500">No file</div>
                  )}

                  {s.error ? (
                    <div className="mt-2 text-xs text-red-600">{s.error}</div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleValidate}
            disabled={validateDisabled}
            className={[
              "rounded-full border px-4 py-2 text-sm",
              validateDisabled
                ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                : "border-slate-200 bg-white hover:border-slate-300",
            ].join(" ")}
          >
            {busy ? "Validating…" : validated ? "Validated ✓" : "Validate"}
          </button>

          <button
            type="button"
            onClick={handleAddSample}
            disabled={!validated}
            className={[
              "rounded-full border px-4 py-2 text-sm font-semibold",
              !validated
                ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                : "border-sky-300 bg-sky-50 text-sky-900 hover:border-sky-400",
            ].join(" ")}
          >
            Add sample
          </button>

          <div className="text-xs text-slate-500">
            {!allRequiredReady()
              ? "Select draw date + upload R1/R2 to enable validation."
              : validated
              ? `Ready to add: ${finalLabel}`
              : "Validate to unlock “Add sample”."}
          </div>
        </div>
      </Card>

      {/* List */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Plasma timepoints
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Added samples are stored in LocalStorage and drive the Step 3 ✓ in
              the tree.
            </div>
          </div>

          <button
            type="button"
            onClick={clearAllSamples}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm hover:border-slate-300"
          >
            Clear all
          </button>
        </div>

        {(stored?.plasmaSamples?.length ?? 0) === 0 ? (
          <div className="mt-4 text-sm text-slate-600">
            No plasma samples yet.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {(stored?.plasmaSamples ?? []).map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {p.label}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      drawDate:{" "}
                      <span className="font-medium text-slate-700">
                        {p.drawDate}
                      </span>
                      {hasSurgeryDate &&
                      surgeryDate &&
                      p.dayOffset !== undefined ? (
                        <span className="ml-2">
                          • {p.dayOffset < 0 ? "pre-op" : "post-op"} • Δdays=
                          {p.dayOffset}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                      {p.files?.r1Name ? (
                        <div className="truncate">
                          R1:{" "}
                          <span className="font-medium">{p.files.r1Name}</span>{" "}
                          <span className="text-slate-400">
                            ({bytesToHuman(p.files.r1Size ?? 0)})
                          </span>
                        </div>
                      ) : null}
                      {p.files?.r2Name ? (
                        <div className="truncate">
                          R2:{" "}
                          <span className="font-medium">{p.files.r2Name}</span>{" "}
                          <span className="text-slate-400">
                            ({bytesToHuman(p.files.r2Size ?? 0)})
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <div className="text-xs">
                      {p.fastqValidated ? (
                        <span className="text-emerald-700 font-semibold">
                          ✓ Validated
                        </span>
                      ) : (
                        <span className="text-slate-500">Not validated</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeSample(p.id)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs hover:border-slate-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="text-xs text-slate-500">
        Note: Step 3 label is computed from plasma draw date and surgery date
        (if present). You can override with Custom label.
      </div>
    </div>
  );
}
