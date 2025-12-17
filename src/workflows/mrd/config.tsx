import type { WorkflowConfig } from "@/types/workflow";

import { Step1 } from "./steps/step1";
import { Step2 } from "./steps/step2";
import { Step3 } from "./steps/step3";
import { Step4 } from "./steps/step4";
import { Step4Snv } from './steps/step4Snv';
import { Step4Cnv } from './steps/step4Cnv';
import { Step5 } from "./steps/step5";

export const mrdWorkflowConfig: WorkflowConfig = {
  key: "MRD",
  title: "MRD workflow",
  defaultStepId: "step1",
  steps: [
    {
      id: "step1",
      title: "Create case / Select patient",
      subtitle: "Optional surgery date → labels plasma timepoints",
      badgeText: "Patient",
      status: "ready",
      render: () => <Step1 />,
    },
    {
      id: "step2",
      title: "Create imprint (if tumor available)",
      subtitle: "Upload tumor FASTQ R1/R2 → validate → imprint",
      badgeText: "Imprint",
      status: "idle",
      children: [
        {
          id: "step2_loh",
          kind: "substep",
          title: "LOH discovery",
          subtitle: "Windows + major allele inference for BAF",
          badgeText: "1 Mb",
          status: "idle",
          render: () => <Step2 />,
        },
        {
          id: "step2_cnv",
          kind: "substep",
          title: "CNV segments",
          subtitle: "Tumor CNV profile used as tags",
          badgeText: "≥1.5 Mb",
          status: "idle",
          render: () => <Step2 />,
        },
        {
          id: "step2_snv",
          kind: "substep",
          title: "SNV compendium",
          subtitle: "Tumor-confirmed SNVs (no indels)",
          badgeText: "Genome-wide",
          status: "idle",
          render: () => <Step2 />,
        },
      ],
      render: () => <Step2 />,
    },
    {
      id: "step3",
      title: "Add plasma sample",
      subtitle: "If no imprint: choose indication for non-informed",
      badgeText: "Plasma",
      status: "idle",
      render: () => <Step3 />,
    },
    {
      id: "step4",
      title: "Review & Run (configurable)",
      subtitle: "Two channels: SNV + CNV",
      badgeText: "Config",
      status: "idle",
      children: [
        {
          id: "step4_snv",
          kind: "substep",
          title: "SNV channel",
          subtitle: "Tumor-informed OR indication-guided",
          badgeText: "AI-denoise",
          status: "idle",
          render: () => <Step4Snv />,
        },
        {
          id: "step4_cnv",
          kind: "substep",
          title: "CNV channel",
          subtitle: "Read-depth + BAF + fragmentomics",
          badgeText: "AI-denoise",
          status: "idle",
          render: () => <Step4Cnv />,
        },
      ],
      render: () => <Step4 />,
    },
    {
      id: "step5",
      title: "Results",
      subtitle: "Tumor fraction + MRD status + trend over time",
      badgeText: "TF",
      status: "idle",
      render: () => <Step5 />,
    },
  ],
};
