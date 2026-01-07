"use client";

import { useState } from "react";
import { MODULES } from "@/data/modules";
import type { ModuleKey } from "@/types/modules";
import { ModuleCardsRow } from "@/components/modules/ModuleCardsRow";
import { WorkspacePlaceholder } from "@/components/modules/WorkspacePlaceholder";
import { Pill } from "@/components/ui/Pill";
import { WorkflowShell } from "@/components/workflow/WorkflowShell";
import { mrdWorkflowConfig } from "@/workflows/mrd/config";
import { WorkflowOverviewContainer } from "@/components/workflow/WorkflowOverviewContainer";
import Logo from "@/components/icons/Logo";

export default function AnalysisPage() {
  const [active, setActive] = useState<ModuleKey>("MRD");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {/* ✅ Logo вместо пустого квадрата */}
            <div className="shrink-0 h-10 w-10 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center">
              <Logo size={40} />
            </div>

            <div>
              <div className="text-xl font-semibold">Imprinta — MRD Module</div>
              <div className="text-sm text-slate-500">
                ImprintAI™ engine • SNV / CNV / BAF / Fragmentomics signal
                enhancement + longitudinal MRD scoring
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Pill variant="neutral">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-slate-900">Tumor-informed</span>
            </Pill>

            <Pill variant="neutral">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span className="text-slate-900">Non-tumor-informed</span>
            </Pill>

            <Pill variant="neutral">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-slate-900">Configurable <br />Step 4</span>
            </Pill>
          </div>
        </header>

        {/* Top 3 blocks */}
        <ModuleCardsRow
          modules={MODULES}
          active={active}
          onSelect={setActive}
        />

        {/* Overview container (changes with workflow selection) */}
        <WorkflowOverviewContainer active={active} />

        {/* Content below */}
        {active === "MRD" ? (
          <WorkflowShell config={mrdWorkflowConfig} />
        ) : (
          <WorkspacePlaceholder
            title="Workflow"
            text="Empty for now. Work in progress."
          />
        )}
      </div>
    </div>
  );
}
