'use client';

import type { WorkflowStep } from '@/types/workflow';

function StepMarker({
  kind,
  index,
  active,
}: {
  kind: 'step' | 'substep';
  index?: number;
  active: boolean;
}) {
  if (kind === 'substep') {
    return (
      <div
        className={[
          'h-7 w-7 rounded-xl border flex items-center justify-center text-xs',
          active
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 bg-slate-50 text-slate-500',
        ].join(' ')}
      >
        <span className="h-2 w-2 rounded-full bg-current" />
      </div>
    );
  }

  return (
    <div
      className={[
        'h-9 w-9 rounded-2xl border flex items-center justify-center font-semibold',
        active
          ? 'border-blue-300 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-slate-50 text-slate-700',
      ].join(' ')}
    >
      {index}
    </div>
  );
}

function TreeRow({
  step,
  activeId,
  onSelect,
  kind,
  index,
}: {
  step: WorkflowStep;
  activeId: string;
  onSelect: (id: string) => void;
  kind: 'step' | 'substep';
  index?: number;
}) {
  const isActive = step.id === activeId;

  return (
    <button
      type="button"
      onClick={() => onSelect(step.id)}
      className={[
        'w-full text-left rounded-2xl border px-4 py-3 transition',
        'bg-white',
        isActive ? 'border-slate-300 shadow-sm' : 'border-slate-200 hover:border-slate-300',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <StepMarker kind={kind} index={index} active={isActive} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">
                {step.title}
              </div>

              {step.subtitle ? (
                <div className="mt-1 text-xs text-slate-500 line-clamp-2">
                  {step.subtitle}
                </div>
              ) : null}
            </div>

            {step.badgeText ? (
              <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                {step.badgeText}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
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
      {steps.map((step, i) => {
        const kind: 'step' | 'substep' = (step.kind ?? 'step') as 'step' | 'substep';

        return (
          <div key={step.id} className="space-y-2">
            <TreeRow
              step={step}
              activeId={activeId}
              onSelect={onSelect}
              kind={kind}
              index={i + 1}
            />

            {step.children?.length ? (
              <div className="relative ml-8 pl-6 space-y-2">
                {/* ВЕРТИКАЛЬНАЯ ЛИНИЯ ГРУППЫ */}
                <div className="absolute left-0 top-0 bottom-0 w-px border-l border-dashed border-slate-300" />


                {step.children.map(child => (
                  <TreeRow
                    key={child.id}
                    step={child}
                    activeId={activeId}
                    onSelect={onSelect}
                    kind={('substep') as const}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
