import type { Patient } from '@/types/workflowState';

const LS_KEY = 'mrd_patients_v2';

export type ImprintModuleKey = 'LOH' | 'CNV' | 'SNV';
export type ImprintModuleState = 'idle' | 'running' | 'done';

export type StoredPatient = Patient & {
  indication?: string;
  hasSurgeryDate?: boolean;
  surgeryDate?: string;

  // Step2
  tumorAvailable?: boolean;          // чекбокс tumor available
  imprintSkipped?: boolean;          // если tumor unavailable
  imprintSkipReason?: 'no_tumor';    // причина skip
  imprintInputsReady?: boolean;      // файлы загружены+валидированы (демо-логика)
  imprintModules?: Record<ImprintModuleKey, ImprintModuleState>;
  imprintCreated?: boolean;
  imprintCreatedAt?: string;         // ISO
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
    return this.list().find(x => x.id.trim().toLowerCase() === key);
  },

  upsert(p: StoredPatient): { patients: StoredPatient[]; saved: StoredPatient } {
    const patients = this.list();

    const id = (p.id ?? '').trim();
    if (!id) throw new Error('Patient.id is required');

    const label = (p.label || id).trim() || id;
    const key = id.toLowerCase();

    const idx = patients.findIndex(x => x.id.trim().toLowerCase() === key);

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
    const next = patients.filter(p => p.id.trim().toLowerCase() !== key);
    this.saveAll(next);
    return next;
  },

  exportJson(): string {
    return JSON.stringify(this.list(), null, 2);
  },

  importJson(json: string): StoredPatient[] {
    const parsed = safeParse<StoredPatient[]>(json);
    if (!Array.isArray(parsed)) throw new Error('Invalid JSON (expected array)');
    this.saveAll(parsed);
    return parsed;
  },
};
