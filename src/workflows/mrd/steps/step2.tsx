"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { useWorkflow } from "@/components/workflow/WorkflowContext";
import {
  PatientsStore,
  type StoredPatient,
  type ImprintModuleKey,
} from "@/store/patientsStore";
import { ImprintModal, type Modules } from "@/components/mrd/ImprintModal";

type FileSlotKey = "nR1" | "nR2" | "tR1" | "tR2";

type FileMeta = {
  name: string;
  size: number;
};

type Slot = {
  key: FileSlotKey;
  title: string;
  file: File | null; // best-effort in-memory only
  meta: FileMeta | null; // persisted in localStorage
  error?: string;
};

type ImprintModulesState = Record<
  ImprintModuleKey,
  "idle" | "running" | "done"
>;

const VALIDATE_TIME_MS = 900;
const PROCESS_TIME_MS = 1200;

const FILE_META_LS_PREFIX = "mrd_step2_files_v1:";
const VALID_LS_PREFIX = "mrd_step2_valid_v1:";
const VALID_GLOBAL_LS_PREFIX = "mrd_step2_valid_global_v1:";

/**
 * In-memory cache for real File objects (browser won't let you restore them after reload).
 * We persist only meta (name/size) for demo UI.
 */
const FILE_CACHE = new Map<string, Partial<Record<FileSlotKey, File | null>>>();

/* ------------------------------ helpers ------------------------------ */

