"use client";

import React from "react";
import type { Patient } from "@/types/workflowState";
import type { StoredPatient } from "@/store/patientsStore";
import { PatientsStore } from "@/store/patientsStore";
import { Card } from "@/components/ui/Card";

const INDICATIONS = [
  "Lung cancer",
  "Breast cancer",
  "CRC (colorectal)",
  "Other",
];

type Props = {
  open: boolean;
  onClose: () => void;
  selectedPatientId: string | null;
  onSelect: (p: Patient) => void;
};

const NEW_ID = "__new__";

function safeStr(v: unknown) {
  return typeof v === "string" ? v : "";
}

function normalizeId(id: string) {
  return id.trim();
}

export function PatientsModal({
  open,
  onClose,
  selectedPatientId,
  onSelect,
}: Props) {
  const [patients, setPatients] = React.useState<StoredPatient[]>([]);
  const [query, setQuery] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);

  // selection
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // edit form (for existing or draft)
  const [formId, setFormId] = React.useState("");
  const [formLabel, setFormLabel] = React.useState("");
  const [formIndication, setFormIndication] = React.useState("");
  const [formHasSurgeryDate, setFormHasSurgeryDate] = React.useState(false);
  const [formSurgeryDate, setFormSurgeryDate] = React.useState("");

  const isDraft = selectedId === NEW_ID;

  // hydrate on open
  React.useEffect(() => {
    if (!open) return;

    const list = PatientsStore.list();
    setPatients(list);

    // pick selected
    const pick = selectedPatientId ?? list[0]?.id ?? null;
    setSelectedId(pick);

    setErr(null);
    setQuery("");

    if (pick) {
      const p = PatientsStore.findById(pick);
      setFormId(p?.id ?? pick);
      setFormLabel(p?.label ?? pick);
      setFormIndication(safeStr(p?.indication));
      setFormHasSurgeryDate(!!p?.hasSurgeryDate);
      setFormSurgeryDate(safeStr(p?.surgeryDate));
    } else {
      // empty state
      setFormId("");
      setFormLabel("");
      setFormIndication("");
      setFormHasSurgeryDate(false);
      setFormSurgeryDate("");
    }
  }, [open, selectedPatientId]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        (p.label ?? "").toLowerCase().includes(q)
    );
  }, [patients, query]);

  // Draft shows in list (top) as you type
  const draftPreview: StoredPatient | null = React.useMemo(() => {
    if (!isDraft) return null;
    const id = normalizeId(formId);
    const label = (formLabel || id || "New patient").trim();

    return {
      id: id || "NEW",
      label,
      indication: formIndication || "",
      hasSurgeryDate: formHasSurgeryDate,
      surgeryDate: formHasSurgeryDate ? formSurgeryDate : "",
    } as StoredPatient;
  }, [
    isDraft,
    formId,
    formLabel,
    formIndication,
    formHasSurgeryDate,
    formSurgeryDate,
  ]);

  function loadPatientToForm(id: string) {
    const p = PatientsStore.findById(id);
    if (!p) return;

    setFormId(p.id);
    setFormLabel(p.label || p.id);
    setFormIndication(safeStr(p.indication));
    setFormHasSurgeryDate(!!p.hasSurgeryDate);
    setFormSurgeryDate(safeStr(p.surgeryDate));
  }

  function handleRowSelect(id: string) {
    setErr(null);
    setSelectedId(id);
    loadPatientToForm(id);
  }

  function handleNewPatient() {
    setErr(null);
    setSelectedId(NEW_ID);

    // empty draft
    setFormId("");
    setFormLabel("");
    setFormIndication("");
    setFormHasSurgeryDate(false);
    setFormSurgeryDate("");
  }

  function handleDelete(id: string) {
    setErr(null);
    const next = PatientsStore.remove(id);
    setPatients(next);

    if (selectedId === id) {
      const nextId = next[0]?.id ?? null;
      setSelectedId(nextId);

      if (nextId) loadPatientToForm(nextId);
      else {
        setFormId("");
        setFormLabel("");
        setFormIndication("");
        setFormHasSurgeryDate(false);
        setFormSurgeryDate("");
      }
    }
  }

  function handleClear() {
    setErr(null);
    PatientsStore.clear();
    setPatients([]);
    setSelectedId(null);

    setFormId("");
    setFormLabel("");
    setFormIndication("");
    setFormHasSurgeryDate(false);
    setFormSurgeryDate("");
  }

  function handleSave() {
    setErr(null);

    const id = normalizeId(formId);
    if (!id) {
      setErr("Patient ID is required.");
      return;
    }

    try {
      // if editing existing — merge it; if draft/new — create new
      const existing = PatientsStore.findById(id);

      const payload: StoredPatient = {
        ...(existing ?? ({} as StoredPatient)),
        id,
        label: (formLabel || id).trim(),
        indication: formIndication || "",
        hasSurgeryDate: formHasSurgeryDate,
        surgeryDate: formHasSurgeryDate ? formSurgeryDate : "",
      };

      const { patients: next, saved } = PatientsStore.upsert(payload);

      setPatients(next);
      setSelectedId(saved.id);

      // normalize form to saved values
      setFormId(saved.id);
      setFormLabel(saved.label || saved.id);
      setFormIndication(safeStr(saved.indication));
      setFormHasSurgeryDate(!!saved.hasSurgeryDate);
      setFormSurgeryDate(safeStr(saved.surgeryDate));
    } catch (e: unknown) {
      if (e instanceof Error) setErr(e.message);
      else setErr("Failed to save");
    }
  }

  function handleChooseForWorkflow() {
    setErr(null);

    // if draft — must be saved first
    if (isDraft) {
      setErr("Save the new patient first (Save).");
      return;
    }

    const id = normalizeId(formId);
    if (!id) {
      setErr("Select a patient first.");
      return;
    }

    onSelect({ id, label: (formLabel || id).trim() || id });
    onClose();
  }

  if (!open) return null;

  const leftList = draftPreview ? [draftPreview, ...filtered] : filtered;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-6xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-900">
              Patients
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Left: list. Right: selected patient details
              (editing).
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm hover:border-slate-300"
          >
            Close
          </button>
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-12 gap-4">
          {/* LEFT 70% */}
          <div className="col-span-12 lg:col-span-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">List</div>

                <button
                  type="button"
                  onClick={handleNewPatient}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm hover:border-slate-300"
                >
                  New patient
                </button>
              </div>

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by id/label…"
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
              />

              <div className="mt-3 max-h-[60vh] space-y-2 overflow-auto pr-1">
                {leftList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    No patients yet.
                  </div>
                ) : (
                  leftList.map((p) => {
                    const rowId = p === draftPreview ? NEW_ID : p.id;
                    const active = selectedId === rowId;

                    return (
                      <div
                        key={rowId}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (rowId === NEW_ID) {
                            setSelectedId(NEW_ID);
                            return;
                          }
                          handleRowSelect(p.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (rowId === NEW_ID) setSelectedId(NEW_ID);
                            else handleRowSelect(p.id);
                          }
                        }}
                        className={[
                          "w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition outline-none",
                          active
                            ? "border-slate-400 bg-slate-50"
                            : "border-slate-200 bg-white hover:border-slate-300",
                          "focus:ring-2 focus:ring-slate-200",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-900">
                              {rowId === NEW_ID
                                ? formLabel || "New patient"
                                : p.label || p.id}
                              {rowId === NEW_ID ? (
                                <span className="ml-2 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                                  draft
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {rowId === NEW_ID
                                ? normalizeId(formId) || "Patient ID not set"
                                : p.id}
                            </div>

                            <div className="mt-2 grid grid-cols-12 gap-2 text-xs text-slate-600">
                              <div className="col-span-7 truncate">
                                <span className="text-slate-500">
                                  Indication:
                                </span>{" "}
                                <span className="font-medium text-slate-800">
                                  {p.indication || "—"}
                                </span>
                              </div>
                              <div className="col-span-5 truncate text-right">
                                <span className="text-slate-500">Surgery:</span>{" "}
                                <span className="font-medium text-slate-800">
                                  {p.hasSurgeryDate && p.surgeryDate ? (
                                    p.surgeryDate
                                  ) : (
                                    <>—</>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {rowId !== NEW_ID ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(p.id);
                              }}
                              className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-red-700 hover:border-red-300"
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  localStorage key:{" "}
                  <span className="font-mono">{PatientsStore.key}</span>
                </div>

                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm hover:border-slate-300"
                >
                  Clear local storage
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT 30% */}
          <div className="col-span-12 lg:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">
                Patient details
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {isDraft
                  ? "Creating a new patient (draft). Save to persist to localStorage."
                  : "Editing the selected patient."}
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs text-slate-500">Patient ID</label>
                  <input
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    placeholder="e.g., CASE-100"
                    disabled={!isDraft} // existing patient's ID is immutable (changing it would create a new record)
                    className={[
                      "mt-1 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-slate-300",
                      isDraft
                        ? "border-slate-200"
                        : "border-slate-200 bg-slate-50 text-slate-600",
                    ].join(" ")}
                  />
                  {!isDraft ? (
                    <div className="mt-1 text-xs text-slate-500">
                      Keep ID fixed to avoid duplicates.
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="text-xs text-slate-500">
                    Label (optional)
                  </label>
                  <input
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    placeholder="e.g., Ivanov I.I."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500">
                    Indication
                  </label>
                  <select
                    value={formIndication}
                    onChange={(e) => setFormIndication(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                  >
                    <option value="">Select…</option>
                    {INDICATIONS.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500">Surgery date</div>
                    <div className="text-sm text-slate-700">
                      {formHasSurgeryDate ? "Enabled" : "Disabled"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormHasSurgeryDate((v) => !v)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm hover:border-slate-300"
                  >
                    Toggle
                  </button>
                </div>

                {formHasSurgeryDate ? (
                  <div>
                    <label className="text-xs text-slate-500">
                      Surgery date
                    </label>
                    <input
                      type="date"
                      value={formSurgeryDate}
                      onChange={(e) => setFormSurgeryDate(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                    />
                    <div className="mt-1 text-xs text-slate-500">
                      Used to label “pre-op / post-op day N” in
                      Step 3.
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm hover:border-slate-300"
                >
                  Save
                </button>

                <button
                  type="button"
                  onClick={handleChooseForWorkflow}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm hover:border-slate-300"
                >
                  Choose for workflow
                </button>

                <div className="text-xs text-slate-500">
                  “Choose for workflow” closes the modal and applies the selected
                  patient in Step 1.
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
