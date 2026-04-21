/**
 * CoffeeOS - Attendance Module
 * Control de asistencia y horarios del personal
 */

'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { ModuleInDevelopment } from '@/components/ui/ModuleInDevelopment';

export default function AttendancePage() {
  return (
    <MainLayout>
      <ModuleInDevelopment
        moduleName="Control de Asistencia"
        description="Sistema de registro de entradas/salidas, control de horarios y reportes de asistencia del personal."
      />
    </MainLayout>
  );
}
