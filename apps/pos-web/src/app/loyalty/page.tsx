'use client';
import { MainLayout } from '@/components/layout/MainLayout';
import { ModuleInDevelopment } from '@/components/ui/ModuleInDevelopment';

export default function ModulePage() {
  return (
    <MainLayout>
      <ModuleInDevelopment
        moduleName="Programa de Lealtad"
        description="Sistema 9+1, puntos, recompensas y beneficios para clientes frecuentes."
      />
    </MainLayout>
  );
}
