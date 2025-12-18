'use client';

import { useMemo } from 'react';
import type { WorkflowConfig, WorkflowStep } from '@/types/workflow';
import { Card } from '@/components/ui/Card';
import { WorkflowTree } from './WorkflowTree';
import { WorkflowProvider, useWorkflow } from './WorkflowContext';

function flattenSteps(steps: WorkflowStep[]): WorkflowStep[] {
  const out: WorkflowStep[] = [];
  for (const s of steps) {
    out.push(s);
    if (s.children?.length) out.push(...flattenSteps(s.children));
  }
  return out;
}

function ShellInner({ config }: { config: WorkflowConfig }) {
  const { activeStepId, setActiveStepId } = useWorkflow();

  const flat = useMemo(() => flattenSteps(config.steps), [config.steps]);
  const activeStep = flat.find(s => s.id === activeStepId) ?? flat[0];

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left */}
      <div className="col-span-12 md:col-span-5">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Workflow tree</div>
              <div className="mt-1 text-xs text-slate-500">Клик по узлу → детали справа</div>
            </div>
          </div>

          <div className="mt-4">
            <WorkflowTree steps={config.steps} activeId={activeStepId} onSelect={setActiveStepId} />
          </div>
        </Card>
      </div>

      {/* Right */}
      <div className="col-span-12 md:col-span-7">
        <Card className="p-6">
          <div className="text-sm text-slate-500">Selected step</div>
          <div className="mt-1 text-xl font-semibold text-slate-900">{activeStep.title}</div>
          {activeStep.subtitle ? <div className="mt-2 text-sm text-slate-600">{activeStep.subtitle}</div> : null}

          <div className="mt-6">{activeStep.render()}</div>
        </Card>
      </div>
    </div>
  );
}

export function WorkflowShell({ config }: { config: WorkflowConfig }) {
  return (
    <WorkflowProvider initialActiveStepId={config.defaultStepId}>
      <ShellInner config={config} />
    </WorkflowProvider>
  );
}
