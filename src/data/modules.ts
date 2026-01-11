import type { ModuleCard } from '@/types/modules';

export const MODULES: ModuleCard[] = [
  {
    key: 'MRD',
    title: 'MRD Module (Minimal Residual Disease)',
    subtitle: 'Longitudinal MRD scoring',
    enabled: true,
  },
  {
    key: 'LIQUID_BIOPSY',
    title: 'Liquid biopsy',
    subtitle: '', // убрал “Coming soon • workflow will be added”
    enabled: false,
  },
  {
    key: 'PRENATAL',
    title: 'Prenatal screening',
    subtitle: '', // убрал “Coming soon • workflow will be added”
    enabled: false,
  },
];
