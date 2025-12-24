import React from "react";
import type { WorkflowOverviewDiagramProps } from "@/components/workflow/WorkflowOverviewDiagram";

// Inline SVG icons (handmade, no external icon libraries)
function IconBiopsy() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className="text-sky-600"
    >
      {/* Sample container */}
      <rect
        x="6"
        y="3"
        width="12"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />

      {/* Tissue sample */}
      <path
        d="M9 9c1.5-1 4.5-1 6 0M9 12c1.5-1 4.5-1 6 0M9 15c1.5-1 4.5-1 6 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Cap */}
      <path
        d="M6 3h12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}


function IconTarget() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" className="text-sky-600" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v3M22 12h-3M12 22v-3M2 12h3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const mrdOverview: WorkflowOverviewDiagramProps = {
  title: "MRD workflow overview",
  description: "Biopsy → personalized signature → longitudinal plasma → MRD dynamics.",
  nodes: [
    {
      kind: "block",
      title: "Tumor biopsy",
      subtitle: "Tumor DNA input",
      icon: <IconBiopsy />,
      emphasis: true,
      badge: "Input",
    },
    {
      kind: "block",
      title: "Personalized signature",
      subtitle: "Tumor-specific variants",
      icon: <IconTarget />,
      emphasis: true,
      badge: "Signature build",
    },
    {
      kind: "drops",
      title: "Plasma samples",
      subtitle: "Longitudinal timepoints",
      labels: ["Pre-op", "1m", "3m", "6m", "9m"],
      emphasis: false,
    },
    {
      kind: "chart",
      title: "MRD over time",
      subtitle: "Response monitoring",
      points: [0.75, 0.62, 0.32, 0.22, 0.18],
      emphasis: false,
    },
  ],
};
