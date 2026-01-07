"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { useWorkflow } from "@/components/workflow/WorkflowContext";
import { PatientsStore, type StoredPatient } from "@/store/patientsStore";
import { ImprintModal, type Modules } from "@/components/mrd/ImprintModal";

const INDICATION_OPTIONS = [
  { value: "", label: "Select indication…" },
  { value: "Colorectal cancer", label: "Colorectal cancer" },
  { value: "Breast cancer", label: "Breast cancer" },
  { value: "Lung cancer (NSCLC)", label: "Lung cancer (NSCLC)" },
  { value: "Ovarian cancer", label: "Ovarian cancer" },
];

export function Step1() {
  const {
    state,
    setSelectedPatient,
    setCaseId,
    setIndication,
    toggleSurgeryDate,
    setSurgeryDate,
    setActiveStepId,
  } = useWorkflow();

  const [storeVersion, setStoreVersion] = React.useState(0);
  const [imprintOpen, setImprintOpen] = React.useState(false);

  const [caseApplied, setCaseApplied] = React.useState(() => {
    const hasCase = !!(state.caseId || "").trim();
    const hasAnyMeta =
      !!(state.indication || "").trim() ||
      !!state.surgeryDate ||
      !!state.selectedPatient;
    return hasCase && hasAnyMeta;
  });

  function findStoredById(id: string): StoredPatient | undefined {
    const key = id.trim().toLowerCase();
    if (!key) return undefined;
    return PatientsStore.list().find((x) => x.id.trim().toLowerCase() === key);
  }

  function ensureHasSurgeryDate(desired: boolean) {
    toggleSurgeryDate(desired);
  }

  function onCaseIdChange(v: string) {
    setCaseId(v);
    setCaseApplied(false);
  }

  function applyCaseId(raw?: string) {
    const id = (raw ?? state.caseId ?? "").trim();
    if (!id) return;

    const stored = findStoredById(id);

    if (stored) {
      setSelectedPatient({ id: stored.id, label: stored.label || stored.id });
      setCaseId(stored.id);
      setIndication(stored.indication || "");

      ensureHasSurgeryDate(!!stored.hasSurgeryDate);
      if (stored.surgeryDate) {
        ensureHasSurgeryDate(true);
        setSurgeryDate(stored.surgeryDate);
      } else {
        setSurgeryDate("");
      }

      setCaseApplied(true);
      setStoreVersion((v) => v + 1);
      return;
    }

    setSelectedPatient({ id, label: id });
    setCaseId(id);

    setIndication("");
    ensureHasSurgeryDate(false);
    setSurgeryDate("");

    setCaseApplied(true);
    setStoreVersion((v) => v + 1);
  }

  const caseId = (state.caseId || "").trim();
  const hasCaseId = !!caseId;
  const fieldsUnlocked = caseApplied;

  const isValid =
    fieldsUnlocked &&
    hasCaseId &&
    (state.indication || "").trim().length > 0 &&
    (!state.hasSurgeryDate || !!state.surgeryDate);

  const stored = hasCaseId ? findStoredById(caseId) : undefined;

  const imprintReady = !!stored?.imprintCreated;
  const tumorText = imprintReady
    ? "Yes"
    : stored?.tumorAvailable === false
    ? "No"
    : "Yes";

  const nextStepIdPreview =
    imprintReady || stored?.tumorAvailable === false ? "step3" : "step2";
  const nextStepLabel =
    nextStepIdPreview === "step3"
      ? "Step 3 (Add plasma sample)"
      : "Step 2 (Create imprint)";

  const panelBase = "rounded-2xl border border-slate-200 bg-white p-5";
  const label = "text-xs font-medium text-slate-500";

  const inputEnabled =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300";
  const inputDisabled =
    "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400 outline-none cursor-not-allowed";

  const selectEnabled =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300";
  const selectDisabled =
    "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400 outline-none cursor-not-allowed";

  const btnGhost =
    "inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50";
  const btnGhostDisabled =
    "inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-400 cursor-not-allowed";

  // Symmetric action cards (same geometry)
  const actionCard =
    "w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-[0_10px_30px_rgba(15,23,42,0.08)] flex flex-col min-h-[160px]";
  const actionTitle = "text-sm font-semibold text-slate-900";
  const actionSub = "mt-1 text-xs text-slate-500 min-h-[32px]";
  const actionFooter = "mt-auto pt-4 flex items-center justify-center";

  const actionBtnBase =
    "inline-flex items-center justify-center h-10 w-[220px] rounded-2xl text-sm font-semibold";
  const actionBtnPrimary = `${actionBtnBase} bg-sky-600 text-white hover:bg-sky-700`;
  const actionBtnSecondary = `${actionBtnBase} border border-slate-200 bg-white text-slate-900 hover:bg-slate-50`;

  function demoFill() {
    if (!fieldsUnlocked) return;
    setIndication("Colorectal cancer");
    ensureHasSurgeryDate(true);
    setSurgeryDate(new Date().toISOString().slice(0, 10));
  }

  function saveAndContinue(): boolean {
    const cid = (state.caseId || "").trim();
    if (!cid) return false;

    const indicationOk = (state.indication || "").trim().length > 0;
    const surgeryOk = !state.hasSurgeryDate || !!state.surgeryDate;
    if (!indicationOk || !surgeryOk) return false;

    PatientsStore.upsert({
      id: cid,
      label: state.selectedPatient?.label || cid,
      indication: state.indication || "",
      hasSurgeryDate: state.hasSurgeryDate,
      surgeryDate: state.hasSurgeryDate ? state.surgeryDate : "",
    });

    const after = PatientsStore.findById(cid);

    if (after?.imprintCreated || after?.tumorAvailable === false) {
      setActiveStepId("step3");
    } else {
      setActiveStepId("step2");
    }

    setStoreVersion((v) => v + 1);
    return true;
  }

  const modules: Modules = {
    LOH: stored?.imprintModules?.LOH ?? "done",
    CNV: stored?.imprintModules?.CNV ?? "done",
    SNV: stored?.imprintModules?.SNV ?? "done",
  };

  return (
    <div className="space-y-6">
      <Card className={panelBase}>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Case ID + Apply */}
          <div className="md:col-span-2">
            <div className={label}>Case ID / Patient ID</div>

            <div className="mt-2 flex gap-2">
              <input
                value={state.caseId || ""}
                onChange={(e) => onCaseIdChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
                placeholder="e.g. 100"
                className={inputEnabled}
              />
              <button
                type="button"
                onClick={() => applyCaseId()}
                disabled={!hasCaseId}
                className={hasCaseId ? btnGhost : btnGhostDisabled}
              >
                Apply
              </button>
            </div>

            <div className="mt-2 text-xs text-slate-500">
              {fieldsUnlocked
                ? "Unlocked"
                : "Apply Case ID to unlock fields below"}
            </div>
          </div>

          {/* Indication */}
          <div>
            <div className={label}>Indication</div>
            <select
              value={state.indication || ""}
              onChange={(e) => setIndication(e.target.value)}
              disabled={!fieldsUnlocked}
              className={
                fieldsUnlocked
                  ? `${selectEnabled} mt-2`
                  : `${selectDisabled} mt-2`
              }
            >
              {INDICATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Surgery date */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className={label}>Surgery date</div>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={!!state.hasSurgeryDate}
                  disabled={!fieldsUnlocked}
                  onChange={(e) => ensureHasSurgeryDate(e.target.checked)}
                />
                Known
              </label>
            </div>
            <input
              type="date"
              value={state.surgeryDate || ""}
              onChange={(e) => setSurgeryDate(e.target.value)}
              disabled={!fieldsUnlocked || !state.hasSurgeryDate}
              className={[
                "mt-2",
                fieldsUnlocked && state.hasSurgeryDate
                  ? inputEnabled
                  : inputDisabled,
              ].join(" ")}
            />
          </div>

          {/* Status blocks */}
          <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className={label}>Tumor available</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {fieldsUnlocked && hasCaseId ? tumorText : "—"}
              </div>
            </div>

            <div
              className={[
                "rounded-2xl px-4 py-3 border",
                imprintReady
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-slate-50",
              ].join(" ")}
            >
              <div className={label}>Imprint ready</div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <div
                  className={[
                    "text-sm font-semibold",
                    imprintReady ? "text-emerald-700" : "text-slate-900",
                  ].join(" ")}
                >
                  {fieldsUnlocked && hasCaseId
                    ? imprintReady
                      ? "Yes"
                      : "No"
                    : "—"}
                </div>

                {fieldsUnlocked && hasCaseId && imprintReady ? (
                  <button
                    type="button"
                    onClick={() => setImprintOpen(true)}
                    className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    View imprint →
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ACTIONS — perfectly symmetric */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Demo fill */}
        <button
          type="button"
          onClick={demoFill}
          disabled={!fieldsUnlocked}
          className={[
            actionCard,
            fieldsUnlocked ? "" : "opacity-60 cursor-not-allowed",
          ].join(" ")}
        >
          <div className={actionTitle}>Demo fill</div>
          <div className={actionSub}>
            Auto-fills indication + surgery date (demo).
          </div>

          <div className={actionFooter}>
            <span className={actionBtnSecondary}>Demo fill</span>
          </div>
        </button>

        {/* Save & Continue */}
        <button
          type="button"
          onClick={() => saveAndContinue()}
          disabled={!isValid}
          className={[
            actionCard,
            isValid ? "" : "opacity-60 cursor-not-allowed",
          ].join(" ")}
        >
          <div className={actionTitle}>Save &amp; Continue</div>
          <div className={actionSub}>
            Saves the case and continues to{" "}
            <span className="font-semibold text-slate-700">
              {nextStepLabel}
            </span>
            .
          </div>

          <div className={actionFooter}>
            <span className={actionBtnPrimary}>Continue →</span>
          </div>
        </button>
      </div>

      <ImprintModal
        open={imprintOpen}
        onClose={() => setImprintOpen(false)}
        patientName={state.selectedPatient?.label || caseId || "—"}
        imprintCreatedAt={stored?.imprintCreatedAt}
        modules={modules}
        onOpenModule={(k: keyof Modules) => {
          setImprintOpen(false);
          if (k === "LOH") setActiveStepId("step2_loh");
          if (k === "CNV") setActiveStepId("step2_cnv");
          if (k === "SNV") setActiveStepId("step2_snv");
        }}
      />

      <div className="hidden">{storeVersion}</div>
    </div>
  );
}
