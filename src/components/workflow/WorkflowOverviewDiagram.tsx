"use client";

import React from "react";

export type OverviewNode =
  | {
      kind: "block";
      title: string;
      subtitle?: string;
      icon?: React.ReactNode;
      emphasis?: boolean;
      content?: React.ReactNode;
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
    }
  | {
      kind: "branch";
      title: string;
      subtitle?: string;
      top: { title: string; subtitle?: string; emphasis?: boolean };
      bottom: { title: string; subtitle?: string; emphasis?: boolean };
    };

export type WorkflowOverviewDiagramProps = {
  title?: string;
  description?: string; // отображать не будем (сабтайтл убран)
  nodes: OverviewNode[];
};

const CARD_MIN_H = 128;
const NODE_W = 165;
const BRANCH_W = 165;
const CONNECTOR_W = 44;

const FLOW_COLOR = "#93C5FD"; // sky-300
const FLOW_STROKE = 1.5;

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function MiniLineChart({ points }: { points: number[] }) {
  const W = 102;
  const H = 34;
  const pad = 5;

  const safe = points.length ? points : [0.6, 0.4, 0.55, 0.3];
  const xs = safe.map((_, i) =>
    safe.length === 1 ? W / 2 : pad + (i * (W - pad * 2)) / (safe.length - 1)
  );
  const ys = safe.map((v) => pad + (1 - clamp01(v)) * (H - pad * 2));
  const d = xs.map((x, i) => `${x},${ys[i]}`).join(" ");

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline
        points={d}
        fill="none"
        stroke={FLOW_COLOR}
        strokeWidth={FLOW_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r="2.2" fill={FLOW_COLOR} />
      ))}
    </svg>
  );
}

