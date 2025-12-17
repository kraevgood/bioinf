import type { ReactNode } from 'react';

export type StepStatus = 'idle' | 'ready' | 'processing' | 'done' | 'error';

export type WorkflowStep = {
  id: string;
  title: string;
  subtitle?: string;

  // бейдж справа в дереве (например: Patient, Plasma, Config)
  badgeText?: string;

  // статус (потом пригодится для подсветки)
  status?: StepStatus;

  // подшаги (как LOH/CNV/SNV внутри Step 2)
  children?: WorkflowStep[];

  // что рисуем справа
  render: () => ReactNode;
};

export type WorkflowConfig = {
  key: 'MRD' | 'LIQUID_BIOPSY' | 'PRENATAL';
  title: string;
  steps: WorkflowStep[];
  defaultStepId: string;
};
