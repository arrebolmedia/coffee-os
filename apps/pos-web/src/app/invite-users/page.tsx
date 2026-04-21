'use client';
import { MainLayout } from '@/components/layout/MainLayout';
import { ModuleInDevelopment } from '@/components/ui/ModuleInDevelopment';

export default function ModulePage() {
  return (
    <MainLayout>
      <ModuleInDevelopment
        moduleName="Invitar Usuarios"
        description="Sistema de invitaciones y onboarding de nuevos usuarios."
      />
    </MainLayout>
  );
}
