'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { WorkflowConfig, WorkflowStep } from '@/types/workflow';
import { Card } from '@/components/ui/Card';
import { WorkflowTree } from './WorkflowTree';
import { WorkflowProvider, useWorkflow } from './WorkflowContext';
import { PatientsStore, getPatientsStoreVersion, subscribePatientsStore } from '@/store/patientsStore';

function flattenSteps(steps: WorkflowStep[]): WorkflowStep[] {
  const out: WorkflowStep[] = [];
  for (const s of steps) {
    out.push(s);
    if (s.children?.length) out.push(...flattenSteps(s.children));
  }
  return out;
}

function filterStepsForPatient(steps: WorkflowStep[], patientId: string | null): WorkflowStep[] {
  // Step4 LOH channel exists ONLY when Tumor is available (Step2 checkbox).
  if (!patientId) return steps;

  const p = PatientsStore.findById(patientId);

  // Source of truth: Step2 checkbox -> tumorAvailable
  // Default: tumor is available unless explicitly set to false.
  const tumorAvailable = p?.tumorAvailable !== false;

  const mapStep = (s: WorkflowStep): WorkflowStep | null => {
    // Hide LOH only when tumor is unavailable
    if (s.id === 'step4_loh' && !tumorAvailable) return null;

    if (!s.children?.length) return s;
    const children = s.children
      .map(mapStep)
      .filter((x): x is WorkflowStep => x !== null);

    // Correct order:
    // Tumor: LOH → CNV → SNV
    // No tumor: SNV → CNV
    if (s.id === 'step4') {
      if (tumorAvailable) {
        const loh = children.find((c) => c.id === 'step4_loh');
        const cnv = children.find((c) => c.id === 'step4_cnv');
        const snv = children.find((c) => c.id === 'step4_snv');
        const rest = children.filter((c) => !['step4_loh', 'step4_cnv', 'step4_snv'].includes(c.id));
        const ordered = [loh, cnv, snv].filter((x): x is WorkflowStep => !!x);
        return { ...s, children: [...ordered, ...rest] };
      }

      const snv = children.find((c) => c.id === 'step4_snv');
      const cnv = children.find((c) => c.id === 'step4_cnv');
      const rest = children.filter((c) => !['step4_snv', 'step4_cnv'].includes(c.id));
      const ordered = [snv, cnv].filter((x): x is WorkflowStep => !!x);
      return { ...s, children: [...ordered, ...rest] };
    }

    return { ...s, children };
  };

  return steps.map(mapStep).filter((x): x is WorkflowStep => x !== null);
}

function ShellInner({ config }: { config: WorkflowConfig }) {
  const { activeStepId, setActiveStepId, state } = useWorkflow();

  //  This makes React re-render whenever PatientsStore changes (tumorAvailable toggle, etc.)
  useSyncExternalStore(
    subscribePatientsStore,
    getPatientsStoreVersion,
    () => 0
  );

  const patientId = state.selectedPatient?.id ?? null;

  const visibleSteps = filterStepsForPatient(config.steps, patientId);


  const flat = useMemo(() => flattenSteps(visibleSteps), [visibleSteps]);
  const activeStep = flat.find((s) => s.id === activeStepId) ?? flat[0];

  // If current active step is hidden due to mode switch, fall back to Step4 root.
  useEffect(() => {
    const exists = flat.some((s) => s.id === activeStepId);
    if (exists) return;
    if (activeStepId === 'step4_loh') setActiveStepId('step4');
    else setActiveStepId(flat[0]?.id ?? config.defaultStepId);
  }, [activeStepId, config.defaultStepId, flat, setActiveStepId]);

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left */}
      <div className="col-span-12 md:col-span-5">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Workflow tree</div>
              <div className="mt-1 text-xs text-slate-500">Click a node → details on the right</div>
            </div>
          </div>

          <div className="mt-4">
            <WorkflowTree steps={visibleSteps} activeId={activeStepId} onSelect={setActiveStepId} />
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
