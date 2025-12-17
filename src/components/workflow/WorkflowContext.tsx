'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import type { Patient, WorkflowState } from '@/types/workflowState';

type WorkflowContextValue = {
  state: WorkflowState;
  setCaseId: (v: string) => void;
  setIndication: (v: string) => void;
  toggleSurgeryDate: (v?: boolean) => void;
  setSurgeryDate: (v: string) => void;
  setSelectedPatient: (p: Patient | null) => void;
};

const Ctx = createContext<WorkflowContextValue | null>(null);

const initialState: WorkflowState = {
  selectedPatient: null,
  caseId: '',
  indication: '',
  hasSurgeryDate: false,
  surgeryDate: '',
};

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkflowState>(initialState);

  const api = useMemo<WorkflowContextValue>(() => {
    return {
      state,
      setCaseId: v => setState(s => ({ ...s, caseId: v })),
      setIndication: v => setState(s => ({ ...s, indication: v })),
      toggleSurgeryDate: v =>
        setState(s => {
          const next = v ?? !s.hasSurgeryDate;
          return { ...s, hasSurgeryDate: next, surgeryDate: next ? s.surgeryDate : '' };
        }),
      setSurgeryDate: v => setState(s => ({ ...s, surgeryDate: v })),
      setSelectedPatient: p => setState(s => ({ ...s, selectedPatient: p })),
    };
  }, [state]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useWorkflow() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWorkflow must be used inside WorkflowProvider');
  return ctx;
}
