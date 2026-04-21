'use client';
import { MainLayout } from '@/components/layout/MainLayout';
import { ModuleInDevelopment } from '@/components/ui/ModuleInDevelopment';

export default function ModulePage() {
  return (
    <MainLayout>
      <ModuleInDevelopment
        moduleName="Campañas de Marketing"
        description="Gestión de campañas de marketing, correos automáticos y promociones."
      />
    </MainLayout>
  );
}
