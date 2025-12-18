'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import type { Patient, WorkflowState } from '@/types/workflowState';

type WorkflowContextValue = {
  // workflow data
  state: WorkflowState;
  setCaseId: (v: string) => void;
  setIndication: (v: string) => void;
  toggleSurgeryDate: (v?: boolean) => void;
  setSurgeryDate: (v: string) => void;
  setSelectedPatient: (p: Patient | null) => void;

  // navigation
  activeStepId: string;
  setActiveStepId: (id: string) => void;
};

const initialState: WorkflowState = {
  selectedPatient: null,
  caseId: '',
  indication: '',
  hasSurgeryDate: false,
  surgeryDate: '',
};

const Ctx = createContext<WorkflowContextValue | null>(null);

export function WorkflowProvider({
  children,
  initialActiveStepId,
}: {
  children: React.ReactNode;
  initialActiveStepId: string;
}) {
  const [state, setState] = useState<WorkflowState>(initialState);
  const [activeStepId, setActiveStepId] = useState<string>(initialActiveStepId);

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

      activeStepId,
      setActiveStepId,
    };
  }, [state, activeStepId]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useWorkflow() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWorkflow must be used inside WorkflowProvider');
  return ctx;
}
