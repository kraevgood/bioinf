'use client';

import type { WorkflowStep } from '@/types/workflow';

function TreeItem({
  step,
  activeId,
  onSelect,
  level = 0,
}: {
  step: WorkflowStep;
  activeId: string;
  onSelect: (id: string) => void;
  level?: number;
}) {
  const isActive = step.id === activeId;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => onSelect(step.id)}
        className={[
          'w-full text-left rounded-xl border px-4 py-3 transition',
          'bg-white',
          isActive ? 'border-slate-300 shadow-sm' : 'border-slate-200 hover:border-slate-300',
        ].join(' ')}
        style={{ marginLeft: level * 14 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">{step.title}</div>
            {step.subtitle ? (
              <div className="mt-1 text-xs text-slate-500 line-clamp-2">{step.subtitle}</div>
            ) : null}
          </div>

          {step.badgeText ? (
            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              {step.badgeText}
            </span>
          ) : null}
        </div>
      </button>

      {step.children?.length ? (
        <div className="space-y-2">
          {step.children.map(child => (
            <TreeItem
              key={child.id}
              step={child}
              activeId={activeId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
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
      {steps.map(step => (
        <TreeItem key={step.id} step={step} activeId={activeId} onSelect={onSelect} />
      ))}
    </div>
  );
}
