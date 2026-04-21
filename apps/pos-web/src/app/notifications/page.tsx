/**
 * CoffeeOS - Notifications Module (Placeholder)
 */

'use client';

import { PlaceholderPage } from '@/components/PlaceholderPage';
import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <PlaceholderPage
      title="Notificaciones"
      description="Centro de notificaciones y alertas"
      icon={Bell}
      iconColor="text-yellow-600"
      features={[
        'Notificaciones en tiempo real',
        'Alertas configurables',
        'Historial de notificaciones',
        'Preferencias por canal',
        'Notificaciones push',
      ]}
      comingSoon
    />
  );
}
