"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { useWorkflow } from "@/components/workflow/WorkflowContext";
import { PatientsStore } from "@/store/patientsStore";
import type {
  StoredPatient,
  AnalysisChannelKey,
  AnalysisChannelState,
} from "@/store/patientsStore";

const PROCESS_TIME_MS = 2500;

function getEnrichmentModelLabel(indication: string | undefined): string {
  const raw = (indication ?? "").trim();
  return raw ? `${raw} enrichment model` : "Cancer-type enrichment model";
}

function ProgressBar({ running }: { running: boolean }) {
  if (!running) return null;
  return (
    <div className="mt-4">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-2 w-1/3 animate-pulse rounded-full bg-slate-300" />
      </div>
      <div className="mt-2 text-xs text-slate-500">
        AI-denoise → calling → scoring…
      </div>
    </div>
  );
}

export function Step4Snv() {
  const { state, activeStepId, setActiveStepId } = useWorkflow();

  const patientId = state.selectedPatient?.id ?? "";
  const patientLabel = (state.selectedPatient?.label || patientId).trim();
  const isHere = activeStepId === "step4_snv";

  const upsertPatient = React.useCallback(
    (patch: Partial<StoredPatient>) => {
      if (!patientId) return;

      const current = PatientsStore.findById(patientId);
      const base: StoredPatient = current
        ? current
        : { id: patientId, label: patientLabel || patientId };

      PatientsStore.upsert({
        ...base,
        ...patch,
        id: patientId,
        label: patientLabel || patientId,
      });
    },
    [patientId, patientLabel]
  );

  React.useEffect(() => {
    if (!patientId || !isHere) return;

    const p = PatientsStore.findById(patientId);
    if (!p?.analysisRunStarted) return;

    const st = p.analysisChannels?.SNV ?? "idle";
    if (st === "done") return;

    const startChannels = {
      ...(p.analysisChannels ?? {}),
      SNV: "running",
    } satisfies Partial<Record<AnalysisChannelKey, AnalysisChannelState>>;

    upsertPatient({ analysisChannels: startChannels });

    const timer = window.setTimeout(() => {
      const p2 = PatientsStore.findById(patientId);
      const imprintCreated = !!p2?.imprintCreated;
      const imprintSkipped = !!p2?.imprintSkipped;

      const nextChannels = {
        ...(p2?.analysisChannels ?? {}),
        SNV: "done",
      } satisfies Partial<Record<AnalysisChannelKey, AnalysisChannelState>>;

      const lohDone = (nextChannels.LOH ?? "idle") === "done";
      const cnvDone = (nextChannels.CNV ?? "idle") === "done";
      const snvDone = (nextChannels.SNV ?? "idle") === "done";

      // Completion rules:
      // - tumor-informed (imprintCreated): LOH + CNV + SNV
      // - ImprintAI+ (imprintSkipped): SNV + CNV
      const analysisCompleted = imprintCreated
        ? lohDone && cnvDone && snvDone
        : imprintSkipped
        ? cnvDone && snvDone
        : false;

      upsertPatient({
        analysisChannels: nextChannels,
        analysisCompleted,
      });

      // Next step:
      // - tumor-informed: SNV is last → Results
      // - no tumor: SNV → CNV
      setActiveStepId(imprintCreated ? "step5" : "step4_cnv");
    }, PROCESS_TIME_MS);

    return () => window.clearTimeout(timer);
  }, [patientId, isHere, setActiveStepId, upsertPatient]);

  if (!patientId) {
    return (
      <div className="space-y-2">
        <div className="text-lg font-semibold">SNV channel</div>
        <div className="text-sm text-slate-600">
          Select a patient in Step 1 first.
        </div>
      </div>
    );
  }

  const p = PatientsStore.findById(patientId);
  const st = p?.analysisChannels?.SNV ?? "idle";

  const imprintCreated = !!p?.imprintCreated;
  const imprintSkipped = !!p?.imprintSkipped;
  const indication = p?.indication || state.indication;

  const mode = imprintCreated
    ? "tumor-informed"
    : imprintSkipped
    ? "ImprintAI+ (denoise-only)"
    : "—";

  const title = imprintCreated
    ? "AI-denoise + signal enrichment + SNV calling"
    : "ImprintAI+ denoise-only + SNV calling";

  const subtitle = imprintCreated
    ? `Signal enrichment model: ${getEnrichmentModelLabel(indication)}`
    : "No signal enrichment (not cancer-type dependent)";

  

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600">
        Patient:{" "}
        <span className="font-medium text-slate-900">{patientLabel}</span> •
        Mode: <span className="font-medium text-slate-900">{mode}</span>
      </div>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
          </div>
          <div className="text-xs text-slate-600">
            {st === "done" ? (
              <span className="font-semibold text-emerald-700">✓ Done</span>
            ) : st === "running" ? (
              "Running…"
            ) : (
              "Idle"
            )}
          </div>
        </div>

        <ProgressBar running={st === "running"} />
        {st === "done" ? (
          <div className="mt-4 text-xs text-emerald-700">
            ✓ SNV channel completed
          </div>
        ) : null}
      </Card>

      
    </div>
  );
}
