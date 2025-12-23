"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { useWorkflow } from "@/components/workflow/WorkflowContext";
import { PatientsStore, type StoredPatient } from "@/store/patientsStore";

const INDICATION_OPTIONS = [
  { value: "", label: "Select indication…" },
  { value: "Colorectal cancer", label: "Colorectal cancer" },
  { value: "Breast cancer", label: "Breast cancer" },
  { value: "Lung cancer (NSCLC)", label: "Lung cancer (NSCLC)" },
  { value: "Ovarian cancer", label: "Ovarian cancer" },
];

export function Step1() {
  const { state, setSelectedPatient, setCaseId, setIndication, toggleSurgeryDate, setSurgeryDate } =
    useWorkflow();

  // PatientsStore doesn't rerender UI automatically.
  const [storeVersion, setStoreVersion] = React.useState(0);

  // Unlock form only after Case ID has been applied (blur/enter)
  const [caseApplied, setCaseApplied] = React.useState(() => {
    const hasCase = !!(state.caseId || "").trim();
    const hasAnyMeta = !!(state.indication || "").trim() || !!state.surgeryDate || !!state.selectedPatient;
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

  // If user edits Case ID, lock again until apply happens
  function onCaseIdChange(v: string) {
    setCaseId(v);
    setCaseApplied(false);
  }

  /**
   * Auto apply on blur/enter:
   * - If exists: load stored values
   * - If not exists: create draft (empty) and unlock
   */
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

    // New case draft: do not auto-fill
    setSelectedPatient({ id, label: id });
    setCaseId(id);

    setIndication("");
    ensureHasSurgeryDate(false);
    setSurgeryDate("");

    setCaseApplied(true);
    setStoreVersion((v) => v + 1);
  }

  function demoFill() {
    setIndication("Colorectal cancer");
    ensureHasSurgeryDate(true);

    const d = new Date();
    d.setDate(d.getDate() - 30);
    setSurgeryDate(d.toISOString().slice(0, 10));
  }

  function saveSubject(): boolean {
    const caseId = (state.caseId || "").trim();
    if (!caseId) return false;

    const indicationOk = (state.indication || "").trim().length > 0;
    const surgeryOk = !state.hasSurgeryDate || !!state.surgeryDate;
    if (!indicationOk || !surgeryOk) return false;

    PatientsStore.upsert({
      id: caseId,
      label: state.selectedPatient?.label || caseId,
      indication: state.indication || "",
      hasSurgeryDate: state.hasSurgeryDate,
      surgeryDate: state.hasSurgeryDate ? state.surgeryDate : "",
    });

    setStoreVersion((v) => v + 1);
    return true;
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

  const imprintText = stored?.imprintCreated ? "Yes" : "No";
  const tumorText =
    stored?.tumorAvailable === true ? "Yes" : stored?.tumorAvailable === false ? "No" : "Unknown";

  // Light/minimal UI helpers
  const panel = "rounded-2xl border border-slate-200 bg-white p-5";
  const label = "text-xs font-medium text-slate-500";
  const input =
    "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300";
  const select =
    "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300";
  const hint = "mt-2 text-xs text-slate-500";

  const actionCard = "rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left hover:bg-slate-50 transition-colors";
  const actionTitle = "text-sm font-semibold text-slate-900";
  const actionSub = "mt-1 text-xs text-slate-500";

  const btnPrimary =
    "inline-flex items-center justify-center rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:bg-slate-100 disabled:text-slate-400";
  const btnSecondary =
    "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400";

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="text-sm font-semibold text-slate-900">Create Subject / Case</div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Subject ID */}
          <div className={panel}>
            <div className={label}>Subject ID</div>
            <input
              value={state.caseId}
              onChange={(e) => onCaseIdChange(e.target.value)}
              onBlur={(e) => applyCaseId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyCaseId((e.target as HTMLInputElement).value);
                }
              }}
              placeholder="e.g., CRC-0465"
              className={input}
            />
            {!fieldsUnlocked ? <div className={hint}>Enter an ID to unlock the form.</div> : null}
          </div>

          {/* Indication */}
          <div className={panel}>
            <div className={label}>Indication</div>
            <select
              value={state.indication}
              onChange={(e) => setIndication(e.target.value)}
              className={select}
              disabled={!fieldsUnlocked}
            >
              {INDICATION_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Surgery date */}
          <div className={panel}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={label}>Surgery date</div>
                <div className="mt-1 text-xs text-slate-500">Optional — used to label plasma timepoints in Step 3.</div>
              </div>

              <label className="flex select-none items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={state.hasSurgeryDate}
                  onChange={(e) => {
                    const v = e.target.checked;
                    ensureHasSurgeryDate(v);
                    if (!v) setSurgeryDate("");
                  }}
                  disabled={!fieldsUnlocked}
                />
                Has date
              </label>
            </div>

            <input
              type="date"
              value={state.surgeryDate}
              onChange={(e) => setSurgeryDate(e.target.value)}
              className={input}
              disabled={!fieldsUnlocked || !state.hasSurgeryDate}
            />

            {fieldsUnlocked && state.hasSurgeryDate && !state.surgeryDate ? (
              <div className="mt-2 text-xs text-amber-700">Select a surgery date (or disable “Has date”).</div>
            ) : null}
          </div>

          {/* Stored status */}
          <div className={panel} key={storeVersion}>
            <div className={label}>Stored status</div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className={label}>Imprint ready</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {fieldsUnlocked && hasCaseId ? imprintText : "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className={label}>Tumor available</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {fieldsUnlocked && hasCaseId ? tumorText : "—"}
                </div>
              </div>
            </div>

            <div className={hint}>Shows saved data for this Subject ID.</div>
          </div>
        </div>

        {/* Action cards (2) */}
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => saveSubject()}
            disabled={!isValid}
            className={[actionCard, isValid ? "cursor-pointer" : "opacity-60 cursor-not-allowed"].join(" ")}
          >
            <div className={actionTitle}>Save subject</div>
            <div className={actionSub}>Saves the record and enables sample onboarding.</div>
            <div className="mt-3">
              <span className={btnPrimary}>Save</span>
            </div>
          </button>

          <button
            type="button"
            onClick={demoFill}
            disabled={!fieldsUnlocked}
            className={[
              actionCard,
              fieldsUnlocked ? "cursor-pointer" : "opacity-60 cursor-not-allowed",
            ].join(" ")}
          >
            <div className={actionTitle}>Use demo subject</div>
            <div className={actionSub}>Autofill a realistic indication and surgery date to continue.</div>
            <div className="mt-3">
              <span className={btnSecondary}>Demo fill</span>
            </div>
          </button>
        </div>
      </Card>
    </div>
  );
}
