import type { Patient } from "@/types/workflowState";

const LS_KEY = "mrd_patients_v2";

// --- subscriptions / versioning for reactive UI ---
type PatientsStoreListener = () => void;

let storeVersion = 0;
const listeners = new Set<PatientsStoreListener>();

export function getPatientsStoreVersion(): number {
  return storeVersion;
}

export function subscribePatientsStore(listener: PatientsStoreListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyPatientsStore(): void {
  storeVersion += 1;
  for (const l of listeners) l();
}

// Debug exposure without `any` (eslint-safe)
declare global {
  interface Window {
    __PATIENTS_STORE__?: typeof PatientsStore;
  }
}

export type ImprintModuleKey = "LOH" | "CNV" | "SNV";
export type ImprintModuleState = "idle" | "running" | "done";

// Step4 (Run)
export type AnalysisChannelKey = "SNV" | "CNV" | "LOH";
export type AnalysisChannelState = "idle" | "running" | "done";

// ✅ Step4 configuration (demo)
export type AnalysisConfig = {
  mode: "auto" | "manual";
  thresholdPct: number; // e.g. 0.03 means 0.03%
  channels: Partial<Record<AnalysisChannelKey, boolean>>;
  pon: string; // demo selector
};

// -------------------- Imprint quality report (View Imprint) --------------------

export type ImprintStatus = "Ready" | "Incomplete" | "Not available";
export type ImprintQuality = "HIGH" | "MEDIUM" | "LOW";

export type SnvCompendiumQuality = ImprintQuality;

export type CnvSignalStrength = "STRONG" | "MODERATE" | "WEAK";

export type MajorAlleleInference = "Successful" | "Partial" | "Failed";
export type CoverageThreshold = "Met" | "Not met";
export type LohUsability = "FULL" | "LIMITED" | "NOT USABLE";

export type MrdReadiness = "Fully supported" | "Partially supported" | "Limited";

export type ImprintSummary = {
  imprintStatus: ImprintStatus;
  source: "Tumor WGS" | "Tumor VCF" | "—";
  normalSample: "Present" | "Not present";
  referenceGenome: "hg38" | "hg19";
  pipelineVersion: string;
  buildDate: string; // YYYY-MM-DD
};

export type SnvMetrics = {
  totalSnvs: number;
  medianTumorCoverageX: number;
  filtering: Array<"Germline" | "CHIP" | "Blacklist regions">;
  genomeCoveragePct: number;
  snvCompendiumQuality: SnvCompendiumQuality;
};

export type CnvMetrics = {
  cnvSegmentsGE1_5Mb: number;
  genomeAffectedPct: number;
  segmentTypes: {
    amplifications: number;
    deletions: number;
    neutral: number;
  };
  tumorPurityIndicator?: string; // human-readable (demo)
  cnvSignalStrength: CnvSignalStrength;
  note?: string;
};

export type LohMetrics = {
  lohWindows1Mb: number;
  majorAlleleInference: MajorAlleleInference;
  coverageThreshold: CoverageThreshold;
  lohUsability: LohUsability;
  comments?: string[];
};

export type ImprintOverall = {
  overallImprintQuality: ImprintQuality;
  mrdReadiness: MrdReadiness;
  warnings?: string[];
};

export type ImprintReport = {
  summary: ImprintSummary;
  snv: SnvMetrics;
  cnv: CnvMetrics;
  loh: LohMetrics;
  overall: ImprintOverall;
};

// Step3/4 data model (lightweight demo)
export type PlasmaSample = {
  id: string;
  drawDate: string; // YYYY-MM-DD
  label: string;
  relationToSurgery?: string;
  dayOffset?: number; // relative to surgery date
  validated?: boolean;
  fastqValidated?: boolean;
  validationAt?: string;
  files?: {
    r1Name?: string;
    r2Name?: string;
    r1Size?: number;
    r2Size?: number;
  };
};

export type StoredPatient = Patient & {
  indication?: string;
  hasSurgeryDate?: boolean;
  surgeryDate?: string;

  // Step3
  plasmaSamples?: PlasmaSample[];

  // Step2
  tumorAvailable?: boolean; // чекбокс tumor available
  imprintSkipped?: boolean; // если tumor unavailable
  imprintSkipReason?: "no_tumor"; // причина skip

  // Validate / Next gating (Step2)
  imprintValidated?: boolean; // нажали Validate и успешно прошло
  imprintValidationAt?: string; // ISO timestamp
  imprintRunStarted?: boolean; // нажали Next и стартанули LOH→CNV→SNV

  // Step2 state
  imprintInputsReady?: boolean; // файлы загружены+валидированы (демо-логика)
  imprintModules?: Record<ImprintModuleKey, ImprintModuleState>;
  imprintCreated?: boolean;
  imprintCreatedAt?: string; // ISO

  // ✅ NEW: View Imprint report
  imprintReport?: ImprintReport;

  // Step4
  analysisConfig?: AnalysisConfig;
  analysisRunStarted?: boolean;
  analysisRunAt?: string; // ISO
  analysisChannels?: Partial<Record<AnalysisChannelKey, AnalysisChannelState>>;
  analysisCompleted?: boolean;
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const PatientsStore = {
  key: LS_KEY,

  list(): StoredPatient[] {
    const parsed = safeParse<StoredPatient[]>(localStorage.getItem(LS_KEY));
    return Array.isArray(parsed) ? parsed : [];
  },

  saveAll(patients: StoredPatient[]) {
    localStorage.setItem(LS_KEY, JSON.stringify(patients));
    notifyPatientsStore();
  },

  clear() {
    localStorage.removeItem(LS_KEY);
    notifyPatientsStore();
  },

  findById(id: string): StoredPatient | undefined {
    const key = id.trim().toLowerCase();
    return this.list().find((x) => x.id.trim().toLowerCase() === key);
  },

  upsert(p: StoredPatient): {
    patients: StoredPatient[];
    saved: StoredPatient;
  } {
    const patients = this.list();

    const id = (p.id ?? "").trim();
    if (!id) throw new Error("Patient.id is required");

    const label = (p.label || id).trim() || id;
    const key = id.toLowerCase();

    const idx = patients.findIndex((x) => x.id.trim().toLowerCase() === key);

    if (idx >= 0) {
      const merged: StoredPatient = { ...patients[idx], ...p, id, label };
      const next = patients.slice();
      next[idx] = merged;
      this.saveAll(next);
      return { patients: next, saved: merged };
    }

    const saved: StoredPatient = { ...p, id, label };
    const next = [saved, ...patients];
    this.saveAll(next);
    return { patients: next, saved };
  },

  remove(id: string): StoredPatient[] {
    const patients = this.list();
    const key = id.trim().toLowerCase();
    const next = patients.filter((p) => p.id.trim().toLowerCase() !== key);
    this.saveAll(next);
    return next;
  },

  exportJson(): string {
    return JSON.stringify(this.list(), null, 2);
  },

  importJson(json: string): StoredPatient[] {
    const parsed = safeParse<StoredPatient[]>(json);
    if (!Array.isArray(parsed)) throw new Error("Invalid JSON (expected array)");
    this.saveAll(parsed);
    return parsed;
  },
};

if (typeof window !== "undefined") {
  window.__PATIENTS_STORE__ = PatientsStore;
}
