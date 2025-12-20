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

const PROCESS_TIME_MS = 4000; // время демо-сканирования сабстепа
const AFTER_DONE_BACK_MS = 2000; // пауза после последнего сабстепа (SNV) перед возвратом в step2

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
            <div className="h-2 w-1/3 animate-pulse rounded-full bg-slate-300" />
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Analyzing reads, suppressing noise, extracting features…
          </div>
        </div>
      ) : null}

      {done ? (
        <div className="mt-4 text-xs text-emerald-700">✓ Completed</div>
      ) : null}
    </div>
  );
}

export function Step2() {
  // важно: в твоей текущей версии useWorkflow уже содержит activeStepId/setActiveStepId
  const { state, activeStepId, setActiveStepId } = useWorkflow();
  const patientId = state.selectedPatient?.id ?? null;

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
  const [globalError, setGlobalError] = React.useState<string | null>(null);

  // sync tumorAvailable from store (если уже выставляли раньше)
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
    setSlots((prev) =>
      prev.map((s) => {
        if (s.key !== key) return s;
        return { ...s, file, error: undefined };
      })
    );
    setGlobalError(null);

    // если пользователь меняет файлы — сбрасываем "validated", чтобы Next снова стал недоступен
    if (patientId) {
      const p = PatientsStore.findById(patientId);
      if (p?.imprintValidated) {
        upsertPatient({
          imprintValidated: false,
          imprintValidationAt: "",
          imprintInputsReady: false,
          imprintRunStarted: false,
          imprintModules: { LOH: "idle", CNV: "idle", SNV: "idle" },
          imprintCreated: false,
          imprintCreatedAt: "",
        });
      }
    }
  }

  // Заглушка "полноценной" проверки: presence + extension + size>0
  function validateInputs(): boolean {
    setGlobalError(null);

    let ok = true;

    setSlots((prev) =>
      prev.map((s) => {
        const isTumor = s.key === "tR1" || s.key === "tR2";
        if (isTumor && !tumorAvailable) return { ...s, error: undefined };

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

  function allRequiredFilesUploaded(): boolean {
    const nR1 = slots.find((s) => s.key === "nR1")?.file;
    const nR2 = slots.find((s) => s.key === "nR2")?.file;

    if (!nR1 || !nR2) return false;

    if (tumorAvailable) {
      const tR1 = slots.find((s) => s.key === "tR1")?.file;
      const tR2 = slots.find((s) => s.key === "tR2")?.file;
      if (!tR1 || !tR2) return false;
    }

    return true;
  }

  // MAIN: синхроним tumorAvailable и режим skip (но НЕ запускаем сабстепы автоматически)
  React.useEffect(() => {
    if (!patientId) return;

    upsertPatient({
      tumorAvailable,
      imprintSkipped: !tumorAvailable,
      imprintSkipReason: !tumorAvailable ? "no_tumor" : undefined,
    });

    // если tumor выключен — считаем Step2 skipped (не требуем validate/next)
    if (!tumorAvailable) {
      upsertPatient({
        imprintValidated: false,
        imprintValidationAt: "",
        imprintInputsReady: false,
        imprintRunStarted: false,
        imprintModules: { LOH: "idle", CNV: "idle", SNV: "idle" },
        imprintCreated: false,
        imprintCreatedAt: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, tumorAvailable]);

  // SUBSTEPS: демо-сканирование одного модуля и авто-переход дальше
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

    // если шаг скипнут или не было "Next" (не запускали прогон) — возвращаемся в step2
    if (p?.imprintSkipped || !p?.imprintRunStarted) {
      setActiveStepId("step2");
      return;
    }

    // если уже done — перелистываем дальше
    const current = p?.imprintModules?.[moduleKey];
    if (current === "done") {
      const next =
        moduleKey === "LOH"
          ? "step2_cnv"
          : moduleKey === "CNV"
          ? "step2_snv"
          : "step2";
      const t = setTimeout(() => setActiveStepId(next), 800);
      return () => clearTimeout(t);
    }

    setBusy(true);

    // mark running
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

      // go next
      if (moduleKey === "LOH") setActiveStepId("step2_cnv");
      if (moduleKey === "CNV") setActiveStepId("step2_snv");

      if (moduleKey === "SNV") {
        // финал: возвращаемся на step2, ставим imprintCreated
        upsertPatient({
          imprintCreated: true,
          imprintCreatedAt: new Date().toISOString(),
        });

        setTimeout(() => setActiveStepId("step2"), AFTER_DONE_BACK_MS);

        // ВАЖНО: убрали автопереход на step3 (по твоему требованию)
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
          Сначала выберите пациента на Step 1.
        </div>
      </div>
    );
  }

  const patientLabel = state.selectedPatient?.label ?? patientId;
  const stored = PatientsStore.findById(patientId);

  // ===== SUBSTEP UI (сканирование) =====
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

    const subKey: ImprintModuleKey = isLoh ? "LOH" : isCnv ? "CNV" : "SNV";
    const st = stored?.imprintModules?.[subKey] ?? "idle";

    return (
      <div className="space-y-4">
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm text-slate-600">
          Patient:{" "}
          <span className="font-medium text-slate-900">{patientLabel}</span>{" "}
          <span className="text-slate-400">({patientId})</span>
        </div>

        <ScanCard
          title={title}
          subtitle={subtitle}
          running={st === "running"}
          done={st === "done"}
        />

        <div className="text-xs text-slate-500">
          Демо: сканирование ({Math.round(PROCESS_TIME_MS / 1000)}s) → галочка →
          следующий сабстеп.
        </div>
      </div>
    );
  }

  // ===== MAIN STEP2 UI (upload + validate + next) =====
  const validateDisabled =
    busy ||
    !!stored?.imprintCreated ||
    !tumorAvailable ||
    (stored?.imprintRunStarted ?? false) ||
    !allRequiredFilesUploaded();

  const nextEnabled = tumorAvailable
    ? !!stored?.imprintValidated &&
      !stored?.imprintRunStarted &&
      !stored?.imprintCreated
    : false; // при tumor=false next не разблокируем (step считается skipped)

  async function handleValidate() {
    if (!patientId) return;
    if (!tumorAvailable) return;

    setGlobalError(null);

    const ok = validateInputs();
    if (!ok) return;

    // Заглушка "валидации" — имитируем краткую проверку (например, 700ms)
    upsertPatient({
      imprintValidated: false,
      imprintValidationAt: "",
      imprintInputsReady: false,
    });

    setBusy(true);
    await new Promise((r) => setTimeout(r, 700));
    setBusy(false);

    upsertPatient({
      imprintValidated: true,
      imprintValidationAt: new Date().toISOString(),
      imprintInputsReady: true, // для дерева: после validate считаем ready/processing
      imprintRunStarted: false,
      imprintModules: { LOH: "idle", CNV: "idle", SNV: "idle" },
      imprintCreated: false,
      imprintCreatedAt: "",
      imprintSkipped: false,
      imprintSkipReason: undefined,
    });
  }

  function handleNext() {
    if (!patientId) return;
    if (!tumorAvailable) return;
    if (!stored?.imprintValidated) return;

    // Старт демо-прогона сабстепов (только по Next)
    upsertPatient({
      imprintRunStarted: true,
      imprintModules: { LOH: "idle", CNV: "idle", SNV: "idle" },
      imprintCreated: false,
      imprintCreatedAt: "",
    });

    // переход на первый сабстеп
    setTimeout(() => setActiveStepId("step2_loh"), 800);
  }

  return (
    <div className="space-y-5">
      <div className="text-lg font-semibold">Step 2 — FASTQ upload</div>

      <div className="text-sm text-slate-600">
        Patient:{" "}
        <span className="font-medium text-slate-900">{patientLabel}</span>{" "}
        <span className="text-slate-400">({patientId})</span>
      </div>

      {stored?.imprintCreated ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Imprint created for this patient.
        </div>
      ) : null}

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Upload files
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Сначала загрузка файлов → потом Validate → после Validate
              появляется Next → Next запускает LOH→CNV→SNV.
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={tumorAvailable}
              onChange={(e) => {
                const next = e.target.checked;
                setTumorAvailable(next);

                // при выключении tumor — считаем шаг skipped
                upsertPatient({
                  tumorAvailable: next,
                  imprintSkipped: !next,
                  imprintSkipReason: !next ? "no_tumor" : undefined,
                  imprintValidated: false,
                  imprintValidationAt: "",
                  imprintInputsReady: false,
                  imprintRunStarted: false,
                  imprintModules: { LOH: "idle", CNV: "idle", SNV: "idle" },
                  imprintCreated: false,
                  imprintCreatedAt: "",
                });

                setGlobalError(null);
              }}
              disabled={busy}
            />
            Tumor available
          </label>
        </div>

        {!tumorAvailable ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Tumor files not available → Step 2 is skipped.
            <div className="mt-2 text-xs text-slate-600">
              Дальше (Step 3) будет использоваться режим{" "}
              <span className="font-semibold">ImprintAI+</span> с учётом
              нозологии:{" "}
              <span className="font-semibold">{state.indication || "—"}</span>.
            </div>
          </div>
        ) : null}

        {globalError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {globalError}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-12 gap-4">
          {slots.map((s) => {
            const isTumor = s.key === "tR1" || s.key === "tR2";
            const disabled =
              busy ||
              !!stored?.imprintCreated ||
              (stored?.imprintRunStarted ?? false) ||
              (isTumor && !tumorAvailable);

            return (
              <div key={s.key} className="col-span-12 md:col-span-6">
                <div className="text-xs text-slate-500">{s.title}</div>

                <div className="mt-1 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <input
                    type="file"
                    disabled={disabled}
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
            );
          })}
        </div>

        {/* Actions */}
        {tumorAvailable ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleValidate}
              disabled={validateDisabled}
              className={[
                "rounded-full border px-4 py-2 text-sm transition",
                validateDisabled
                  ? "border-slate-200 bg-slate-100 text-slate-400"
                  : "border-slate-200 bg-white hover:border-slate-300 text-slate-800",
              ].join(" ")}
            >
              {busy
                ? "Validating…"
                : stored?.imprintValidated
                ? "Validated ✓"
                : "Validate"}
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={!nextEnabled}
              className={[
                "rounded-full px-5 py-2 text-sm font-medium transition",
                nextEnabled
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-slate-200 text-slate-400",
              ].join(" ")}
            >
              Next
            </button>

            <div className="text-xs text-slate-500">
              Next станет активной только после успешного Validate.
            </div>
          </div>
        ) : null}
      </Card>

      <div className="text-xs text-slate-500">
        Debug: tumor={tumorAvailable ? "yes" : "no"} • validated=
        {stored?.imprintValidated ? "yes" : "no"} • runStarted=
        {stored?.imprintRunStarted ? "yes" : "no"} • created=
        {stored?.imprintCreated ? "yes" : "no"}
      </div>
    </div>
  );
}
