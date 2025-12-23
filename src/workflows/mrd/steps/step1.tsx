"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { useWorkflow } from "@/components/workflow/WorkflowContext";
import { PatientsModal } from "@/components/patients/PatientsModal";
import { PatientsStore, type StoredPatient } from "@/store/patientsStore";

export function Step1() {
  const {
    state,
    setSelectedPatient,
    setCaseId,
    setIndication,
    toggleSurgeryDate,
    setSurgeryDate,
  } = useWorkflow();

  const [patientsOpen, setPatientsOpen] = React.useState(false);
  const [storeVersion, setStoreVersion] = React.useState(0);

  const patientId = state.selectedPatient?.id ?? null;

  function findStoredById(id: string): StoredPatient | undefined {
    const key = id.trim().toLowerCase();
    return PatientsStore.list().find((x) => x.id.trim().toLowerCase() === key);
  }

  // Set surgery-date flag deterministically (no toggle-flip)
  function ensureHasSurgeryDate(desired: boolean) {
    toggleSurgeryDate(desired);
  }

  function onSelectPatient(p: { id: string; label: string }) {
    setSelectedPatient(p);

    // By default, caseId = selected CASE ID (can be editable later if needed)
    if (!state.caseId) setCaseId(p.id);

    // Load Step 1 metadata from storage into workflow state (needed for Step 3)
    const stored = findStoredById(p.id);

    if (stored?.indication !== undefined) {
      setIndication(stored.indication || "");
    }

    if (stored?.hasSurgeryDate !== undefined) {
      ensureHasSurgeryDate(!!stored.hasSurgeryDate);
    }

    if (stored?.surgeryDate) {
      // If surgery date exists, the flag must be true
      ensureHasSurgeryDate(true);
      setSurgeryDate(stored.surgeryDate);
    } else {
      // If there is no date, keep workflow surgeryDate in sync
      setSurgeryDate("");
    }

    // refresh summary
    setStoreVersion((v) => v + 1);
  }

  // Persist Step 1 fields into the patient record when workflow state changes (compatible with edits in the modal)
  React.useEffect(() => {
    if (!state.selectedPatient) return;

    PatientsStore.upsert({
      id: state.selectedPatient.id,
      label: state.selectedPatient.label,
      indication: state.indication || "",
      hasSurgeryDate: state.hasSurgeryDate,
      surgeryDate: state.hasSurgeryDate ? state.surgeryDate : "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.selectedPatient?.id,
    state.indication,
    state.hasSurgeryDate,
    state.surgeryDate,
  ]);

  const stored = patientId ? findStoredById(patientId) : undefined;

  const indicationText = stored?.indication ? stored.indication : "—";
  const surgeryText =
    stored?.hasSurgeryDate && stored?.surgeryDate ? stored.surgeryDate : "—";

  const imprintText = stored?.imprintCreated ? "yes" : "no";
  const tumorText =
    stored?.tumorAvailable === true
      ? "yes"
      : stored?.tumorAvailable === false
      ? "no"
      : "unknown";

  return (
    <div className="space-y-5">
      <div className="text-sm text-slate-600">
        Create a case or select a patient. Indication and surgery date are stored locally per patient and auto-loaded on selection.
      </div>

      <PatientsModal
        open={patientsOpen}
        onClose={() => {
          setPatientsOpen(false);
          // After closing the modal, re-render summary (in case details were edited there)
          setStoreVersion((v) => v + 1);
        }}
        selectedPatientId={state.selectedPatient?.id ?? null}
        onSelect={onSelectPatient}
      />

      <Card className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">
            Case / Patient
          </div>

          <button
            type="button"
            onClick={() => setPatientsOpen(true)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm hover:border-slate-300"
          >
            Patients
          </button>
        </div>

        {/* two equal columns */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs text-slate-500">Patient</div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900">
              {state.selectedPatient?.label || "Not selected"}
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs text-slate-500">CASE ID</div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900">
              {state.selectedPatient?.id || "—"}
            </div>
          </div>
        </div>

        {/* summary */}
        <div
          className="mt-5 rounded-2xl border border-slate-200 bg-white p-5"
          key={storeVersion}
        >
          <div className="text-sm font-semibold text-slate-900">
            Selected patient summary
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <div className="text-xs text-slate-500">
                Indication
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {indicationText}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Surgery date</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {surgeryText}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Used to label plasma timepoints (Step 3).
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Stored flags</div>
              <div className="mt-1 text-sm text-slate-800">
                imprint:{" "}
                <span className="font-medium text-slate-900">
                  {imprintText}
                </span>{" "}
                • tumorAvailable:{" "}
                <span className="font-medium text-slate-900">{tumorText}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
