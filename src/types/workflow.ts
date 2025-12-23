import type { ReactNode } from "react";

export type StepStatus = "idle" | "ready" | "processing" | "done" | "error";

export type WorkflowStep = {
  id: string;
  title: string;
  subtitle?: string;
  kind?: "step" | "substep";

  // right-side badge in the tree (e.g., Patient, Plasma, Config)
  badgeText?: string;

  // status (used later for highlighting)
  status?: StepStatus;

  // sub-steps (e.g., LOH/CNV/SNV inside MRD Step 2)
  children?: WorkflowStep[];

  // what to render on the right
  render: () => ReactNode;
};

export type WorkflowConfig = {
  key: "MRD" | "LIQUID_BIOPSY" | "PRENATAL";
  title: string;
  steps: WorkflowStep[];
  defaultStepId: string;
};
