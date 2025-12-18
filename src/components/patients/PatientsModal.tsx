"use client";

import React from "react";
import type { Patient } from "@/types/workflowState";
import type { StoredPatient } from "@/store/patientsStore";
import { PatientsStore } from "@/store/patientsStore";
import { Card } from "@/components/ui/Card";

type Props = {
  open: boolean;
  onClose: () => void;

  selectedPatientId: string | null;

  onSelect: (p: Patient) => void;
};

export function PatientsModal({
  open,
  onClose,
  selectedPatientId,
  onSelect,
}: Props) {
  const [patients, setPatients] = React.useState<StoredPatient[]>([]);
  const [query, setQuery] = React.useState("");
  const [newId, setNewId] = React.useState("");
  const [newLabel, setNewLabel] = React.useState("");

  const [exportText, setExportText] = React.useState("");
  const [importText, setImportText] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setPatients(PatientsStore.list());
    setQuery("");
    setNewId("");
    setNewLabel("");
    setErr(null);
    setExportText("");
    setImportText("");
  }, [open]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const filtered = patients.filter((p) => {
    if (!q) return true;
    return (
      p.id.toLowerCase().includes(q) ||
      (p.label ?? "").toLowerCase().includes(q)
    );
  });

  function handleSave() {
    setErr(null);
    const id = newId.trim();
    if (!id) return;

    try {
      const { patients: next, saved } = PatientsStore.upsert({
        id,
        label: (newLabel || id).trim(),
      });
      setPatients(next);
      onSelect({ id: saved.id, label: saved.label });
      onClose();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr("Failed to save");
      }
    }
  }

  function handleDelete(id: string) {
    setErr(null);
    const next = PatientsStore.remove(id);
    setPatients(next);
  }

  function handleClear() {
    setErr(null);
    PatientsStore.clear();
    setPatients([]);
  }

  function handleExport() {
    setErr(null);
    setExportText(PatientsStore.exportJson());
  }

  function handleImport() {
    setErr(null);
    try {
      const next = PatientsStore.importJson(importText);
      setPatients(next);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr("Import failed");
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[min(980px,94vw)] -translate-x-1/2 -translate-y-1/2">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Patients
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Локальное хранилище пациентов (можно очистить, экспортировать,
                импортировать).
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
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-12 gap-4">
            {/* left: list */}
            <div className="col-span-12 lg:col-span-7">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-slate-700">
                  Existing
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm text-red-600 hover:border-red-300"
                    title="Удалить всех пациентов из localStorage"
                  >
                    Clear storage
                  </button>
                  <div className="text-xs text-slate-500">
                    Total: {patients.length}
                  </div>
                </div>
              </div>

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by id/label…"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
              />

              <div className="mt-3 max-h-[46vh] space-y-2 overflow-auto pr-1">
                {filtered.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Nothing found.
                  </div>
                ) : (
                  filtered.map((p) => {
                    const active =
                      selectedPatientId && p.id === selectedPatientId;
                    return (
                      <div
                        key={p.id}
                        className={[
                          "flex items-center justify-between gap-3 rounded-xl border px-4 py-3",
                          active
                            ? "border-slate-400 bg-slate-50"
                            : "border-slate-200 bg-white",
                        ].join(" ")}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900">
                            {p.label || p.id}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {p.id}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onSelect({ id: p.id, label: p.label || p.id });
                              onClose();
                            }}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm hover:border-slate-300"
                          >
                            Select
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm text-red-600 hover:border-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* right: create + export/import */}
            <div className="col-span-12 lg:col-span-5 space-y-4">
              <div>
                <div className="text-xs font-semibold text-slate-700">
                  Create / Update
                </div>

                <div className="mt-2 space-y-3">
                  <div>
                    <label className="text-xs text-slate-500">
                      Patient ID *
                    </label>
                    <input
                      value={newId}
                      onChange={(e) => setNewId(e.target.value)}
                      placeholder="e.g., CASE-102"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500">Label</label>
                    <input
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="e.g., Ivanov I.I."
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!newId.trim()}
                    className={[
                      "w-full rounded-xl px-4 py-3 text-sm",
                      newId.trim()
                        ? "border border-slate-200 bg-white hover:border-slate-300"
                        : "cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400",
                    ].join(" ")}
                  >
                    Save patient
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-700">
                  Export / Import
                </div>

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm hover:border-slate-300"
                  >
                    Export JSON
                  </button>

                  <button
                    type="button"
                    onClick={handleImport}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm hover:border-slate-300"
                  >
                    Import JSON
                  </button>
                </div>

                {exportText ? (
                  <textarea
                    readOnly
                    value={exportText}
                    className="mt-3 h-40 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-mono outline-none"
                  />
                ) : null}

                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste JSON array here to import…"
                  className="mt-3 h-40 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-mono outline-none"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
