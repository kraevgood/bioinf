"use client";

import React from "react";
import type { ImprintReport } from "@/store/patientsStore";
import {
  ChromosomeLOHIcon,
  ChromosomeCNVIcon,
  ChromosomeSNVIcon,
} from "@/components/icons/ImprintIcons";

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-xs text-slate-500">{k}</div>
      <div className="text-xs font-medium text-slate-900 text-right">{v}</div>
    </div>
  );
}

function Chip({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "emerald" | "amber" | "red";
}) {
  const cls =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : tone === "red"
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        cls,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function qualityTone(q: string): "emerald" | "red" {
  // "No yellow": treat formerly MEDIUM/MODERATE/LIMITED as green.
  if (q === "LOW" || q === "WEAK" || q === "NOT USABLE") return "red";
  return "emerald";
}

function isGreenLabel(q: string): boolean {
  return !(q === "LOW" || q === "WEAK" || q === "NOT USABLE");
}

export function ImprintModal(props: {
  open: boolean;
  onClose: () => void;
  onGoToStep2: () => void;
  patientName: string;
  imprintCreatedAt?: string;
  report?: ImprintReport;
}) {
  const { open, onClose, onGoToStep2, patientName, imprintCreatedAt, report } =
    props;

  React.useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const createdAtText = imprintCreatedAt
    ? new Date(imprintCreatedAt).toLocaleString()
    : null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
      />

      <div className="absolute left-1/2 top-1/2 w-[min(1040px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.25)] overflow-hidden">
          {/* HEADER */}
          <div className="border-b border-slate-200 p-6">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  View Imprint — Quality Metrics
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Patient:{" "}
                  <span className="font-semibold text-slate-900">
                    {patientName}
                  </span>
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Read-only
                  {createdAtText ? (
                    <span className="ml-2">• {createdAtText}</span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-start justify-end gap-3">
                <button
                  type="button"
                  onClick={onGoToStep2}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                >
                  Go to Step 2
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          {/* BODY */}
          <div className="max-h-[70vh] overflow-auto p-6 space-y-5">
            {!report ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                No quality report found for this imprint (demo). Re-create imprint
                in Step 2.
              </div>
            ) : (
              <>
                {/* SUMMARY */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Imprint Summary
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Context and basic validity.
                      </div>
                    </div>

                    <Chip
                      tone={
                        report.summary.imprintStatus === "Ready"
                          ? "emerald"
                          : report.summary.imprintStatus === "Incomplete"
                            ? "amber"
                            : "red"
                      }
                    >
                      {report.summary.imprintStatus}
                    </Chip>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    <Row k="Source" v={report.summary.source} />
                    <Row k="Reference genome" v={report.summary.referenceGenome} />
                    <Row k="Pipeline version" v={report.summary.pipelineVersion} />
                    <Row k="Build date" v={report.summary.buildDate} />
                  </div>
                </div>

                {/* 3 blocks */}
                <div className="grid gap-4 md:grid-cols-3">
                  {/* LOH */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <ChromosomeLOHIcon size={44} />
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            LOH / BAF Model
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Allelic imbalance tags.
                          </div>
                        </div>
                      </div>

                      <Chip tone={qualityTone(report.loh.lohUsability)}>
                        {isGreenLabel(report.loh.lohUsability) ? "FULL" : "NOT USABLE"}
                      </Chip>
                    </div>

                    <div className="mt-4 space-y-2">
                      <Row k="LOH windows (1 Mb)" v={report.loh.lohWindows1Mb} />
                      <Row
                        k="Major allele inference"
                        v={report.loh.majorAlleleInference}
                      />
                      <Row
                        k="Coverage threshold"
                        v={report.loh.coverageThreshold}
                      />
                    </div>

                    {report.loh.comments?.length ? (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                        <div className="font-semibold text-slate-900">
                          Comments
                        </div>
                        <ul className="mt-1 list-disc pl-4">
                          {report.loh.comments.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>

                  {/* CNV */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <ChromosomeCNVIcon size={44} />
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            CNV Profile
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Tumor CNV tags.
                          </div>
                        </div>
                      </div>

                      <Chip tone={qualityTone(report.cnv.cnvSignalStrength)}>
                        {isGreenLabel(report.cnv.cnvSignalStrength) ? "STRONG" : "WEAK"}
                      </Chip>
                    </div>

                    <div className="mt-4 space-y-2">
                      <Row k="CNV segments ≥1.5 Mb" v={report.cnv.cnvSegmentsGE1_5Mb} />
                      <Row k="Genome affected" v={`${report.cnv.genomeAffectedPct}%`} />
                      <Row
                        k="Segment types"
                        v={
                          <span className="text-slate-900">
                            Amp {report.cnv.segmentTypes.amplifications} • Del {report.cnv.segmentTypes.deletions} • Neu {report.cnv.segmentTypes.neutral}
                          </span>
                        }
                      />
                      <Row k="Tumor purity indicator" v={report.cnv.tumorPurityIndicator ?? "—"} />
                    </div>

                    {report.cnv.note ? (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        {report.cnv.note}
                      </div>
                    ) : null}
                  </div>

                  {/* SNV */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <ChromosomeSNVIcon size={44} />
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            SNV Compendium
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Tumor-confirmed variants.
                          </div>
                        </div>
                      </div>

                      <Chip tone={qualityTone(report.snv.snvCompendiumQuality)}>
                        {isGreenLabel(report.snv.snvCompendiumQuality) ? "HIGH" : "LOW"}
                      </Chip>
                    </div>

                    <div className="mt-4 space-y-2">
                      <Row k="Total SNVs" v={report.snv.totalSnvs.toLocaleString()} />
                      <Row k="Median tumor coverage" v={`${report.snv.medianTumorCoverageX}×`} />
                      <Row k="Genome coverage" v={`${report.snv.genomeCoveragePct}%`} />
                      <Row k="Filtering" v={report.snv.filtering.join(", ")} />
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      <div className="font-semibold text-slate-900">Interpretation</div>
                      <div className="mt-1">
                        {isGreenLabel(report.snv.snvCompendiumQuality)
                          ? "Enough SNVs and coverage for reliable MRD."
                          : "Limited applicability for MRD."}
                      </div>
                    </div>
                  </div>
                </div>

                {/* OVERALL */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Overall Imprint Quality</div>
                      <div className="mt-1 text-xs text-slate-500">One-glance readiness.</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Chip tone={qualityTone(report.overall.overallImprintQuality)}>
                        {isGreenLabel(report.overall.overallImprintQuality) ? "HIGH" : "LOW"}
                      </Chip>
                      <Chip tone={isGreenLabel(report.overall.overallImprintQuality) ? "emerald" : "red"}>
                        {isGreenLabel(report.overall.overallImprintQuality) ? "Fully supported" : "Limited"}
                      </Chip>
                    </div>
                  </div>

                  {report.overall.warnings?.length ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <div className="font-semibold">Warnings</div>
                      <ul className="mt-2 list-disc pl-5">
                        {report.overall.warnings.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      <span className="font-semibold">No warnings.</span> Imprint looks consistent for MRD.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
