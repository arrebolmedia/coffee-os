/**
 * CoffeeOS - Budgets Module (Placeholder)
 */

'use client';

import { PlaceholderPage } from '@/components/PlaceholderPage';
import { PiggyBank } from 'lucide-react';

export default function BudgetsPage() {
  return (
    <PlaceholderPage
      title="Presupuestos"
      description="Planeación y control presupuestal"
      icon={PiggyBank}
      iconColor="text-purple-600"
      features={[
        'Presupuestos por centro de costos',
        'Seguimiento vs real',
        'Alertas de desviaciones',
        'Proyecciones financieras',
        'Aprobaciones de presupuesto',
      ]}
      comingSoon
    />
  );
}
