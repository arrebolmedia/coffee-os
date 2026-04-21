'use client';
import { MainLayout } from '@/components/layout/MainLayout';
import { ModuleInDevelopment } from '@/components/ui/ModuleInDevelopment';

export default function ModulePage() {
  return (
    <MainLayout>
      <ModuleInDevelopment
        moduleName="Mensajería"
        description="Envío de mensajes WhatsApp y SMS a clientes."
      />
    </MainLayout>
  );
}
