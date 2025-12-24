"use client";

import React from "react";

export type OverviewNode =
  | {
      kind: "block";
      title: string;
      subtitle?: string;
      icon?: React.ReactNode;
      emphasis?: boolean;
      badge?: string; // kept for future, but not rendered right now
    }
  | {
      kind: "drops";
      title: string;
      subtitle?: string;
      labels: string[];
      emphasis?: boolean;
    }
  | {
      kind: "chart";
      title: string;
      subtitle?: string;
      points: number[];
      emphasis?: boolean;
    };

export type WorkflowOverviewDiagramProps = {
  title?: string;
  description?: string;
  nodes: OverviewNode[];
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function MiniLineChart({ points }: { points: number[] }) {
  const W = 140;
  const H = 48;
  const pad = 6;

  const safe = points.length ? points : [0.6, 0.4, 0.55, 0.3];
  const xs = safe.map((_, i) => {
    if (safe.length === 1) return W / 2;
    return pad + (i * (W - pad * 2)) / (safe.length - 1);
  });
  const ys = safe.map((v) => {
    const vv = clamp01(v);
    return pad + (1 - vv) * (H - pad * 2);
  });

  const d = xs.map((x, i) => `${x},${ys[i]}`).join(" ");

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
      <polyline
        points={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-sky-600"
      />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r="3" className="fill-sky-600" />
      ))}
    </svg>
  );
}

function NodeShell({
  title,
  subtitle,
  emphasis,
  children,
}: {
  title: string;
  subtitle?: string;
  emphasis?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "h-full w-full rounded-2xl border bg-white p-4 flex flex-col",
        emphasis ? "border-sky-200" : "border-slate-200",
      ].join(" ")}
    >
      {/* Centered header (all nodes) */}
      <div className="text-center">
        <div className="text-xs font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
      </div>

      <div className="mt-4 flex-1">{children}</div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="hidden md:flex self-stretch items-center justify-center">
      <div className="relative h-px w-10 bg-slate-200">
        <div className="absolute -right-1 -top-1 h-2 w-2 rotate-45 border-t border-r border-slate-300" />
      </div>
    </div>
  );
}

// gradient for timepoints: earlier darker -> later lighter (last matches original style)
const DROP_STYLES = [
  "bg-sky-300 border-sky-400",
  "bg-sky-200 border-sky-300",
  "bg-sky-100 border-sky-200",
  "bg-sky-50 border-sky-100",
];

export function WorkflowOverviewDiagram({ title, description, nodes }: WorkflowOverviewDiagramProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      {title ? <div className="text-sm font-semibold text-slate-900">{title}</div> : null}
      {description ? <div className="mt-1 text-xs text-slate-500">{description}</div> : null}

      {/* Desktop: horizontal pipeline */}
      <div className="mt-5 hidden md:flex items-stretch gap-4">
        {nodes.map((n, idx) => (
          <React.Fragment key={idx}>
            <div className="min-w-52.5 flex-1 flex">
              {n.kind === "block" ? (
                <NodeShell title={n.title} subtitle={n.subtitle} emphasis={n.emphasis}>
                  {/* Centered icon (bigger) */}
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="h-12 w-12 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                      <div className="scale-110">{n.icon ?? <span className="text-base">●</span>}</div>
                    </div>
                  </div>
                </NodeShell>
              ) : n.kind === "drops" ? (
                <NodeShell title={n.title} subtitle={n.subtitle} emphasis={n.emphasis}>
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="flex items-end gap-2">
                      {n.labels.slice(0, 6).map((lab, i) => {
                        const style = DROP_STYLES[Math.min(i, DROP_STYLES.length - 1)];
                        return (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div className={["h-7 w-7 rounded-full border", style].join(" ")} />
                            <div className="text-[10px] text-slate-500">{lab}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </NodeShell>
              ) : (
                <NodeShell title={n.title} subtitle={n.subtitle} emphasis={n.emphasis}>
                  <div className="h-full flex flex-col items-center justify-center text-slate-700">
                    <MiniLineChart points={n.points} />
                    <div className="mt-2 text-[10px] text-slate-500">
                      Trend of tumor fraction / MRD score
                    </div>
                  </div>
                </NodeShell>
              )}
            </div>

            {idx < nodes.length - 1 ? <Arrow /> : null}
          </React.Fragment>
        ))}
      </div>

      {/* Mobile: vertical stack */}
      <div className="mt-5 flex flex-col gap-3 md:hidden">
        {nodes.map((n, idx) => (
          <div key={idx}>
            <div className="flex">
              {n.kind === "block" ? (
                <NodeShell title={n.title} subtitle={n.subtitle} emphasis={n.emphasis}>
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="h-12 w-12 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                      <div className="scale-110">{n.icon ?? <span className="text-base">●</span>}</div>
                    </div>
                  </div>
                </NodeShell>
              ) : n.kind === "drops" ? (
                <NodeShell title={n.title} subtitle={n.subtitle} emphasis={n.emphasis}>
                  <div className="flex flex-wrap items-end justify-center gap-2">
                    {n.labels.slice(0, 6).map((lab, i) => {
                      const style = DROP_STYLES[Math.min(i, DROP_STYLES.length - 1)];
                      return (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <div className={["h-7 w-7 rounded-full border", style].join(" ")} />
                          <div className="text-[10px] text-slate-500">{lab}</div>
                        </div>
                      );
                    })}
                  </div>
                </NodeShell>
              ) : (
                <NodeShell title={n.title} subtitle={n.subtitle} emphasis={n.emphasis}>
                  <div className="flex flex-col items-center justify-center">
                    <MiniLineChart points={n.points} />
                  </div>
                </NodeShell>
              )}
            </div>

            {idx < nodes.length - 1 ? <div className="mx-auto my-2 h-6 w-px bg-slate-200" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
