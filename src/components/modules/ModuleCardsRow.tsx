'use client';

import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import type { ModuleCard as ModuleCardT, ModuleKey } from '@/types/modules';

function LockBadge() {
  return (
    <Pill variant="locked">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Locked
    </Pill>
  );
}

export function ModuleCardsRow({
  modules,
  active,
  onSelect,
}: {
  modules: ModuleCardT[];
  active: ModuleKey;
  onSelect: (k: ModuleKey) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-4 items-stretch">
      {modules.map(m => {
        const isActive = m.key === active;
        const isDisabled = !m.enabled;

        return (
          <button
            key={m.key}
            type="button"
            disabled={isDisabled}
            onClick={() => !isDisabled && onSelect(m.key)}
            className={[
              'text-left h-full',
              'transition-all duration-300 ease-out',
              isActive ? 'col-span-2' : 'col-span-1',
              isDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            <Card
              className={[
                'p-5 h-full flex flex-col', // ✅ важно: flex-col
                'transition-all duration-300 ease-out',
                isActive ? 'ring-1 ring-slate-200' : '',
                isDisabled ? 'opacity-60 grayscale' : 'hover:border-slate-300',
              ].join(' ')}
            >
              {/* TOP */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-slate-900">
                    {m.title}
                  </div>

                  {/* ✅ subtitle показываем только для активного/доступного модуля */}
                  {!isDisabled && m.subtitle ? (
                    <div className="mt-1 text-sm text-slate-500">{m.subtitle}</div>
                  ) : null}
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isDisabled ? (
                    <LockBadge />
                  ) : (
                    <Pill variant={isActive ? 'on' : 'off'}>
                      <span
                        className={[
                          'h-2 w-2 rounded-full',
                          isActive ? 'bg-emerald-500' : 'bg-slate-400',
                        ].join(' ')}
                      />
                      {isActive ? 'ON' : 'OFF'}
                    </Pill>
                  )}
                </div>
              </div>

              {/* ✅ BOTTOM (прижато вниз) */}
              {isDisabled ? (
                <div className="mt-auto pt-4">
                  <div className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
                    Workflow coming soon
                  </div>
                </div>
              ) : (
                <div className="mt-auto pt-4 flex flex-wrap gap-2">
                  <Pill>Wizard</Pill>
                  <Pill>Tree layout</Pill>
                  <Pill>{isActive ? 'Active' : 'Available'}</Pill>
                </div>
              )}
            </Card>
          </button>
        );
      })}
    </div>
  );
}
