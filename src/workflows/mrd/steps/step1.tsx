'use client';

import { Card } from '@/components/ui/Card';
import { useWorkflow } from '@/components/workflow/WorkflowContext';

const INDICATIONS = [
  'Lung cancer',
  'Breast cancer',
  'CRC (colorectal)',
  'Other',
];

export function Step1() {
  const { state, setCaseId, setIndication, toggleSurgeryDate, setSurgeryDate } = useWorkflow();

  return (
    <div className="space-y-5">
      <div className="text-sm text-slate-600">
        Создаём кейс или выбираем пациента. Если известна дата операции — сохраняем её: она
        будет использоваться для лейблов плазменных таймпоинтов.
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-6 p-5">
          <div className="text-sm font-semibold text-slate-900">Inputs</div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs text-slate-500">Patient</label>
              <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {state.selectedPatient ? `${state.selectedPatient.label} (${state.selectedPatient.id})` : 'Not selected'}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Выбор пациента подключим через кнопку “Patients” (модалка).
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500">Patient ID / Case ID</label>
              <input
                value={state.caseId}
                onChange={e => setCaseId(e.target.value)}
                placeholder="e.g., CASE-102"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500">Indication (нозология)</label>
              <select
                value={state.indication}
                onChange={e => setIndication(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
              >
                <option value="">Select…</option>
                {INDICATIONS.map(x => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500">Surgery date</div>
                <div className="text-sm text-slate-700">
                  {state.hasSurgeryDate ? 'Enabled' : 'Disabled'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleSurgeryDate()}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm hover:border-slate-300"
              >
                Toggle: surgery date
              </button>
            </div>

            {state.hasSurgeryDate ? (
              <div>
                <label className="text-xs text-slate-500">Date</label>
                <input
                  type="date"
                  value={state.surgeryDate}
                  onChange={e => setSurgeryDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
                />
              </div>
            ) : null}
          </div>
        </Card>

        {/* Output */}
        <Card className="col-span-12 lg:col-span-6 p-5">
          <div className="text-sm font-semibold text-slate-900">Output</div>

          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Созданный кейс + метаданные (mock)</li>
            <li>Если у пациента уже есть imprint → подсветим Step 2 (позже)</li>
            <li>Дата операции будет использоваться для label таймпоинтов плазмы</li>
          </ul>
        </Card>
      </div>

      <div className="text-xs text-slate-500">
        Current: patient={state.selectedPatient ? 'yes' : 'no'} • caseId={state.caseId ? 'yes' : 'no'} • surgeryDate={state.hasSurgeryDate ? 'yes' : 'no'}
      </div>
    </div>
  );
}
