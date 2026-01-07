'use client';

import React from 'react';
import type { WorkflowStep, StepStatus } from '@/types/workflow';
import { useWorkflow } from './WorkflowContext';
import { PatientsStore } from '@/store/patientsStore';

/* ------------------------------ SVG helpers ------------------------------ */



function SubstepGlyph({ id }: { id: string }) {
  const sky = '#60A5FA';     // outline
  const skyFill = '#E0F2FE'; // body
  const lohRed = '#F87171';  // bracelets
  const snvDot = '#047857';

  const isLOH = id === 'step2_loh' || id === 'step4_loh';
  const isCNV = id === 'step2_cnv' || id === 'step4_cnv';
  const isSNV = id === 'step2_snv' || id === 'step4_snv';

  if (!isLOH && !isCNV && !isSNV) return null;

  /* ---- 4 legs only, NO center circle ---- */

  // upper legs
  const leftUpper =
    'M 9.2 4.8 C 7.6 6.6 7.8 9.2 9.6 10.6';
  const rightUpper =
    'M 14.8 4.8 C 16.4 6.6 16.2 9.2 14.4 10.6';

  // lower legs
  const leftLower =
    'M 10.6 11.4 C 9.8 13.4 9.2 15.6 9.6 18.6';
  const rightLower =
    'M 13.4 11.4 C 14.2 13.4 14.8 15.6 14.4 18.6';

  // bracelets hugging lower legs
  const braceletLeft = 'M 9.7 17.6 C 10.6 18.3 11.4 18.3 12.1 17.6';
  const braceletRight = 'M 11.9 17.6 C 12.6 18.3 13.4 18.3 14.3 17.6';
  const braceletRight2 = 'M 12.0 18.8 C 12.7 19.5 13.6 19.5 14.4 18.8';

  return (
    <svg
      width="24"
      height="24"
      viewBox="-2 -2 28 28"
      aria-hidden="true"
      className="block"
    >
      {/* --- BODY FILL --- */}
      {[leftUpper, rightUpper, leftLower, rightLower].map((d) => (
        <path
          key={d}
          d={d}
          stroke={skyFill}
          strokeWidth="6.6"
          strokeLinecap="round"
          fill="none"
        />
      ))}

      {/* --- OUTLINE --- */}
      {[leftUpper, rightUpper, leftLower, rightLower].map((d) => (
        <path
          key={`${d}-o`}
          d={d}
          stroke={sky}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
      ))}

      {/* --- LOH bracelets --- */}
      {isLOH && (
        <>
          <path d={braceletLeft} stroke={lohRed} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d={braceletRight} stroke={lohRed} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </>
      )}

      {/* --- CNV bracelets (double on right leg) --- */}
      {isCNV && (
        <>
          <path d={braceletRight} stroke={lohRed} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d={braceletRight2} stroke={lohRed} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </>
      )}

      {/* --- SNV dots --- */}
      {isSNV && (
        <>
          <circle cx="9.6" cy="8.6" r="1.05" fill={snvDot} />
          <circle cx="10.6" cy="14.2" r="1.0" fill={snvDot} />
          <circle cx="14.4" cy="8.6" r="1.05" fill={snvDot} />
          <circle cx="13.4" cy="14.2" r="1.0" fill={snvDot} />
        </>
      )}
    </svg>
  );
}


/* ------------------------------ styles/helpers ------------------------------ */

function markerClass(active: boolean, highlightGreen: boolean) {
  const base =
    'flex h-8 w-8 items-center justify-center rounded-full border text-xs shrink-0 leading-none';

  if (highlightGreen) {
    return `${base} border-emerald-300 bg-emerald-50 text-emerald-900`;
  }

  if (active) return `${base} border-slate-400 bg-slate-50 text-slate-900`;
  return `${base} border-slate-200 bg-white text-slate-500`;
}

function badgeClass(status: StepStatus, active: boolean) {
  const base = 'shrink-0 rounded-full border px-3 py-1 text-xs transition-colors';

  if (status === 'done') return `${base} border-emerald-300 bg-emerald-50 text-emerald-800`;
  if (status === 'processing') return `${base} border-amber-300 bg-amber-50 text-amber-900`;
  if (status === 'error') return `${base} border-red-300 bg-red-50 text-red-800`;

  if (active) return `${base} border-slate-300 bg-white text-slate-700`;
  return `${base} border-slate-200 bg-white text-slate-600`;
}

