'use client';
import { MainLayout } from '@/components/layout/MainLayout';
import { ModuleInDevelopment } from '@/components/ui/ModuleInDevelopment';

export default function ModulePage() {
  return (
    <MainLayout>
      <ModuleInDevelopment
        moduleName="Control de Temperaturas"
        description="Registro y monitoreo de temperaturas NOM-251 para seguridad alimentaria."
      />
    </MainLayout>
  );
}