function StraightConnector() {
  const mid = CARD_MIN_H / 2;
  return (
    <div className="relative flex-none" style={{ width: CONNECTOR_W, height: CARD_MIN_H }}>
      <svg viewBox={`0 0 ${CONNECTOR_W} ${CARD_MIN_H}`} className="w-full h-full">
        <path d={`M0 ${mid} H${CONNECTOR_W}`} stroke={FLOW_COLOR} strokeWidth={FLOW_STROKE} />
        <path
          d={`M${CONNECTOR_W - 8} ${mid - 4} L${CONNECTOR_W} ${mid} L${CONNECTOR_W - 8} ${mid + 4}`}
          stroke={FLOW_COLOR}
          strokeWidth={FLOW_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function SplitConnector() {
  const mid = CARD_MIN_H / 2;
  const yTop = CARD_MIN_H * 0.35;
  const yBot = CARD_MIN_H * 0.75;
  const sx = CONNECTOR_W * 0.6;

  return (
    <div className="relative flex-none" style={{ width: CONNECTOR_W, height: CARD_MIN_H }}>
      <svg viewBox={`0 0 ${CONNECTOR_W} ${CARD_MIN_H}`} className="w-full h-full">
        <path d={`M0 ${mid} H${sx}`} stroke={FLOW_COLOR} strokeWidth={FLOW_STROKE} />
        <path
          d={`M${sx - 8} ${mid - 4} L${sx} ${mid} L${sx - 8} ${mid + 4}`}
          stroke={FLOW_COLOR}
          strokeWidth={FLOW_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={`M${sx} ${mid} C ${sx + 6} ${mid}, ${sx + 6} ${yTop}, ${CONNECTOR_W} ${yTop}`}
          stroke={FLOW_COLOR}
          strokeWidth={FLOW_STROKE}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M${sx} ${mid} C ${sx + 6} ${mid}, ${sx + 6} ${yBot}, ${CONNECTOR_W} ${yBot}`}
          stroke={FLOW_COLOR}
          strokeWidth={FLOW_STROKE}
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function MergeConnector() {
  const mid = CARD_MIN_H / 2;
  const yTop = CARD_MIN_H * 0.35;
  const yBot = CARD_MIN_H * 0.75;
  const mx = CONNECTOR_W * 0.4;

  return (
    <div className="relative flex-none" style={{ width: CONNECTOR_W, height: CARD_MIN_H }}>
      <svg viewBox={`0 0 ${CONNECTOR_W} ${CARD_MIN_H}`} className="w-full h-full">
        <path
          d={`M0 ${yTop} C ${mx - 6} ${yTop}, ${mx - 6} ${mid}, ${mx} ${mid}`}
          stroke={FLOW_COLOR}
          strokeWidth={FLOW_STROKE}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M0 ${yBot} C ${mx - 6} ${yBot}, ${mx - 6} ${mid}, ${mx} ${mid}`}
          stroke={FLOW_COLOR}
          strokeWidth={FLOW_STROKE}
          fill="none"
          strokeLinecap="round"
        />
        <path d={`M${mx} ${mid} H${CONNECTOR_W}`} stroke={FLOW_COLOR} strokeWidth={FLOW_STROKE} />
        <path
          d={`M${CONNECTOR_W - 8} ${mid - 4} L${CONNECTOR_W} ${mid} L${CONNECTOR_W - 8} ${mid + 4}`}
          stroke={FLOW_COLOR}
          strokeWidth={FLOW_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
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
        "w-full rounded-2xl border bg-white px-2.5 py-2.5 flex flex-col",
        emphasis ? "border-sky-300" : "border-sky-200",
      ].join(" ")}
      style={{ minHeight: CARD_MIN_H }}
    >
      <div className="text-center leading-tight">
        <div className="text-[11px] font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="mt-0.5 text-[10px] text-slate-500">{subtitle}</div> : null}
      </div>

      <div className="mt-2 flex-1 flex items-center justify-center">{children}</div>
    </div>
  );
}

function BlockIcon({ icon }: { icon?: React.ReactNode }) {
  return (
    <div className="h-9 w-9 rounded-2xl border border-sky-200 bg-sky-50 flex items-center justify-center">
      <div className="scale-105">{icon ?? <span className="text-base">●</span>}</div>
    </div>
  );
}

const DROP_STYLES = [
  "bg-sky-300 border-sky-400",
  "bg-sky-200 border-sky-300",
  "bg-sky-100 border-sky-200",
  "bg-sky-50 border-sky-100",
];

function BranchInnerCard({
  title,
  subtitle,
  tone,
}: {
  title: string;
  subtitle?: string;
  tone: "green" | "blue";
}) {
  const base =
    "rounded-xl border px-2.5 py-1.5 text-center leading-tight min-h-[42px] flex flex-col justify-center";

  if (tone === "green") {
    return (
      <div className={`${base} border-emerald-300 bg-emerald-50`}>
        <div className="text-[10px] font-semibold text-black">{title}</div>
        {subtitle ? <div className="mt-0.5 text-[9px] text-slate-600">{subtitle}</div> : null}
      </div>
    );
  }

  return (
    <div className={`${base} border-sky-300 bg-sky-50`}>
      <div className="text-[10px] font-semibold text-black">{title}</div>
      {subtitle ? <div className="mt-0.5 text-[9px] text-slate-600">{subtitle}</div> : null}
    </div>
  );
}

function BranchCard({
  title,
  subtitle,
  top,
  bottom,
}: Extract<OverviewNode, { kind: "branch" }>) {
  return (
    <NodeShell title={title} subtitle={subtitle} emphasis>
      <div className="w-full grid grid-rows-2 gap-1.5">
        <BranchInnerCard title={top.title} subtitle={top.subtitle} tone="green" />
        <BranchInnerCard title={bottom.title} subtitle={bottom.subtitle} tone="blue" />
      </div>
    </NodeShell>
  );
}

export function WorkflowOverviewDiagram({ title, nodes }: WorkflowOverviewDiagramProps) {
  const connectorBetween = (a: OverviewNode, b: OverviewNode) => {
    if (b.kind === "branch") return <SplitConnector />;
    if (a.kind === "branch") return <MergeConnector />;
    return <StraightConnector />;
  };

  const renderNode = (n: OverviewNode) => {
    if (n.kind === "branch") return <BranchCard {...n} />;

    if (n.kind === "chart") {
      return (
        <NodeShell title={n.title} subtitle={n.subtitle} emphasis={n.emphasis}>
          <div className="flex flex-col items-center">
            <MiniLineChart points={n.points} />
            <div className="mt-1 text-[9px] text-slate-500">Trend of tumor fraction / MRD score</div>
          </div>
        </NodeShell>
      );
    }

    if (n.kind === "drops") {
      return (
        <NodeShell title={n.title} subtitle={n.subtitle} emphasis={n.emphasis}>
          <div className="flex items-end gap-1.5">
            {n.labels.slice(0, 6).map((lab, i) => {
              const style = DROP_STYLES[Math.min(i, DROP_STYLES.length - 1)];
              return (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <div className={["h-5 w-5 rounded-full border", style].join(" ")} />
                  <div className="text-[9px] text-slate-500">{lab}</div>
                </div>
              );
            })}
          </div>
        </NodeShell>
      );
    }

    return (
      <NodeShell title={n.title} subtitle={n.subtitle} emphasis={n.emphasis}>
        {n.content ? n.content : <BlockIcon icon={n.icon} />}
      </NodeShell>
    );
  };

  // ширина всей цепочки, чтобы можно было margin:auto и получить равные поля слева/справа
  const flowWidth =
    nodes.reduce((sum, n) => sum + (n.kind === "branch" ? BRANCH_W : NODE_W), 0) +
    (nodes.length > 1 ? (nodes.length - 1) * CONNECTOR_W : 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      {title ? <div className="text-sm font-semibold text-slate-900">{title}</div> : null}
      {/* сабтайтл убран */}

      <div className="mt-4 w-full overflow-hidden">
        {/* центрируем по ширине внешнего блока при сохранении фиксированных расстояний */}
        <div
          className="flex items-center"
          style={{
            width: flowWidth,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {nodes.map((n, i) => {
            const w = n.kind === "branch" ? BRANCH_W : NODE_W;
            return (
              <React.Fragment key={i}>
                <div className="flex-none flex" style={{ width: w, minWidth: w, height: CARD_MIN_H }}>
                  {renderNode(n)}
                </div>
                {i < nodes.length - 1 ? connectorBetween(n, nodes[i + 1]) : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