function computeStatus(
  stepId: string,
  patientId: string | null,
  workflowState: { selectedPatient: { id: string } | null },
): StepStatus | undefined {
  if (stepId === 'step1') {
    return workflowState.selectedPatient ? 'done' : undefined;
  }

  if (!patientId) return undefined;
  const p = PatientsStore.findById(patientId);
  if (!p) return undefined;

  if (stepId === 'step2') {
    if (p.imprintCreated) return 'done';
    if (p.imprintSkipped) return 'done';
    if (p.imprintInputsReady) return 'processing';
    return undefined;
  }

  if (stepId === 'step2_loh') {
    const s = p.imprintModules?.LOH;
    if (s === 'done') return 'done';
    if (s === 'running') return 'processing';
    return undefined;
  }
  if (stepId === 'step2_cnv') {
    const s = p.imprintModules?.CNV;
    if (s === 'done') return 'done';
    if (s === 'running') return 'processing';
    return undefined;
  }
  if (stepId === 'step2_snv') {
    const s = p.imprintModules?.SNV;
    if (s === 'done') return 'done';
    if (s === 'running') return 'processing';
    return undefined;
  }

  if (stepId === 'step3') {
    const n = p.plasmaSamples?.length ?? 0;
    return n >= 3 ? 'done' : undefined;
  }

  if (stepId === 'step4') {
    if (p.analysisCompleted) return 'done';
    const snv = p.analysisChannels?.SNV;
    const cnv = p.analysisChannels?.CNV;
    const loh = p.analysisChannels?.LOH;
    if (snv === 'running' || cnv === 'running' || loh === 'running') return 'processing';
    if (p.analysisRunStarted && !p.analysisCompleted) return 'processing';
    return undefined;
  }

  if (stepId === 'step4_loh') {
    const s = p.analysisChannels?.LOH;
    if (s === 'done') return 'done';
    if (s === 'running') return 'processing';
    return undefined;
  }
  if (stepId === 'step4_snv') {
    const s = p.analysisChannels?.SNV;
    if (s === 'done') return 'done';
    if (s === 'running') return 'processing';
    return undefined;
  }
  if (stepId === 'step4_cnv') {
    const s = p.analysisChannels?.CNV;
    if (s === 'done') return 'done';
    if (s === 'running') return 'processing';
    return undefined;
  }

  if (stepId === 'step5') {
    return p.analysisCompleted ? 'done' : undefined;
  }

  return undefined;
}

function computeBadgeText(stepId: string, patientId: string | null): string | undefined {
  if (!patientId) return undefined;
  const p = PatientsStore.findById(patientId);
  if (!p) return undefined;

  if (stepId === 'step4_loh' || stepId === 'step4_snv' || stepId === 'step4_cnv') {
    
    return p.tumorAvailable === false ? 'ImprintAI+' : 'Tumor';
  }

  return undefined;
}


function isStep5Green(stepId: string, patientId: string | null): boolean {
  if (stepId !== 'step5') return false;
  if (!patientId) return false;
  const p = PatientsStore.findById(patientId);
  return Boolean(p?.analysisCompleted);
}

/* ------------------------------ tree item ------------------------------ */

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

  const dynStatus = computeStatus(step.id, patientId, { selectedPatient: state.selectedPatient });
  const status = dynStatus ?? step.status ?? 'idle';
  const active = activeId === step.id;

  const greenStep5 = isStep5Green(step.id, patientId);

  const dynBadgeText = computeBadgeText(step.id, patientId);
  const badgeText = dynBadgeText ?? step.badgeText;

  const isSub = step.kind === 'substep';
  const markerText = isSub ? '' : String(index ?? '');

  const containerClass = [
    'w-full rounded-2xl border px-4 py-3 text-left transition',
    greenStep5
      ? 'border-emerald-300 bg-emerald-50'
      : active
        ? 'border-slate-300 bg-slate-50'
        : 'border-slate-200 bg-white hover:border-slate-300',
  ].join(' ');

  const titleClass = greenStep5 ? 'text-emerald-900' : 'text-slate-900';
  const subtitleClass = greenStep5 ? 'text-emerald-800/80' : 'text-slate-500';

  return (
    <div className={depth > 0 ? 'ml-10' : ''}>
      <button type="button" onClick={() => onSelect(step.id)} className={containerClass}>
        <div className="flex items-start gap-3">
          <div>
            <div className={markerClass(active, greenStep5)}>
              {isSub ? <SubstepGlyph id={step.id} /> : markerText}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className={`text-sm font-semibold ${titleClass}`}>{step.title}</div>
                {step.subtitle ? <div className={`mt-1 text-xs ${subtitleClass}`}>{step.subtitle}</div> : null}
              </div>

              {badgeText ? <div className={badgeClass(status, active)}>{badgeText}</div> : null}
            </div>
          </div>
        </div>
      </button>

      {step.children?.length ? (
        <div className="relative mt-3">
          <div className="absolute left-4 top-0 h-full w-px bg-slate-200" />
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
        <TreeItem key={step.id} step={step} activeId={activeId} onSelect={onSelect} depth={0} index={i + 1} />
      ))}
    </div>
  );
}
