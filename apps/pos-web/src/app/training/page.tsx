/**
 * CoffeeOS - Training Module
 * Sistema de capacitación 30/60/90 días con cursos y certificaciones
 */

'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { ModuleInDevelopment } from '@/components/ui/ModuleInDevelopment';

export default function TrainingPage() {
  return (
    <MainLayout>
      <ModuleInDevelopment
        moduleName="Capacitación y Entrenamiento"
        description="Sistema integral de capacitación 30/60/90 días con cursos, evaluaciones y certificaciones para el personal."
      />
    </MainLayout>
  );
}
