"use client";

import React from "react";
import type { ImprintReport } from "@/store/patientsStore";

function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type FlagTone = "slate" | "amber" | "red";
function FlagChip({ text, tone = "slate" }: { text: string; tone?: FlagTone }) {
  const cls =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-900"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <span
      className={[
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
        cls,
      ].join(" ")}
    >
      {text}
    </span>
  );
}

type SnvRow = {
  chrPos: string;
  gene: string;
  exon: string;
  cdna: string;
  protein: string;
  rd: number;
  ad: string;
  ab: number;
  filter: string;
  func: string;
  region: string;
  domain: string;
  flags: { t: string; tone?: FlagTone }[];
  gnomad: number | null;
};

function pick<T>(rnd: () => number, arr: T[]) {
  return arr[Math.floor(rnd() * arr.length)];
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function buildDemoSnvRows(seedStr: string, n = 24): SnvRow[] {
  const seed = xmur3(seedStr)();
  const rnd = mulberry32(seed);

  const genes = [
    "INTS11",
    "NCF2",
    "CHIT1",
    "USH2A",
    "NLRP3",
    "ZMYM4",
    "C20orf96",
    "CENPB",
    "KCNQ2",
    "TMEM191B",
    "DGCR8",
    "P2RX6",
    "PPP6R2",
    "MAP4K4",
    "PTPN4",
    "PIKFYVE",
    "MSH2",
    "DNAH6",
    "ANKRD36",
    "GRHL1",
    "GAPVD1",
    "ATG3",
    "TSEN2",
    "SETD2",
    "KMT2D",
  ];

  const funcs = [
    "splicing",
    "missense",
    "frameshift",
    "stop gain",
    "synonymous",
  ];
  const regions = ["exon", "splice site", "intron", "UTR", "promoter"];
  const domains = ["WD40", "DAPIN_domain", "Neutrophil...", "Kinase", "—"];

  const makeCdna = () => {
    const pos = 50 + Math.floor(rnd() * 2500);
    const kind = pick(rnd, ["A>G", "C>T", "G>A", "T>C", "del", "dup"]);
    if (kind === "del") return `c.${pos}_${pos + 2}del`;
    if (kind === "dup") return `c.${pos}_${pos + 3}dup`;
    return `c.${pos}${kind}`;
  };

  const makeProtein = (func: string) => {
    if (func === "splicing") return "—";
    if (func === "frameshift")
      return `p.${pick(rnd, ["Arg", "Glu", "Leu", "Ser"])}${
        10 + Math.floor(rnd() * 900)
      }fs`;
    if (func === "stop gain")
      return `p.${pick(rnd, ["Tyr", "Glu", "Trp"])}${
        10 + Math.floor(rnd() * 900)
      }*`;
    if (func === "synonymous") return "—";
    return `p.${pick(rnd, ["Val", "Thr", "Gly", "Ile", "Ser"])}${
      10 + Math.floor(rnd() * 900)
    }${pick(rnd, ["Met", "Asp", "Arg", "Leu"])}`;
  };

  const makeFlags = (func: string, ab: number) => {
    const flags: { t: string; tone?: FlagTone }[] = [];
    const impact = pick(rnd, ["HIGH", "HIGH", "HIGH", "MODERATE", "LOW"]);
    flags.push({
      t: impact,
      tone:
        impact === "LOW" ? "slate" : impact === "MODERATE" ? "amber" : "red",
    });

    if (func === "frameshift" || func === "stop gain")
      flags.push({ t: "LoF", tone: "red" });
    if (func === "splicing") flags.push({ t: "SD", tone: "amber" });

    const or = Math.floor(5 + rnd() * 25000);
    flags.push({ t: `OR≈${or}`, tone: or > 5000 ? "red" : "amber" });

    if (ab > 0.75) flags.push({ t: "AB↑", tone: "amber" });

    return flags.slice(0, 4);
  };

  const rows: SnvRow[] = [];
  for (let i = 0; i < n; i += 1) {
    const chr = 1 + Math.floor(rnd() * 22);
    const pos = 1_000_000 + Math.floor(rnd() * 220_000_000);
    const gene = pick(rnd, genes);
    const exonNum = 1 + Math.floor(rnd() * 60);
    const exonDen = exonNum + Math.floor(3 + rnd() * 60);
    const func = pick(rnd, funcs);
    const region = func === "splicing" ? "splice site" : pick(rnd, regions);
    const cdna = makeCdna();
    const protein = makeProtein(func);

    const rd = 1 + Math.floor(rnd() * 10);
    const ad1 = 1 + Math.floor(rnd() * 6);
    const ad2 = ad1 + Math.floor(2 + rnd() * 10);
    const ad = `${ad1}|${ad2}`;

    const ab = clamp(rnd() * 1.0, 0.03, 0.97);
    const filter = pick(rnd, ["het", "het", "het", "hom"]);

    const gnomad =
      rnd() < 0.25
        ? 0
        : rnd() < 0.15
        ? null
        : Math.round(rnd() * 0.05 * 1e7) / 1e7;

    rows.push({
      chrPos: `${chr}:${pos}`,
      gene,
      exon: `${exonNum}/${exonDen}`,
      cdna,
      protein,
      rd,
      ad,
      ab: Math.round(ab * 100) / 100,
      filter,
      func,
      region,
      domain: pick(rnd, domains),
      flags: makeFlags(func, ab),
      gnomad,
    });
  }

  return rows;
}

function Cell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={[
        "whitespace-nowrap px-3 py-2 text-xs text-slate-900",
        "border-r border-slate-200 last:border-r-0",
        className,
      ].join(" ")}
    >
      {children}
    </td>
  );
}


function HeaderCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={[
        "sticky top-0 z-10 bg-sky-50/90 backdrop-blur",
        "border-b border-sky-200 border-r last:border-r-0",
        "px-3 py-2 text-left text-[11px] font-semibold text-slate-700",
        className,
      ].join(" ")}
    >
      {children}
    </th>
  );
}

export function SnvChannelModal(props: {
  open: boolean;
  onClose: () => void;
  patientName: string;
  imprintCreatedAt?: string;
  report?: ImprintReport;
}) {
  const { open, onClose, patientName, imprintCreatedAt, report } = props;
  const createdAtText = imprintCreatedAt
    ? new Date(imprintCreatedAt).toLocaleString()
    : null;

  const seedStr = `${patientName}|${imprintCreatedAt ?? ""}|${
    report?.snv.totalSnvs ?? 0
  }|${report?.snv.medianTumorCoverageX ?? 0}`;

  const rows = React.useMemo(() => buildDemoSnvRows(seedStr, 26), [seedStr]);
  React.useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
      />

      <div className="absolute left-1/2 top-1/2 max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.25)] overflow-hidden">
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  SNV channel
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Patient:{" "}
                  <span className="font-semibold text-slate-900">
                    {patientName}
                  </span>
                  {createdAtText ? (
                    <span className="ml-2">• {createdAtText}</span>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>

          <div className="max-h-[78vh] overflow-auto p-5">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-auto">
                <table className="min-w-275 w-full border-collapse">
                  <thead>
                    <tr>
                      <HeaderCell>Chr</HeaderCell>
                      <HeaderCell>Gene</HeaderCell>
                      <HeaderCell>Exon</HeaderCell>
                      <HeaderCell>cDNA</HeaderCell>
                      <HeaderCell>Protein</HeaderCell>
                      <HeaderCell className="text-right">RD</HeaderCell>
                      <HeaderCell className="text-right">AD</HeaderCell>
                      <HeaderCell className="text-right">AB</HeaderCell>
                      <HeaderCell>Filter</HeaderCell>
                      <HeaderCell>Function</HeaderCell>
                      <HeaderCell>Region</HeaderCell>
                      <HeaderCell>Domain</HeaderCell>
                      <HeaderCell>Flags</HeaderCell>
                      <HeaderCell className="text-right">gnomAD</HeaderCell>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const abTone =
                        r.ab >= 0.75
                          ? "bg-amber-50"
                          : r.ab <= 0.25
                          ? "bg-red-50"
                          : "bg-emerald-50/40";
                      return (
                        <tr
                          key={`${r.chrPos}-${r.gene}-${r.cdna}`}
                          className="border-b border-slate-100"
                        >
                          <Cell className="text-sky-700 font-semibold">
                            {r.chrPos}
                          </Cell>
                          <Cell className="font-semibold">{r.gene}</Cell>
                          <Cell className="text-slate-700">{r.exon}</Cell>
                          <Cell className="text-slate-700">{r.cdna}</Cell>
                          <Cell className="text-slate-700">{r.protein}</Cell>
                          <Cell className="text-right">{r.rd}</Cell>
                          <Cell className="text-right">{r.ad}</Cell>
                          <Cell
                            className={[
                              "text-right font-semibold",
                              abTone,
                            ].join(" ")}
                          >
                            {r.ab.toFixed(2)}
                          </Cell>
                          <Cell className="text-slate-700">{r.filter}</Cell>
                          <Cell className="text-slate-700">{r.func}</Cell>
                          <Cell className="text-slate-700">{r.region}</Cell>
                          <Cell className="text-slate-700">{r.domain}</Cell>
                          <Cell>
                            <div className="flex flex-wrap gap-1">
                              {r.flags.map((f) => (
                                <FlagChip key={f.t} text={f.t} tone={f.tone} />
                              ))}
                            </div>
                          </Cell>
                          <Cell className="text-right text-sky-700">
                            {r.gnomad === null ? "—" : r.gnomad.toString()}
                          </Cell>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
