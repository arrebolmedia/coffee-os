'use client';
import { MainLayout } from '@/components/layout/MainLayout';
import { ModuleInDevelopment } from '@/components/ui/ModuleInDevelopment';

export default function ModulePage() {
  return (
    <MainLayout>
      <ModuleInDevelopment
        moduleName="Integraciones"
        description="Configuración de integraciones con servicios externos (Twilio, Mailrelay, PAC)."
      />
    </MainLayout>
  );
}
