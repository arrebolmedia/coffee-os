'use client';
import { MainLayout } from '@/components/layout/MainLayout';
import { ModuleInDevelopment } from '@/components/ui/ModuleInDevelopment';

export default function ModulePage() {
  return (
    <MainLayout>
      <ModuleInDevelopment
        moduleName="Estado de Resultados (P&L)"
        description="Estado de pérdidas y ganancias por ubicación y período."
      />
    </MainLayout>
  );
}
