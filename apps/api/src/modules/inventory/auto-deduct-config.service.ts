import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

const SETTING_CATEGORY = 'inventory';
const SETTING_KEY = 'auto_deduct';

export interface AutoDeductConfig {
  organization_id: string;
  enabled: boolean;
  deduct_on_order_complete: boolean;
  deduct_on_order_paid: boolean;
  allow_negative_stock: boolean;
  send_low_stock_alerts: boolean;
  reconciliation_frequency: 'daily' | 'weekly' | 'monthly';
}

export const CONFIG_DEFAULTS: Omit<AutoDeductConfig, 'organization_id'> = {
  enabled: false,
  deduct_on_order_complete: false,
  deduct_on_order_paid: false,
  allow_negative_stock: false,
  send_low_stock_alerts: false,
  reconciliation_frequency: 'weekly',
};

/**
 * Configuracion del descuento automatico, persistida en una fila de `settings`
 * (category=inventory, key=auto_deduct).
 *
 * Vivia dentro de InventoryAutomationService, que pasaba de 700 lineas contra
 * la guia de 500 del CLAUDE.md. Esto no es mecanica de descuento: es serializar
 * y validar una fila de ajustes, y se lee tanto desde el controller como desde
 * el propio servicio. Separarlo deja las dos cosas mas cortas y hace testeable
 * por su cuenta la normalizacion del JSON almacenado.
 *
 * `enabled` es false por defecto a proposito: para un tenant real, activar el
 * descuento automatico tiene que ser una decision explicita.
 */
@Injectable()
export class AutoDeductConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(organizationId: string): Promise<AutoDeductConfig> {
    const setting = await this.prisma.setting.findUnique({
      where: {
        organizationId_category_key: {
          organizationId,
          category: SETTING_CATEGORY,
          key: SETTING_KEY,
        },
      },
    });

    const stored: Record<string, unknown> =
      setting?.value &&
      typeof setting.value === 'object' &&
      !Array.isArray(setting.value)
        ? (setting.value as Record<string, unknown>)
        : {};

    const flag = (key: keyof typeof CONFIG_DEFAULTS) =>
      stored[key] === undefined
        ? (CONFIG_DEFAULTS[key] as boolean)
        : Boolean(stored[key]);

    const frequency = String(stored.reconciliation_frequency ?? '');

    // `organization_id` always comes from the JWT, never from the stored JSON.
    return {
      organization_id: organizationId,
      enabled: flag('enabled'),
      deduct_on_order_complete: flag('deduct_on_order_complete'),
      deduct_on_order_paid: flag('deduct_on_order_paid'),
      allow_negative_stock: flag('allow_negative_stock'),
      send_low_stock_alerts: flag('send_low_stock_alerts'),
      reconciliation_frequency: ['daily', 'weekly', 'monthly'].includes(
        frequency,
      )
        ? (frequency as AutoDeductConfig['reconciliation_frequency'])
        : CONFIG_DEFAULTS.reconciliation_frequency,
    };
  }

  async updateConfig(
    organizationId: string,
    patch: Partial<AutoDeductConfig>,
    updatedBy?: string,
  ): Promise<AutoDeductConfig> {
    const current = await this.getConfig(organizationId);
    const next: AutoDeductConfig = { ...current };

    for (const key of Object.keys(
      CONFIG_DEFAULTS,
    ) as (keyof typeof CONFIG_DEFAULTS)[]) {
      const value = (patch as Record<string, unknown>)[key];
      if (value === undefined) continue;
      if (key === 'reconciliation_frequency') {
        if (!['daily', 'weekly', 'monthly'].includes(String(value))) {
          throw new BadRequestException(
            `reconciliation_frequency must be daily, weekly or monthly`,
          );
        }
        next.reconciliation_frequency =
          value as AutoDeductConfig['reconciliation_frequency'];
      } else {
        (next as unknown as Record<string, boolean>)[key] = Boolean(value);
      }
    }

    const { organization_id: _ignored, ...persisted } = next;

    await this.prisma.setting.upsert({
      where: {
        organizationId_category_key: {
          organizationId,
          category: SETTING_CATEGORY,
          key: SETTING_KEY,
        },
      },
      create: {
        organizationId,
        category: SETTING_CATEGORY,
        key: SETTING_KEY,
        type: 'json',
        value: persisted as unknown as Prisma.InputJsonValue,
        defaultValue: CONFIG_DEFAULTS as unknown as Prisma.InputJsonValue,
        description: 'Recipe-driven automatic stock deduction',
        createdBy: updatedBy,
        updatedBy,
      },
      update: {
        value: persisted as unknown as Prisma.InputJsonValue,
        updatedBy,
      },
    });

    return next;
  }
}
