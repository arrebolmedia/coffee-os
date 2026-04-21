'use client';
import { MainLayout } from '@/components/layout/MainLayout';
import { ModuleInDevelopment } from '@/components/ui/ModuleInDevelopment';

export default function ModulePage() {
  return (
    <MainLayout>
      <ModuleInDevelopment
        moduleName="Contabilidad"
        description="Registro contable, libro diario, pólizas y conciliaciones bancarias."
      />
    </MainLayout>
  );
}