function bytesToHuman(n: number) {
  const kb = n / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function extOk(name: string) {
  const n = name.toLowerCase();
  return (
    n.endsWith(".fastq") ||
    n.endsWith(".fq") ||
    n.endsWith(".fastq.gz") ||
    n.endsWith(".fq.gz")
  );
}

function getStored(id: string): StoredPatient | undefined {
  return PatientsStore.findById(id);
}

function safeGetLocalStorageItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorageItem(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function readMetaFromLS(
  patientId: string
): Partial<Record<FileSlotKey, FileMeta | null>> {
  const raw = safeGetLocalStorageItem(FILE_META_LS_PREFIX + patientId);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Partial<
      Record<FileSlotKey, FileMeta | null>
    >;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function writeMetaToLS(
  patientId: string,
  meta: Partial<Record<FileSlotKey, FileMeta | null>>
) {
  safeSetLocalStorageItem(
    FILE_META_LS_PREFIX + patientId,
    JSON.stringify(meta)
  );
}

function readValidFromLS(
  patientId: string
): Partial<Record<FileSlotKey, boolean>> {
  const raw = safeGetLocalStorageItem(VALID_LS_PREFIX + patientId);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Partial<Record<FileSlotKey, boolean>>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function writeValidToLS(
  patientId: string,
  v: Partial<Record<FileSlotKey, boolean>>
) {
  safeSetLocalStorageItem(VALID_LS_PREFIX + patientId, JSON.stringify(v));
}

function readValidGlobalFromLS(patientId: string): boolean {
  const raw = safeGetLocalStorageItem(VALID_GLOBAL_LS_PREFIX + patientId);
  return raw === "1";
}

function writeValidGlobalToLS(patientId: string, v: boolean) {
  safeSetLocalStorageItem(VALID_GLOBAL_LS_PREFIX + patientId, v ? "1" : "0");
}

function getStoredValidatedFlag(patientId: string): boolean {
  const p = getStored(patientId);
  return Boolean(p?.imprintValidated);
}

/* ------------------------------ FileSlot UI ------------------------------ */

function FileSlot({
  title,
  file,
  meta,
  error,
  validating,
  inputKey,
  isValidated,
  onPick,
  onClear,
}: {
  title: string;
  file: File | null;
  meta: FileMeta | null;
  error?: string;
  validating: boolean;
  inputKey: string;
  isValidated: boolean;
  onPick: (f: File | null) => void;
  onClear: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const border = error
    ? "border-red-200"
    : isValidated
    ? "border-emerald-300"
    : meta
    ? "border-slate-300"
    : "border-slate-200";

  const bg = error
    ? "bg-red-50"
    : isValidated
    ? "bg-emerald-50/40"
    : "bg-white";

  const displayName = meta?.name ?? (file ? file.name : "No file selected");
  const displaySize = meta?.size ?? (file ? file.size : 0);

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

      <div className={["rounded-2xl border px-4 py-3", border, bg].join(" ")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-900">
              {displayName}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {meta ? bytesToHuman(displaySize) : "Pick a FASTQ(.gz) file."}
            </div>
            {error ? (
              <div className="mt-2 text-xs font-semibold text-red-700">
                {error}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <input
              key={inputKey}
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
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
              disabled={validating || !meta}
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

/* ------------------------------ Step2 ------------------------------ */

export function Step2() {
  const { state, activeStepId, setActiveStepId } = useWorkflow();

  const patientId = state.selectedPatient?.id ?? null;
  const patientLabel = state.selectedPatient?.label ?? patientId;

  const isMain = activeStepId === "step2";
  const isLoh = activeStepId === "step2_loh";
  const isCnv = activeStepId === "step2_cnv";
  const isSnv = activeStepId === "step2_snv";

  const [tumorAvailable, setTumorAvailable] = React.useState<boolean>(true);

  const [slots, setSlots] = React.useState<Slot[]>([
    { key: "nR1", title: "Normal FASTQ — R1", file: null, meta: null },
    { key: "nR2", title: "Normal FASTQ — R2", file: null, meta: null },
    { key: "tR1", title: "Tumor FASTQ — R1", file: null, meta: null },
    { key: "tR2", title: "Tumor FASTQ — R2", file: null, meta: null },
  ]);

  const [busy, setBusy] = React.useState(false);
  const [validating, setValidating] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [imprintOpen, setImprintOpen] = React.useState(false);

  // PatientsStore doesn't cause rerenders; bump after writes.
  const [storeVersion, setStoreVersion] = React.useState(0);
  function bumpStore() {
    setStoreVersion((v) => v + 1);
  }

  function cacheKey() {
    return patientId || "";
  }

  function setCachedFile(k: FileSlotKey, f: File | null) {
    const key = cacheKey();
    if (!key) return;
    const cur = FILE_CACHE.get(key) ?? {};
    FILE_CACHE.set(key, { ...cur, [k]: f });
  }

  function getCachedFile(k: FileSlotKey): File | null {
    const key = cacheKey();
    if (!key) return null;
    return FILE_CACHE.get(key)?.[k] ?? null;
  }

  function upsertPatient(patch: Partial<StoredPatient>) {
    if (!patientId) return;
    const prev = getStored(patientId);

    PatientsStore.upsert({
      ...(prev ?? { id: patientId, label: patientLabel || patientId }),
      id: patientId,
      label: patientLabel || patientId,
      ...patch,
    });

    bumpStore();
  }

  // tumorAvailable from store (if imprint exists -> forced YES)
  React.useEffect(() => {
    if (!patientId) return;
    const p = getStored(patientId);
    if (p?.imprintCreated) setTumorAvailable(true);
    else if (p?.tumorAvailable !== undefined)
      setTumorAvailable(Boolean(p.tumorAvailable));
  }, [patientId, storeVersion]);

  function tumorEffective(): boolean {
    if (!patientId) return tumorAvailable;
    const p = getStored(patientId);
    return p?.imprintCreated ? true : tumorAvailable;
  }

  // Restore meta from localStorage on mount / patient change (deps MUST be constant)
  React.useEffect(() => {
    if (!patientId) return;
    const meta = readMetaFromLS(patientId);

    // If validation was stored in PatientsStore (legacy behavior), mirror it to LS
    // so the “Validated” state survives patient switching and page reload.
    const storedValidated = getStoredValidatedFlag(patientId);
    if (storedValidated && !readValidGlobalFromLS(patientId)) {
      writeValidGlobalToLS(patientId, true);
      const p = getStored(patientId);
      const isTumor = p?.imprintCreated
        ? true
        : Boolean(p?.tumorAvailable ?? tumorAvailable);

      const reqKeys: FileSlotKey[] = isTumor
        ? ["nR1", "nR2", "tR1", "tR2"]
        : ["nR1", "nR2"];

      reqKeys.forEach((k) => {
        if (meta[k]) setValidInLS(k, true);
      });
    }

    setSlots((prev) =>
      prev.map((s) => ({
        ...s,
        file: getCachedFile(s.key),
        meta: meta[s.key] ?? null,
        error: undefined,
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  function setMetaInLS(key: FileSlotKey, meta: FileMeta | null) {
    if (!patientId) return;
    const cur = readMetaFromLS(patientId);
    writeMetaToLS(patientId, { ...cur, [key]: meta });
  }

  function setValidInLS(key: FileSlotKey, v: boolean) {
    if (!patientId) return;
    const cur = readValidFromLS(patientId);
    writeValidToLS(patientId, { ...cur, [key]: v });
  }

  function getValidInLS(key: FileSlotKey): boolean {
    if (!patientId) return false;
    const cur = readValidFromLS(patientId);
    return Boolean(cur[key]);
  }

  function clearAllValidInLS() {
    if (!patientId) return;
    writeValidToLS(patientId, {});
    writeValidGlobalToLS(patientId, false);
  }

  function invalidateValidationSoft(slotKey?: FileSlotKey) {
    if (!patientId) return;

    if (slotKey) setValidInLS(slotKey, false);

    // IMPORTANT: global validation lives in LS to avoid being reset by PatientsStore updates
    writeValidGlobalToLS(patientId, false);

    // Also keep PatientsStore in sync (so validation survives reload even if LS keys change)
    upsertPatient({
      imprintValidated: false,
      imprintValidationAt: "",
      imprintInputsReady: false,
    });
  }

  function resetImprintHard() {
    clearAllValidInLS();
    upsertPatient({
      imprintCreated: false,
      imprintCreatedAt: "",
      imprintValidated: false,
      imprintValidationAt: "",
      imprintRunStarted: false,
      imprintInputsReady: false,
      imprintSkipped: false,
      imprintSkipReason: undefined,
      imprintModules: { LOH: "idle", CNV: "idle", SNV: "idle" },
    });
  }

  function handlePick(key: FileSlotKey, file: File | null) {
    setGlobalError(null);
    if (!file) return;

    setCachedFile(key, file);

    const meta: FileMeta = { name: file.name, size: file.size };
    setMetaInLS(key, meta);

    setSlots((prev) =>
      prev.map((s) =>
        s.key === key ? { ...s, file, meta, error: undefined } : s
      )
    );

    // no auto-validate
    invalidateValidationSoft(key);
  }

  function handleClear(key: FileSlotKey) {
    if (!patientId) return;
    setGlobalError(null);

    const stored = getStored(patientId);

    setCachedFile(key, null);
    setMetaInLS(key, null);
    setValidInLS(key, false);

    setSlots((prev) =>
      prev.map((s) =>
        s.key === key ? { ...s, file: null, meta: null, error: undefined } : s
      )
    );

    // If imprint already created -> hard reset
    if (stored?.imprintCreated) {
      resetImprintHard();
      setActiveStepId("step2");
      return;
    }

    invalidateValidationSoft(key);
  }

  function metaPresent(k: FileSlotKey): boolean {
    return Boolean(slots.find((s) => s.key === k)?.meta);
  }

  function validateFilesLocal(): boolean {
    let ok = true;

    setSlots((prev) =>
      prev.map((s) => {
        if ((s.key === "tR1" || s.key === "tR2") && !tumorEffective()) {
          return { ...s, error: undefined };
        }

        if (!s.meta) {
          ok = false;
          return { ...s, error: "Missing file" };
        }

        if (!extOk(s.meta.name)) {
          ok = false;
          return { ...s, error: "Expected FASTQ / FASTQ.GZ" };
        }

        return { ...s, error: undefined };
      })
    );

    if (!ok) setGlobalError("Fix file errors first.");
    return ok;
  }

  function haveAllRequiredFiles(): boolean {
    if (!metaPresent("nR1") || !metaPresent("nR2")) return false;
    if (!tumorEffective()) return true;
    return metaPresent("tR1") && metaPresent("tR2");
  }

  async function handleValidate() {
    if (!patientId) return;

    setGlobalError(null);

    if (!haveAllRequiredFiles()) {
      setGlobalError("Please upload all required files first.");
      return;
    }

    const ok = validateFilesLocal();
    if (!ok) return;

    setBusy(true);
    setValidating(true);

    await new Promise<void>((resolve) => setTimeout(resolve, VALIDATE_TIME_MS));

    setValidInLS("nR1", true);
    setValidInLS("nR2", true);

    if (tumorEffective()) {
      setValidInLS("tR1", true);
      setValidInLS("tR2", true);
    } else {
      setValidInLS("tR1", false);
      setValidInLS("tR2", false);
    }

    // persist global validated in LS
    writeValidGlobalToLS(patientId, true);

    // Persist validation to PatientsStore too (survives reload/patient switches)
    upsertPatient({
      tumorAvailable: tumorEffective(),
      imprintSkipped: false,
      imprintSkipReason: undefined,
      imprintValidated: true,
      imprintValidationAt: new Date().toISOString(),
    });

    setBusy(false);
    setValidating(false);
  }

  function handleStartOrProceed() {
    if (!patientId) return;
    setGlobalError(null);

    // If tumor not available -> proceed to plasma (keep validated state!)
    if (!tumorEffective()) {
      upsertPatient({
        tumorAvailable: false,
        imprintSkipped: true,
        imprintSkipReason: "no_tumor",
        imprintRunStarted: false,
        imprintInputsReady: false,
      });
      setActiveStepId("step3");
      return;
    }

    // tumor-informed: require validation (LS and/or PatientsStore)
    const storedValidated = Boolean(getStored(patientId)?.imprintValidated);
    if (!(readValidGlobalFromLS(patientId) || storedValidated)) {
      setGlobalError("Validate files first.");
      return;
    }

    upsertPatient({
      tumorAvailable: true,
      imprintRunStarted: true,
      imprintInputsReady: true,
      imprintCreated: false,
      imprintCreatedAt: "",
      imprintModules: { LOH: "idle", CNV: "idle", SNV: "idle" },
      imprintSkipped: false,
      imprintSkipReason: undefined,
    });

    setTimeout(() => setActiveStepId("step2_loh"), 600);
  }

  function openImprintModal() {
    if (!patientId) return;
    const stored = getStored(patientId);
    if (!stored?.imprintCreated) return;
    setImprintOpen(true);
  }

  // Auto-run LOH/CNV/SNV
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

    const p = getStored(patientId);
    if (p?.imprintSkipped) return;
    if (!p?.imprintRunStarted) return;

    if (p?.imprintModules?.[moduleKey] === "done") {
      if (moduleKey === "LOH") setActiveStepId("step2_cnv");
      if (moduleKey === "CNV") setActiveStepId("step2_snv");
      if (moduleKey === "SNV") setActiveStepId("step2");
      return;
    }

    setBusy(true);

    const current: ImprintModulesState = {
      LOH: p?.imprintModules?.LOH ?? "idle",
      CNV: p?.imprintModules?.CNV ?? "idle",
      SNV: p?.imprintModules?.SNV ?? "idle",
    };

    upsertPatient({ imprintModules: { ...current, [moduleKey]: "running" } });

    const timer = setTimeout(() => {
      const p2 = getStored(patientId);

      const next: ImprintModulesState = {
        LOH: p2?.imprintModules?.LOH ?? "idle",
        CNV: p2?.imprintModules?.CNV ?? "idle",
        SNV: p2?.imprintModules?.SNV ?? "idle",
      };

      upsertPatient({ imprintModules: { ...next, [moduleKey]: "done" } });

      setBusy(false);

      if (moduleKey === "LOH") setActiveStepId("step2_cnv");
      if (moduleKey === "CNV") setActiveStepId("step2_snv");

      if (moduleKey === "SNV") {
        upsertPatient({
          imprintCreated: true,
          imprintCreatedAt: new Date().toISOString(),
          tumorAvailable: true,
          imprintSkipped: false,
          imprintSkipReason: undefined,
          imprintRunStarted: false,
        });
        setTimeout(() => setActiveStepId("step2"), 900);
      }
    }, PROCESS_TIME_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, isLoh, isCnv, isSnv]);

  if (!patientId) {
    return (
      <div className="space-y-2">
        <div className="text-lg font-semibold">Create imprint</div>
        <div className="text-sm text-slate-600">
          Select a patient in Step 1 first.
        </div>
      </div>
    );
  }

  const stored = getStored(patientId);

  // Substeps — view imprint button removed
  if (!isMain) {
    const title = isLoh
      ? "LOH discovery"
      : isCnv
      ? "CNV segments"
      : "SNV compendium";
    const key: ImprintModuleKey = isLoh ? "LOH" : isCnv ? "CNV" : "SNV";
    const status = stored?.imprintModules?.[key] ?? "idle";

    return (
      <Card className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-xs text-slate-600">
          Demo: this module runs automatically and then moves to the next one.
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          Status:{" "}
          <span className="font-semibold">
            {status === "running"
              ? "Running…"
              : status === "done"
              ? "Done ✓"
              : "Idle"}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveStepId("step2")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Back to upload
          </button>
        </div>

        <div className="hidden">{storeVersion}</div>
      </Card>
    );
  }

  const canValidate = !busy && !stored?.imprintCreated;
  const validatedGlobal =
    readValidGlobalFromLS(patientId) || Boolean(stored?.imprintValidated);

  const canStartOrProceed =
    !busy &&
    !stored?.imprintCreated &&
    (tumorEffective() ? validatedGlobal : true);

  const modules: Modules = {
    LOH: stored?.imprintModules?.LOH ?? "idle",
    CNV: stored?.imprintModules?.CNV ?? "idle",
    SNV: stored?.imprintModules?.SNV ?? "idle",
  };

  function slotValidated(k: FileSlotKey) {
    if (!metaPresent(k)) return false;

    // If patient-level validated flag exists, treat populated slots as validated.
    if (stored?.imprintValidated) return true;

    return validatedGlobal && getValidInLS(k);
  }

  return (
    <div className="space-y-5">
      <div className="text-lg font-semibold">FASTQ upload</div>

      <div className="text-sm text-slate-600">
        Patient:{" "}
        <span className="font-medium text-slate-900">{patientLabel}</span>{" "}
      </div>

      <Card className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">Inputs</div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={tumorEffective()}
              disabled={Boolean(stored?.imprintCreated)}
              onChange={(e) => {
                if (!patientId) return;
                if (stored?.imprintCreated) return;

                setTumorAvailable(e.target.checked);
                upsertPatient({ tumorAvailable: e.target.checked });

                // switching tumor flag should invalidate validation (logic/UX)
                invalidateValidationSoft();
              }}
            />
            Tumor available
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FileSlot
            title="Normal FASTQ — R1"
            file={slots.find((s) => s.key === "nR1")?.file ?? null}
            meta={slots.find((s) => s.key === "nR1")?.meta ?? null}
            error={slots.find((s) => s.key === "nR1")?.error}
            validating={validating}
            inputKey={`${patientId}-nR1`}
            isValidated={slotValidated("nR1")}
            onPick={(f) => handlePick("nR1", f)}
            onClear={() => handleClear("nR1")}
          />

          <FileSlot
            title="Normal FASTQ — R2"
            file={slots.find((s) => s.key === "nR2")?.file ?? null}
            meta={slots.find((s) => s.key === "nR2")?.meta ?? null}
            error={slots.find((s) => s.key === "nR2")?.error}
            validating={validating}
            inputKey={`${patientId}-nR2`}
            isValidated={slotValidated("nR2")}
            onPick={(f) => handlePick("nR2", f)}
            onClear={() => handleClear("nR2")}
          />

          {tumorEffective() ? (
            <>
              <FileSlot
                title="Tumor FASTQ — R1"
                file={slots.find((s) => s.key === "tR1")?.file ?? null}
                meta={slots.find((s) => s.key === "tR1")?.meta ?? null}
                error={slots.find((s) => s.key === "tR1")?.error}
                validating={validating}
                inputKey={`${patientId}-tR1`}
                isValidated={slotValidated("tR1")}
                onPick={(f) => handlePick("tR1", f)}
                onClear={() => handleClear("tR1")}
              />

              <FileSlot
                title="Tumor FASTQ — R2"
                file={slots.find((s) => s.key === "tR2")?.file ?? null}
                meta={slots.find((s) => s.key === "tR2")?.meta ?? null}
                error={slots.find((s) => s.key === "tR2")?.error}
                validating={validating}
                inputKey={`${patientId}-tR2`}
                isValidated={slotValidated("tR2")}
                onPick={(f) => handlePick("tR2", f)}
                onClear={() => handleClear("tR2")}
              />
            </>
          ) : (
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Tumor is not available → imprint cannot be created. You can upload
              normal and proceed directly to plasma.
            </div>
          )}
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
            disabled={!canStartOrProceed}
            onClick={handleStartOrProceed}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {tumorEffective() ? "Start imprint" : "Proceed to plasma"}
          </button>

          <button
            type="button"
            onClick={openImprintModal}
            disabled={!Boolean(stored?.imprintCreated)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50"
          >
            View imprint
            {stored?.imprintCreated ? (
              <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            ) : null}
          </button>

          {stored?.imprintCreated ? (
            <div className="text-xs font-semibold text-emerald-700">
              Imprint created ✓
            </div>
          ) : null}
        </div>

        {globalError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {globalError}
          </div>
        ) : null}

        <div className="hidden">{storeVersion}</div>
      </Card>

      <ImprintModal
        open={imprintOpen}
        onClose={() => setImprintOpen(false)}
        patientName={patientLabel || patientId}
        imprintCreatedAt={stored?.imprintCreatedAt}
        modules={modules}
        onOpenModule={(k: keyof Modules) => {
          setImprintOpen(false);
          if (k === "LOH") setActiveStepId("step2_loh");
          if (k === "CNV") setActiveStepId("step2_cnv");
          if (k === "SNV") setActiveStepId("step2_snv");
        }}
      />
    </div>
  );
}
