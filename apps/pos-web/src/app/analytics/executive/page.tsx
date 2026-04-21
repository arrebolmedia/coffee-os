/**
 * CoffeeOS - Executive Analytics Module (Placeholder)
 */

'use client';

import { PlaceholderPage } from '@/components/PlaceholderPage';
import { BarChart3 } from 'lucide-react';

export default function ExecutiveAnalyticsPage() {
  return (
    <PlaceholderPage
      title="Dashboard Ejecutivo"
      description="Vista ejecutiva de indicadores clave"
      icon={BarChart3}
      iconColor="text-indigo-600"
      features={[
        'KPIs consolidados',
        'Comparativas por sucursal',
        'Tendencias y proyecciones',
        'Alertas ejecutivas',
        'Exportación de reportes',
      ]}
      comingSoon
    />
  );
}
