"use client";

import React from "react";
import type { ModuleKey } from "@/types/modules";
import { WorkflowOverviewDiagram } from "@/components/workflow/WorkflowOverviewDiagram";
import { mrdOverview } from "@/workflows/mrd/overview";

export function WorkflowOverviewContainer({ active }: { active: ModuleKey }) {
  const overviewByModule: Partial<Record<ModuleKey, React.ReactNode>> = {
    MRD: <WorkflowOverviewDiagram {...mrdOverview} />,
  };

  const node = overviewByModule[active];

  if (node) return <div className="mt-6">{node}</div>;

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="text-sm font-semibold text-slate-900">Workflow overview</div>
      <div className="mt-1 text-xs text-slate-500">
        Overview diagram for this workflow will appear here once the module is unlocked.
      </div>
    </div>
  );
}
