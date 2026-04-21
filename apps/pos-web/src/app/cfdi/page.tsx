'use client';
import { MainLayout } from '@/components/layout/MainLayout';
import { ModuleInDevelopment } from '@/components/ui/ModuleInDevelopment';

export default function ModulePage() {
  return (
    <MainLayout>
      <ModuleInDevelopment
        moduleName="Facturación CFDI"
        description="Generación de facturas electrónicas CFDI 4.0 mediante PAC."
      />
    </MainLayout>
  );
}
