"use client";

import React from "react";
import {
  ChromosomeLOHIcon,
  ChromosomeCNVIcon,
  ChromosomeSNVIcon,
  ChromosomeImprintIcon,
} from "@/components/icons/ImprintIcons";

type Status = "idle" | "running" | "done";
export type Modules = { LOH: Status; CNV: Status; SNV: Status };

function ModuleCard(props: {
  title: string;
  desc: string;
  status: Status;
  icon: React.ReactNode;
  onOpen: () => void;
}) {
  const { title, desc, status, icon, onOpen } = props;

  const statusText = status === "done" ? "Done ✓" : status === "running" ? "Running…" : "Idle";
  const statusClass =
    status === "done"
      ? "text-emerald-700"
      : status === "running"
        ? "text-amber-700"
        : "text-slate-500";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
    >
      {/*   вертикальное центрирование */}
      <div className="flex items-center gap-4">
        <div className="shrink-0 flex items-center justify-center">
          {icon}
        </div>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-xs text-slate-600">{desc}</div>
          <div className={`mt-2 text-xs font-semibold ${statusClass}`}>{statusText}</div>
        </div>
      </div>
    </button>
  );
}

export function ImprintModal(props: {
  open: boolean;
  onClose: () => void;
  patientName: string;
  imprintCreatedAt?: string;
  modules: Modules;
  onOpenModule: (k: keyof Modules) => void;
}) {
  const { open, onClose, patientName, imprintCreatedAt, modules, onOpenModule } = props;

  React.useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const createdAtText = imprintCreatedAt ? new Date(imprintCreatedAt).toLocaleString() : null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
      />

      <div className="absolute left-1/2 top-1/2 w-[min(980px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.25)]">
          {/* HEADER */}
          <div className="border-b border-slate-200 p-6">
            {/*  3 колонки: текст | большой imprint (красная зона) | controls */}
            <div className="grid grid-cols-[1fr_auto_auto] items-start gap-6">
              {/* LEFT TEXT */}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">Imprint details</div>

                <div className="mt-1 text-xs text-slate-600">
                  Patient: <span className="font-semibold text-slate-900">{patientName}</span>
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Status: <span className="font-semibold text-emerald-700">Created ✓</span>
                  {createdAtText ? <span className="ml-2">• {createdAtText}</span> : null}
                </div>

                <div className="mt-2 text-xs text-slate-600 max-w-155">
                  This imprint is composed of LOH, CNV and SNV components and will be reused for all plasma timepoints.
                </div>
              </div>

              {/* BIG COMBINED IMPRINT — как в красной зоне */}
              <div className="flex items-start justify-center">
                <div className="h-22 w-22 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                  <ChromosomeImprintIcon size={72} />
                </div>
              </div>

              {/* RIGHT CONTROLS */}
              <div className="flex items-start justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div className="grid gap-3 p-6 md:grid-cols-3">
            <ModuleCard
              title="LOH discovery"
              desc="Allelic imbalance tags (BAF windows)."
              status={modules.LOH}
              icon={<ChromosomeLOHIcon size={56} />}   //   крупнее
              onOpen={() => onOpenModule("LOH")}
            />
            <ModuleCard
              title="CNV segments"
              desc="Tumor CNV segments used as tags in plasma."
              status={modules.CNV}
              icon={<ChromosomeCNVIcon size={56} />}   //   крупнее
              onOpen={() => onOpenModule("CNV")}
            />
            <ModuleCard
              title="SNV compendium"
              desc="Tumor-confirmed SNVs for ultra-sensitive detection."
              status={modules.SNV}
              icon={<ChromosomeSNVIcon size={56} />}   //   крупнее
              onOpen={() => onOpenModule("SNV")}
            />
          </div>

          {/* FOOTER */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-6">
            <div className="text-xs text-slate-500">Tip: click a module to drill down (demo).</div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
