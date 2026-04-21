'use client';
import { MainLayout } from '@/components/layout/MainLayout';
import { ModuleInDevelopment } from '@/components/ui/ModuleInDevelopment';

export default function ModulePage() {
  return (
    <MainLayout>
      <ModuleInDevelopment
        moduleName="Segmentación de Clientes"
        description="Análisis RFM y segmentación de clientes para campañas personalizadas."
      />
    </MainLayout>
  );
}
