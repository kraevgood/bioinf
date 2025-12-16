export type ModuleKey = 'MRD' | 'LIQUID_BIOPSY' | 'PRENATAL';

export type ModuleCard = {
  key: ModuleKey;
  title: string;
  subtitle: string;
  enabled: boolean;
};