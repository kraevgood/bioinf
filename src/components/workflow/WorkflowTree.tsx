"use client";

import React from "react";
import type { WorkflowStep, StepStatus } from "@/types/workflow";
import { useWorkflow } from "./WorkflowContext";
import { PatientsStore } from "@/store/patientsStore";

function markerClass(status: StepStatus, active: boolean) {
  const base =
    "flex h-7 w-7 items-center justify-center rounded-full border text-xs";
  if (active) return `${base} border-slate-400 bg-slate-50 text-slate-900`;
  if (status === "done")
    return `${base} border-emerald-300 bg-emerald-50 text-emerald-800`;
  if (status === "processing")
    return `${base} border-amber-300 bg-amber-50 text-amber-900`;
  if (status === "error")
    return `${base} border-red-300 bg-red-50 text-red-800`;
  return `${base} border-slate-200 bg-white text-slate-500`;
}

function computeStatus(
  stepId: string,
  patientId: string | null,
  workflowState: { selectedPatient: { id: string } | null }
): StepStatus | undefined {
  // ✅ Step1 считается пройденным, когда выбран пациент
  if (stepId === "step1") {
    return workflowState.selectedPatient ? "done" : undefined;
  }

  if (!patientId) return undefined;
  const p = PatientsStore.findById(patientId);
  if (!p) return undefined;

  // Step2 main
  if (stepId === "step2") {
    if (p.imprintCreated) return "done";
    if (p.imprintSkipped) return "done";
    if (p.imprintInputsReady) return "processing"; // загрузили и начали прогон
    return undefined;
  }

  // Step2 substeps
  if (stepId === "step2_loh") {
    const s = p.imprintModules?.LOH;
    if (s === "done") return "done";
    if (s === "running") return "processing";
    return undefined;
  }
  if (stepId === "step2_cnv") {
    const s = p.imprintModules?.CNV;
    if (s === "done") return "done";
    if (s === "running") return "processing";
    return undefined;
  }
  if (stepId === "step2_snv") {
    const s = p.imprintModules?.SNV;
    if (s === "done") return "done";
    if (s === "running") return "processing";
    return undefined;
  }

  return undefined;
}

function TreeItem({
  step,
  activeId,
  onSelect,
  depth,
  index,
}: {
  step: WorkflowStep;
  activeId: string;
  onSelect: (id: string) => void;
  depth: number;
  index?: number;
}) {
  const { state } = useWorkflow();
  const patientId = state.selectedPatient?.id ?? null;

  const dynStatus = computeStatus(step.id, patientId, {
    selectedPatient: state.selectedPatient,
  });
  const status = dynStatus ?? step.status ?? "idle";
  const active = activeId === step.id;

  const isSub = step.kind === "substep";
  const markerText = isSub ? "" : String(index ?? "");

  return (
    <div className={depth > 0 ? "ml-10" : ""}>
      <button
        type="button"
        onClick={() => onSelect(step.id)}
        className={[
          "w-full rounded-2xl border px-4 py-3 text-left transition",
          active
            ? "border-slate-300 bg-slate-50"
            : "border-slate-200 bg-white hover:border-slate-300",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <div className="pt-0.5">
            <div className={markerClass(status, active)}>
              {status === "done" ? "✓" : markerText}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {step.title}
                </div>
                {step.subtitle ? (
                  <div className="mt-1 text-xs text-slate-500">
                    {step.subtitle}
                  </div>
                ) : null}
              </div>

              {step.badgeText ? (
                <div className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                  {step.badgeText}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </button>

      {step.children?.length ? (
        <div className="relative mt-3">
          {/* вертикальная линия слева для подшагов */}
          <div className="absolute left-3.5 top-0 h-full w-px bg-slate-200" />

          <div className="space-y-3">
            {step.children.map((child) => (
              <TreeItem
                key={child.id}
                step={child}
                activeId={activeId}
                onSelect={onSelect}
                depth={depth + 1}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function WorkflowTree({
  steps,
  activeId,
  onSelect,
}: {
  steps: WorkflowStep[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <TreeItem
          key={step.id}
          step={step}
          activeId={activeId}
          onSelect={onSelect}
          depth={0}
          index={i + 1}
        />
      ))}
    </div>
  );
}
