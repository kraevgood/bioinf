import type { ModuleCard } from '@/types/modules';

export const MODULES: ModuleCard[] = [
  {
    key: 'MRD',
    title: 'MRD Module (Minimal Residual Disease)',
    subtitle: 'Wizard — Tree layout • longitudinal MRD scoring',
    enabled: true,
  },
  {
    key: 'LIQUID_BIOPSY',
    title: 'Liquid biopsy',
    subtitle: 'Coming soon • workflow will be added',
    enabled: false,
  },
  {
    key: 'PRENATAL',
    title: 'Prenatal screening',
    subtitle: 'Coming soon • workflow will be added',
    enabled: false,
  },
];