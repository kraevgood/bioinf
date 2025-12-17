'use client';

import { useMemo, useState } from 'react';
import type { WorkflowConfig, WorkflowStep } from '@/types/workflow';
import { Card } from '@/components/ui/Card';
import { WorkflowTree } from './WorkflowTree';

function flattenSteps(steps: WorkflowStep[]): WorkflowStep[] {
  const out: WorkflowStep[] = [];
  for (const s of steps) {
    out.push(s);
    if (s.children?.length) out.push(...flattenSteps(s.children));
  }
  return out;
}

export function WorkflowShell({ config }: { config: WorkflowConfig }) {
  const [activeId, setActiveId] = useState(config.defaultStepId);

  const stepById = useMemo(() => {
    const flat = flattenSteps(config.steps);
    return new Map(flat.map(s => [s.id, s]));
  }, [config.steps]);

  const activeStep = stepById.get(activeId) ?? config.steps[0];

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left: tree */}
      <div className="col-span-12 md:col-span-5">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Workflow tree</div>
              <div className="mt-1 text-xs text-slate-500">Клик по узлу → детали справа</div>
            </div>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
              Mode: tumor-informed
            </span>
          </div>

          <div className="mt-4">
            <WorkflowTree steps={config.steps} activeId={activeId} onSelect={setActiveId} />
          </div>
        </Card>
      </div>

      {/* Right: details */}
      <div className="col-span-12 md:col-span-7">
        <Card className="p-6">
          <div className="text-sm text-slate-500">Selected step</div>
          <div className="mt-1 text-xl font-semibold text-slate-900">{activeStep.title}</div>
          {activeStep.subtitle ? (
            <div className="mt-2 text-sm text-slate-600">{activeStep.subtitle}</div>
          ) : null}

          <div className="mt-6">{activeStep.render()}</div>
        </Card>
      </div>
    </div>
  );
}
