import type { ModuleCard } from '@/types/modules';

export const MODULES: ModuleCard[] = [
  {
    key: 'MRD',
    title: 'Модуль MRD (минимальная остаточная болезнь)',
    subtitle: 'Wizard — Tree layout • longitudinal MRD scoring',
    enabled: true,
  },
  {
    key: 'LIQUID_BIOPSY',
    title: 'Жидкая биопсия',
    subtitle: 'Скоро • workflow будет добавлен',
    enabled: false,
  },
  {
    key: 'PRENATAL',
    title: 'Пренатальный скрининг',
    subtitle: 'Скоро • workflow будет добавлен',
    enabled: false,
  },
];