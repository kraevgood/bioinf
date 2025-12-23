import type { Patient } from "@/types/workflowState";

const LS_KEY = "mrd_patients_v2";

export type ImprintModuleKey = "LOH" | "CNV" | "SNV";
export type ImprintModuleState = "idle" | "running" | "done";

// Step4 (Run)
export type AnalysisChannelKey = "SNV" | "CNV";
export type AnalysisChannelState = "idle" | "running" | "done";

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
  tumorAvailable?: boolean; // tumor available checkbox
  imprintSkipped?: boolean; // when tumor is unavailable
  imprintSkipReason?: "no_tumor"; // skip reason

  // Validate / Next gating (Step2)
  imprintValidated?: boolean; // Validate clicked and succeeded
  imprintValidationAt?: string; // ISO timestamp
  imprintRunStarted?: boolean; // Next clicked and LOH→CNV→SNV started

  // Step2 state
  imprintInputsReady?: boolean; // files uploaded + validated (demo logic)
  imprintModules?: Record<ImprintModuleKey, ImprintModuleState>;
  imprintCreated?: boolean;
  imprintCreatedAt?: string; // ISO

  // Step4
  analysisRunStarted?: boolean;
  analysisRunAt?: string; // ISO
  analysisChannels?: Record<AnalysisChannelKey, AnalysisChannelState>;
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
  },

  clear() {
    localStorage.removeItem(LS_KEY);
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
    if (!Array.isArray(parsed))
      throw new Error("Invalid JSON (expected array)");
    this.saveAll(parsed);
    return parsed;
  },
};
