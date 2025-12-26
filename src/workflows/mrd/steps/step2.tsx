"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { useWorkflow } from "@/components/workflow/WorkflowContext";
import { PatientsStore } from "@/store/patientsStore";
import type { ImprintModuleKey } from "@/store/patientsStore";

type FileSlotKey = "nR1" | "nR2" | "tR1" | "tR2";

type Slot = {
  key: FileSlotKey;
  title: string;
  file: File | null;
  error?: string;
};

const VALIDATE_TIME_MS = 800;
const PROCESS_TIME_MS = 1400;

function FileSlot({
  title,
  file,
  error,
  validating,
  validatedOk,
  onPick,
  onClear,
}: {
  title: string;
  file: File | null;
  error?: string;
  validating: boolean;
  validatedOk: boolean;
  onPick: (f: File | null) => void;
  onClear: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const border = error
    ? "border-red-200"
    : validatedOk
    ? "border-emerald-200"
    : "border-slate-200";
  const bg = error ? "bg-red-50" : validatedOk ? "bg-emerald-50" : "bg-white";

  return (
    <div className="space-y-1">
      <div className="text-xs text-slate-500">{title}</div>

      <div className={["rounded-2xl border px-4 py-3", border, bg].join(" ")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-900">
              {file ? file.name : "No file selected"}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {file
                ? `${Math.round(file.size / 1024)} KB`
                : "Pick a FASTQ(.gz) file."}
            </div>
            {error ? (
              <div className="mt-1 text-xs font-medium text-red-700">
                {error}
              </div>
            ) : null}
            {!error && validating ? (
              <div className="mt-1 text-xs text-slate-500">Validating…</div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
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
                if (inputRef.current) inputRef.current.value = "";
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
          {done ? (
            <span className="font-semibold text-emerald-700">✓ Done</span>
          ) : running ? (
            "Scanning…"
          ) : (
            "Idle"
          )}
        </div>
      </div>

      {running ? (
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 rounded-full bg-sky-500" />
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Demo run (mock processing)…
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * IMPORTANT:
 * This component must be a NAMED export (`export function Step2`)
 * because src/workflows/mrd/config.tsx imports it as:
 *   import { Step2 } from "./steps/step2";
 */
export function Step2() {
  const { state, activeStepId, setActiveStepId } = useWorkflow();

  const patientId = state.selectedPatient?.id ?? null;
  const patientLabel = state.selectedPatient?.label ?? patientId;

  const isMain = activeStepId === "step2";
  const isLoh = activeStepId === "step2_loh";
  const isCnv = activeStepId === "step2_cnv";
  const isSnv = activeStepId === "step2_snv";

  const [tumorAvailable, setTumorAvailable] = React.useState(true);

  const [slots, setSlots] = React.useState<Slot[]>([
    { key: "nR1", title: "Normal FASTQ — R1", file: null },
    { key: "nR2", title: "Normal FASTQ — R2", file: null },
    { key: "tR1", title: "Tumor FASTQ — R1", file: null },
    { key: "tR2", title: "Tumor FASTQ — R2", file: null },
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
      label: patientLabel ?? patientId,
      ...patch,
    });
  }

  function setSlotFile(key: FileSlotKey, file: File | null) {
    setSlots((prev) =>
      prev.map((s) => (s.key === key ? { ...s, file, error: undefined } : s))
    );
  }

  function validateAll(): boolean {
    let ok = true;

    setSlots((prev) =>
      prev.map((s) => {
        if (s.key === "tR1" || s.key === "tR2") {
          if (!tumorAvailable) return { ...s, error: undefined };
        }

        if (!s.file) {
          ok = false;
          return { ...s, error: "Missing file" };
        }

        const name = s.file.name.toLowerCase();
        if (!name.includes("fastq")) {
          ok = false;
          return { ...s, error: "Expected FASTQ" };
        }

        return { ...s, error: undefined };
      })
    );

    if (!ok) setGlobalError("Fix file errors first.");
    return ok;
  }

  function haveAllRequiredFiles(): boolean {
    const nR1 = slots.find((s) => s.key === "nR1")?.file;
    const nR2 = slots.find((s) => s.key === "nR2")?.file;
    if (!nR1 || !nR2) return false;

    if (!tumorAvailable) return true;

    const tR1 = slots.find((s) => s.key === "tR1")?.file;
    const tR2 = slots.find((s) => s.key === "tR2")?.file;
    return !!(tR1 && tR2);
  }

  async function handleValidate() {
    if (!patientId) return;

    setGlobalError(null);

    if (!haveAllRequiredFiles()) {
      setGlobalError("Please upload all required files first.");
      return;
    }

    const ok = validateAll();
    if (!ok) return;

    setBusy(true);
    setValidating(true);

    await new Promise<void>((resolve) => setTimeout(resolve, VALIDATE_TIME_MS));

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
      // tumor missing -> skip imprint
      upsertPatient({
        tumorAvailable: false,
        imprintSkipped: true,
        imprintSkipReason: "Tumor not available",
        imprintRunStarted: false,
        imprintInputsReady: false,
      });
      setActiveStepId("step3");
      return;
    }

    if (!stored?.imprintValidated) {
      setGlobalError("Validate files first.");
      return;
    }

    // Start imprint pipeline from Step 2 main screen ONLY
    upsertPatient({
      imprintRunStarted: true,
      imprintInputsReady: true,
      imprintCreated: false,
      imprintCreatedAt: "",
      imprintModules: { LOH: "idle", CNV: "idle", SNV: "idle" },
    });

    setTimeout(() => setActiveStepId("step2_loh"), 800);
  }

  // SUBSTEPS autorun (Task #3): only if imprintRunStarted === true
  React.useEffect(() => {
    if (!patientId) return;

    const moduleKey: ImprintModuleKey | null = isLoh
      ? "LOH"
      : isCnv
      ? "CNV"
      : isSnv
      ? "SNV"
      : null;
    if (!moduleKey) return;

    const p = PatientsStore.findById(patientId);

    if (p?.imprintSkipped) {
      setActiveStepId("step2");
      return;
    }

    // Task #3: do NOT auto-run if user just opened substep
    if (!p?.imprintRunStarted) return;

    const current = p?.imprintModules?.[moduleKey];
    if (current === "done") {
      return;
    }

    setBusy(true);

    upsertPatient({
      imprintModules: {
        LOH: p?.imprintModules?.LOH ?? "idle",
        CNV: p?.imprintModules?.CNV ?? "idle",
        SNV: p?.imprintModules?.SNV ?? "idle",
        [moduleKey]: "running",
      },
    });

    const timer = setTimeout(() => {
      const p2 = PatientsStore.findById(patientId);

      upsertPatient({
        imprintModules: {
          LOH: p2?.imprintModules?.LOH ?? "idle",
          CNV: p2?.imprintModules?.CNV ?? "idle",
          SNV: p2?.imprintModules?.SNV ?? "idle",
          [moduleKey]: "done",
        },
      });

      setBusy(false);

      if (moduleKey === "LOH") setActiveStepId("step2_cnv");
      if (moduleKey === "CNV") setActiveStepId("step2_snv");

      if (moduleKey === "SNV") {
        upsertPatient({
          imprintCreated: true,
          imprintCreatedAt: new Date().toISOString(),
        });

        setTimeout(() => setActiveStepId("step2"), 1200);
      }
    }, PROCESS_TIME_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, isLoh, isCnv, isSnv]);

  if (!patientId) {
    return (
      <div className="space-y-2">
        <div className="text-lg font-semibold">Step 2 — Create imprint</div>
        <div className="text-sm text-slate-600">
          Select a patient in Step 1 first.
        </div>
      </div>
    );
  }

  const stored = PatientsStore.findById(patientId);

  // SUBSTEPS (Task #2): no duplicated big titles — tree already shows it
  if (!isMain) {
    const title = isLoh
      ? "LOH discovery"
      : isCnv
      ? "CNV segments"
      : "SNV compendium";
    const subtitle = isLoh
      ? "Windows + major allele inference for BAF"
      : isCnv
      ? "Tumor CNV profile used as tags"
      : "Tumor-confirmed SNVs (no indels)";

    const moduleKey: ImprintModuleKey = isLoh ? "LOH" : isCnv ? "CNV" : "SNV";
    const st = stored?.imprintModules?.[moduleKey] ?? "idle";

    return (
      <div className="space-y-4">
        <div className="text-sm text-slate-600">
          Patient:{" "}
          <span className="font-medium text-slate-900">{patientLabel}</span>{" "}
          <span className="text-slate-400">({patientId})</span>
        </div>

        {/* Task #3: guidance when opened manually */}
        {!stored?.imprintRunStarted ? (
          <Card className="p-5">
            <div className="text-sm font-semibold text-slate-900">
              Imprint pipeline not started
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Start the imprint pipeline from Step 2 (FASTQ upload) to run LOH →
              CNV → SNV.
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setActiveStepId("step2")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Go to Step 2
              </button>
            </div>
          </Card>
        ) : null}

        <ScanCard
          title={title}
          subtitle={subtitle}
          running={st === "running"}
          done={st === "done"}
        />
        <div className="text-xs text-slate-500">
          Demo: scan → ✓ → next sub-step.
        </div>
      </div>
    );
  }

  // MAIN
  const canValidate = !busy && !stored?.imprintCreated;
  const canNext = !busy && (tumorAvailable ? !!stored?.imprintValidated : true);

  return (
    <div className="space-y-5">
      <div className="text-lg font-semibold">Step 2 — FASTQ upload</div>

      <div className="text-sm text-slate-600">
        Patient:{" "}
        <span className="font-medium text-slate-900">{patientLabel}</span>{" "}
        <span className="text-slate-400">({patientId})</span>
      </div>

      {stored?.imprintCreated ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          ✓ Imprint is ready.
          <div className="mt-1 text-xs text-emerald-800">
            Created:{" "}
            {stored.imprintCreatedAt
              ? new Date(stored.imprintCreatedAt).toLocaleString()
              : "—"}
          </div>
        </div>
      ) : null}

      {globalError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {globalError}
        </div>
      ) : null}

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Upload files
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Normal R1/R2 + Tumor R1/R2 → Validate → Next (start LOH→CNV→SNV).
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={tumorAvailable}
              onChange={(e) => {
                setTumorAvailable(e.target.checked);
                upsertPatient({ tumorAvailable: e.target.checked });
              }}
            />
            Tumor available
          </label>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <FileSlot
            title={slots.find((s) => s.key === "nR1")?.title ?? "Normal R1"}
            file={slots.find((s) => s.key === "nR1")?.file ?? null}
            error={slots.find((s) => s.key === "nR1")?.error}
            validating={validating}
            validatedOk={
              !!stored?.imprintValidated &&
              !!slots.find((s) => s.key === "nR1")?.file
            }
            onPick={(f) => setSlotFile("nR1", f)}
            onClear={() => setSlotFile("nR1", null)}
          />
          <FileSlot
            title={slots.find((s) => s.key === "nR2")?.title ?? "Normal R2"}
            file={slots.find((s) => s.key === "nR2")?.file ?? null}
            error={slots.find((s) => s.key === "nR2")?.error}
            validating={validating}
            validatedOk={
              !!stored?.imprintValidated &&
              !!slots.find((s) => s.key === "nR2")?.file
            }
            onPick={(f) => setSlotFile("nR2", f)}
            onClear={() => setSlotFile("nR2", null)}
          />

          {tumorAvailable ? (
            <>
              <FileSlot
                title={slots.find((s) => s.key === "tR1")?.title ?? "Tumor R1"}
                file={slots.find((s) => s.key === "tR1")?.file ?? null}
                error={slots.find((s) => s.key === "tR1")?.error}
                validating={validating}
                validatedOk={
                  !!stored?.imprintValidated &&
                  !!slots.find((s) => s.key === "tR1")?.file
                }
                onPick={(f) => setSlotFile("tR1", f)}
                onClear={() => setSlotFile("tR1", null)}
              />
              <FileSlot
                title={slots.find((s) => s.key === "tR2")?.title ?? "Tumor R2"}
                file={slots.find((s) => s.key === "tR2")?.file ?? null}
                error={slots.find((s) => s.key === "tR2")?.error}
                validating={validating}
                validatedOk={
                  !!stored?.imprintValidated &&
                  !!slots.find((s) => s.key === "tR2")?.file
                }
                onPick={(f) => setSlotFile("tR2", f)}
                onClear={() => setSlotFile("tR2", null)}
              />
            </>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canValidate}
            onClick={handleValidate}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            Validate files
          </button>

          <button
            type="button"
            disabled={!canNext}
            onClick={handleNext}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            Next (start imprint)
          </button>

          {!tumorAvailable ? (
            <div className="text-xs text-slate-500">
              Tumor not available → imprint is skipped and you can proceed to
              plasma (Step 3).
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
