import type { ReactNode } from "react";

export type StepStatus = "idle" | "ready" | "processing" | "done" | "error";

export type WorkflowStep = {
  id: string;
  title: string;
  subtitle?: string;
  kind?: "step" | "substep";

  // icon (для substeps и/или любых шагов)
  icon?: ReactNode;

  badgeText?: string;
  status?: StepStatus;
  children?: WorkflowStep[];
  render: () => ReactNode;
};

export type WorkflowConfig = {
  key: "MRD" | "LIQUID_BIOPSY" | "PRENATAL";
  title: string;
  steps: WorkflowStep[];
  defaultStepId: string;
};
