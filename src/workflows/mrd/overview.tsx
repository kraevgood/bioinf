import React from "react";
import type { WorkflowOverviewDiagramProps } from "@/components/workflow/WorkflowOverviewDiagram";
import { Dna, TestTube} from "lucide-react";

export const mrdOverview: WorkflowOverviewDiagramProps = {
  title: "MRD workflow overview ImprintAI processing (ML-based signal enrichment and denoising)",
  // сабтайтл ты уже убирал на диаграмме — можно оставить, но он не покажется
  description:
    "Biopsy → signature (if tumor) → plasma timepoints → ImprintAI processing → MRD dynamics.",
  nodes: [
    {
      kind: "block",
      title: "Tumor biopsy",
      subtitle: "Tumor DNA input",
      icon: <TestTube size={22} strokeWidth={2} className="text-sky-300" />,
      emphasis: true,
    },
    {
      kind: "block",
      title: "Personalized signature",
      subtitle: "Tumor-specific variants",
      icon: <Dna size={22} strokeWidth={2} className="text-sky-300" />,
      emphasis: true,
    },

    {
      kind: "drops",
      title: "Plasma samples",
      subtitle: "Longitudinal timepoints",
      labels: ["Pre-op", "1m", "3m", "6m", "9m"],
    },
    {
      kind: "branch",
      title: "ImprintAI processing",
      top: {
        title: "Tumor-informed",
        emphasis: true,
      },
      bottom: {
        title: "Non-tumor-informed",
        emphasis: true,
      },
    },
    {
      kind: "chart",
      title: "MRD over time",
      subtitle: "Response monitoring",
      points: [0.75, 0.62, 0.32, 0.22, 0.18],
    },
  ],
};
