import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Prisma,
  Asset as PrismaAsset,
  MaintenanceRecord as PrismaMaintenanceRecord,
} from '@prisma/client';
import {
  Asset,
  AssetStatus,
  AssetType,
  DepreciationReport,
  MaintenancePriority,
  MaintenanceRecord,
  MaintenanceStats,
  MaintenanceStatus,
  MaintenanceType,
} from './interfaces/maintenance.interface';
import {
  CompleteMaintenanceDto,
  CreateAssetDto,
  CreateMaintenanceRecordDto,
  UpdateAssetDto,
} from './dto';
import { PrismaService } from '../database/prisma.service';

/**
 * Servicio para gestión de activos y mantenimiento
 *
 * Persistido en Prisma (antes 2 Maps en memoria — los activos, sus registros de
 * mantenimiento y los costos asociados se perdían al reiniciar). Las operaciones
 * que mutan a la vez un registro y su activo se envuelven en `$transaction` para
 * que sean atómicas (el código original no lo era, pero atómico es lo correcto).
 */
@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ==================== MAPPERS ====================
   *
   * Convierten una fila Prisma (camelCase, null para opcionales) a la forma de
   * la interfaz pública (snake_case, undefined para opcionales). Los valores
   * string de los enums se guardan tal cual en la DB ('espresso_machine',
   * 'active', 'preventive', 'scheduled', ...), por eso casteamos las columnas
   * string de vuelta a los tipos enum. Para los arrays (partsReplaced /
   * attachments, columnas String[] con default []) mapeamos un array VACÍO a
   * undefined para conservar la semántica de array opcional del original.
   */
  private toApiAsset(row: PrismaAsset): Asset {
    return {
      id: row.id,
      organization_id: row.organizationId,
      location_id: row.locationId ?? undefined,
      name: row.name,
      type: row.type as AssetType,
      brand: row.brand ?? undefined,
      model: row.model ?? undefined,
      serial_number: row.serialNumber ?? undefined,
      purchase_date: row.purchaseDate ?? undefined,
      purchase_price: row.purchasePrice ?? undefined,
      supplier_id: row.supplierId ?? undefined,
      warranty_months: row.warrantyMonths ?? undefined,
      warranty_expires_at: row.warrantyExpiresAt ?? undefined,
      useful_life_years: row.usefulLifeYears ?? undefined,
      depreciation_method:
        (row.depreciationMethod as
          | 'straight_line'
          | 'declining_balance'
          | null) ?? undefined,
      residual_value: row.residualValue ?? undefined,
      current_value: row.currentValue ?? undefined,
      status: row.status as AssetStatus,
      installation_date: row.installationDate ?? undefined,
      last_maintenance_date: row.lastMaintenanceDate ?? undefined,
      next_maintenance_date: row.nextMaintenanceDate ?? undefined,
      notes: row.notes ?? undefined,
      image_url: row.imageUrl ?? undefined,
      qr_code: row.qrCode ?? undefined,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private toApiRecord(row: PrismaMaintenanceRecord): MaintenanceRecord {
    return {
      id: row.id,
      organization_id: row.organizationId,
      asset_id: row.assetId,
      type: row.type as MaintenanceType,
      status: row.status as MaintenanceStatus,
      priority: row.priority as MaintenancePriority,
      scheduled_date: row.scheduledDate,
      started_at: row.startedAt ?? undefined,
      completed_at: row.completedAt ?? undefined,
      description: row.description,
      work_performed: row.workPerformed ?? undefined,
      parts_replaced:
        row.partsReplaced.length > 0 ? row.partsReplaced : undefined,
      assigned_to: row.assignedTo ?? undefined,
      performed_by: row.performedBy ?? undefined,
      labor_cost: row.laborCost ?? undefined,
      parts_cost: row.partsCost ?? undefined,
      total_cost: row.totalCost ?? undefined,
      is_external: row.isExternal,
      external_provider: row.externalProvider ?? undefined,
      external_invoice: row.externalInvoice ?? undefined,
      next_maintenance_date: row.nextMaintenanceDate ?? undefined,
      recurring_interval_days: row.recurringIntervalDays ?? undefined,
      notes: row.notes ?? undefined,
      attachments: row.attachments.length > 0 ? row.attachments : undefined,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  /**
   * ==================== ASSETS ====================
   */

  /**
   * Crear un activo
   */
  async createAsset(dto: CreateAssetDto): Promise<Asset> {
    // Calculate warranty expiration
    let warranty_expires_at: Date | undefined;
    if (dto.purchase_date && dto.warranty_months) {
      warranty_expires_at = new Date(dto.purchase_date);
      warranty_expires_at.setMonth(
        warranty_expires_at.getMonth() + dto.warranty_months,
      );
    }

    // Calculate initial depreciation
    let current_value = dto.purchase_price;
    if (dto.purchase_price && dto.purchase_date && dto.useful_life_years) {
      current_value = this.calculateCurrentValue(
        dto.purchase_price,
        dto.purchase_date,
        dto.useful_life_years,
        dto.depreciation_method || 'straight_line',
        dto.residual_value || 0,
      );
    }

    const row = await this.prisma.asset.create({
      data: {
        organizationId: dto.organization_id,
        locationId: dto.location_id ?? null,
        name: dto.name,
        type: dto.type,
        brand: dto.brand ?? null,
        model: dto.model ?? null,
        serialNumber: dto.serial_number ?? null,
        purchaseDate: dto.purchase_date ?? null,
        purchasePrice: dto.purchase_price ?? null,
        supplierId: dto.supplier_id ?? null,
        warrantyMonths: dto.warranty_months ?? null,
        warrantyExpiresAt: warranty_expires_at ?? null,
        usefulLifeYears: dto.useful_life_years ?? null,
        depreciationMethod: dto.depreciation_method ?? null,
        residualValue: dto.residual_value ?? null,
        currentValue: current_value ?? null,
        status: dto.status || AssetStatus.ACTIVE,
        installationDate: dto.installation_date ?? null,
        notes: dto.notes ?? null,
        imageUrl: dto.image_url ?? null,
      },
    });

    return this.toApiAsset(row);
  }

  /**
   * Obtener todos los activos (con filtros opcionales)
   */
  async findAllAssets(
    organization_id?: string,
    location_id?: string,
    type?: AssetType,
    status?: AssetStatus,
  ): Promise<Asset[]> {
    const where: Prisma.AssetWhereInput = {};

    if (organization_id) {
      where.organizationId = organization_id;
    }
    if (location_id) {
      where.locationId = location_id;
    }
    if (type) {
      where.type = type;
    }
    if (status) {
      where.status = status;
    }

    const rows = await this.prisma.asset.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return rows.map((row) => this.toApiAsset(row));
  }

  /**
   * Obtener un activo por ID
   */
  async findAssetById(id: string): Promise<Asset> {
    const row = await this.prisma.asset.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }
    return this.toApiAsset(row);
  }

  /**
   * Actualizar un activo
   */
  async updateAsset(id: string, dto: UpdateAssetDto): Promise<Asset> {
    const asset = await this.findAssetById(id);

    // Recalculate warranty if needed
    let warranty_expires_at = asset.warranty_expires_at;
    if (dto.purchase_date !== undefined || dto.warranty_months !== undefined) {
      const purchase_date = dto.purchase_date || asset.purchase_date;
      const warranty_months = dto.warranty_months ?? asset.warranty_months;
      if (purchase_date && warranty_months) {
        warranty_expires_at = new Date(purchase_date);
        warranty_expires_at.setMonth(
          warranty_expires_at.getMonth() + warranty_months,
        );
      }
    }

    // Recalculate depreciation if needed
    let current_value = asset.current_value;
    if (
      dto.purchase_price !== undefined ||
      dto.purchase_date !== undefined ||
      dto.useful_life_years !== undefined ||
      dto.depreciation_method !== undefined ||
      dto.residual_value !== undefined
    ) {
      const purchase_price = dto.purchase_price ?? asset.purchase_price;
      const purchase_date = dto.purchase_date || asset.purchase_date;
      const useful_life_years =
        dto.useful_life_years ?? asset.useful_life_years;
      const depreciation_method =
        dto.depreciation_method || asset.depreciation_method;
      const residual_value = dto.residual_value ?? asset.residual_value ?? 0;

      if (purchase_price && purchase_date && useful_life_years) {
        current_value = this.calculateCurrentValue(
          purchase_price,
          purchase_date,
          useful_life_years,
          depreciation_method || 'straight_line',
          residual_value,
        );
      }
    }

    const data: Prisma.AssetUpdateInput = {
      warrantyExpiresAt: warranty_expires_at ?? null,
      currentValue: current_value ?? null,
    };

    if (dto.organization_id !== undefined)
      data.organizationId = dto.organization_id;
    if (dto.location_id !== undefined) data.locationId = dto.location_id;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.brand !== undefined) data.brand = dto.brand;
    if (dto.model !== undefined) data.model = dto.model;
    if (dto.serial_number !== undefined) data.serialNumber = dto.serial_number;
    if (dto.purchase_date !== undefined) data.purchaseDate = dto.purchase_date;
    if (dto.purchase_price !== undefined)
      data.purchasePrice = dto.purchase_price;
    if (dto.supplier_id !== undefined) data.supplierId = dto.supplier_id;
    if (dto.warranty_months !== undefined)
      data.warrantyMonths = dto.warranty_months;
    if (dto.useful_life_years !== undefined)
      data.usefulLifeYears = dto.useful_life_years;
    if (dto.depreciation_method !== undefined)
      data.depreciationMethod = dto.depreciation_method;
    if (dto.residual_value !== undefined)
      data.residualValue = dto.residual_value;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.installation_date !== undefined)
      data.installationDate = dto.installation_date;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.image_url !== undefined) data.imageUrl = dto.image_url;

    const row = await this.prisma.asset.update({ where: { id }, data });
    return this.toApiAsset(row);
  }

  /**
   * Eliminar un activo
   */
  async deleteAsset(id: string): Promise<void> {
    await this.findAssetById(id);

    // Check if asset has maintenance records (the DB FK is Restrict as a
    // backstop, but we keep the explicit guard for a friendly error).
    const records = await this.findMaintenanceRecordsByAsset(id);
    if (records.length > 0) {
      throw new BadRequestException(
        'Cannot delete asset with existing maintenance records',
      );
    }

    await this.prisma.asset.delete({ where: { id } });
  }

  /**
   * ==================== MAINTENANCE RECORDS ====================
   */

  /**
   * Crear un registro de mantenimiento
   *
   * Cross-entity: crea el registro y actualiza asset.next_maintenance_date.
   * Atómico vía $transaction.
   */
  async createMaintenanceRecord(
    dto: CreateMaintenanceRecordDto,
  ): Promise<MaintenanceRecord> {
    // Verify asset exists
    await this.findAssetById(dto.asset_id);

    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.maintenanceRecord.create({
        data: {
          organizationId: dto.organization_id,
          assetId: dto.asset_id,
          type: dto.type,
          status: dto.status || MaintenanceStatus.SCHEDULED,
          priority: dto.priority,
          scheduledDate: dto.scheduled_date,
          description: dto.description,
          assignedTo: dto.assigned_to ?? null,
          isExternal: dto.is_external,
          externalProvider: dto.external_provider ?? null,
          recurringIntervalDays: dto.recurring_interval_days ?? null,
          notes: dto.notes ?? null,
        },
      });

      // Update asset's next maintenance date
      await tx.asset.update({
        where: { id: dto.asset_id },
        data: { nextMaintenanceDate: dto.scheduled_date },
      });

      return created;
    });

    return this.toApiRecord(row);
  }

  /**
   * Obtener todos los registros de mantenimiento (con filtros)
   */
  async findAllMaintenanceRecords(
    organization_id?: string,
    asset_id?: string,
    status?: MaintenanceStatus,
  ): Promise<MaintenanceRecord[]> {
    const where: Prisma.MaintenanceRecordWhereInput = {};

    if (organization_id) {
      where.organizationId = organization_id;
    }
    if (asset_id) {
      where.assetId = asset_id;
    }
    if (status) {
      where.status = status;
    }

    const rows = await this.prisma.maintenanceRecord.findMany({
      where,
      orderBy: { scheduledDate: 'desc' },
    });

    return rows.map((row) => this.toApiRecord(row));
  }

  /**
   * Obtener registros de mantenimiento por activo
   */
  async findMaintenanceRecordsByAsset(
    asset_id: string,
  ): Promise<MaintenanceRecord[]> {
    return this.findAllMaintenanceRecords(undefined, asset_id);
  }

  /**
   * Obtener un registro de mantenimiento por ID
   */
  async findMaintenanceRecordById(id: string): Promise<MaintenanceRecord> {
    const row = await this.prisma.maintenanceRecord.findUnique({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException(`Maintenance record with ID ${id} not found`);
    }
    return this.toApiRecord(row);
  }

  /**
   * Iniciar un mantenimiento
   *
   * Cross-entity: SCHEDULED -> IN_PROGRESS + asset.status = 'maintenance'.
   * Atómico vía $transaction.
   */
  async startMaintenance(id: string): Promise<MaintenanceRecord> {
    const record = await this.findMaintenanceRecordById(id);

    if (record.status !== MaintenanceStatus.SCHEDULED) {
      throw new BadRequestException(
        'Can only start maintenance that is scheduled',
      );
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRecord.update({
        where: { id },
        data: {
          status: MaintenanceStatus.IN_PROGRESS,
          startedAt: new Date(),
        },
      });

      // Update asset status
      await tx.asset.update({
        where: { id: record.asset_id },
        data: { status: AssetStatus.MAINTENANCE },
      });

      return updated;
    });

    return this.toApiRecord(row);
  }

  /**
   * Completar un mantenimiento
   *
   * Cross-entity: IN_PROGRESS -> COMPLETED (calcula total_cost), pone el activo
   * en 'active', actualiza last_maintenance_date y next_maintenance_date.
   * Atómico vía $transaction.
   */
  async completeMaintenance(
    id: string,
    dto: CompleteMaintenanceDto,
  ): Promise<MaintenanceRecord> {
    const record = await this.findMaintenanceRecordById(id);

    if (record.status !== MaintenanceStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Can only complete maintenance that is in progress',
      );
    }

    // Calculate total cost
    const labor_cost = dto.labor_cost || 0;
    const parts_cost = dto.parts_cost || 0;
    const total_cost = labor_cost + parts_cost;

    // Determine next maintenance date (explicit OR recurring-derived)
    let next_maintenance_date: Date | undefined = dto.next_maintenance_date;
    if (!next_maintenance_date && record.recurring_interval_days) {
      const next = new Date(dto.completed_at);
      next.setDate(next.getDate() + record.recurring_interval_days);
      next_maintenance_date = next;
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRecord.update({
        where: { id },
        data: {
          status: MaintenanceStatus.COMPLETED,
          completedAt: dto.completed_at,
          workPerformed: dto.work_performed,
          partsReplaced: dto.parts_replaced ?? [],
          performedBy: dto.performed_by ?? null,
          laborCost: labor_cost,
          partsCost: parts_cost,
          totalCost: total_cost,
          externalInvoice: dto.external_invoice ?? null,
          nextMaintenanceDate: dto.next_maintenance_date ?? null,
          attachments: dto.attachments ?? [],
        },
      });

      // Update asset
      await tx.asset.update({
        where: { id: record.asset_id },
        data: {
          status: AssetStatus.ACTIVE,
          lastMaintenanceDate: dto.completed_at,
          ...(next_maintenance_date
            ? { nextMaintenanceDate: next_maintenance_date }
            : {}),
        },
      });

      return updated;
    });

    return this.toApiRecord(row);
  }

  /**
   * Cancelar un mantenimiento
   *
   * Cross-entity: -> CANCELLED (+ notes). Si estaba IN_PROGRESS, devuelve el
   * activo a 'active'. Atómico vía $transaction.
   */
  async cancelMaintenance(
    id: string,
    reason?: string,
  ): Promise<MaintenanceRecord> {
    const record = await this.findMaintenanceRecordById(id);

    if (
      record.status === MaintenanceStatus.COMPLETED ||
      record.status === MaintenanceStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot cancel completed or already cancelled maintenance',
      );
    }

    const was_in_progress = record.status === MaintenanceStatus.IN_PROGRESS;
    const notes = reason
      ? `${record.notes || ''}\nCancelled: ${reason}`
      : record.notes;

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRecord.update({
        where: { id },
        data: {
          status: MaintenanceStatus.CANCELLED,
          notes: notes ?? null,
        },
      });

      // Update asset status if it was in maintenance
      if (was_in_progress) {
        await tx.asset.update({
          where: { id: record.asset_id },
          data: { status: AssetStatus.ACTIVE },
        });
      }

      return updated;
    });

    return this.toApiRecord(row);
  }

  /**
   * Obtener mantenimientos próximos (dentro de N días)
   */
  async getUpcomingMaintenance(
    organization_id: string,
    days: number = 30,
  ): Promise<MaintenanceRecord[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const records = await this.findAllMaintenanceRecords(
      organization_id,
      undefined,
      MaintenanceStatus.SCHEDULED,
    );

    return records.filter(
      (record) =>
        record.scheduled_date >= now && record.scheduled_date <= futureDate,
    );
  }

  /**
   * Obtener mantenimientos vencidos
   */
  async getOverdueMaintenance(
    organization_id: string,
  ): Promise<MaintenanceRecord[]> {
    const now = new Date();

    const records = await this.findAllMaintenanceRecords(
      organization_id,
      undefined,
      MaintenanceStatus.SCHEDULED,
    );

    return records.filter((record) => record.scheduled_date < now);
  }

  /**
   * ==================== STATISTICS ====================
   */

  /**
   * Obtener estadísticas de mantenimiento
   */
  async getMaintenanceStats(
    organization_id: string,
  ): Promise<MaintenanceStats> {
    const assets = await this.findAllAssets(organization_id);
    const records = await this.findAllMaintenanceRecords(organization_id);

    // Initialize counters
    const assets_by_type: Record<AssetType, number> = {
      [AssetType.ESPRESSO_MACHINE]: 0,
      [AssetType.GRINDER]: 0,
      [AssetType.BREWER]: 0,
      [AssetType.BLENDER]: 0,
      [AssetType.REFRIGERATOR]: 0,
      [AssetType.FREEZER]: 0,
      [AssetType.OVEN]: 0,
      [AssetType.DISHWASHER]: 0,
      [AssetType.POS_TERMINAL]: 0,
      [AssetType.FURNITURE]: 0,
      [AssetType.VEHICLE]: 0,
      [AssetType.OTHER]: 0,
    };

    const assets_by_status: Record<AssetStatus, number> = {
      [AssetStatus.ACTIVE]: 0,
      [AssetStatus.MAINTENANCE]: 0,
      [AssetStatus.REPAIR]: 0,
      [AssetStatus.RETIRED]: 0,
      [AssetStatus.DISPOSED]: 0,
    };

    const maintenance_by_type: Record<MaintenanceType, number> = {
      [MaintenanceType.PREVENTIVE]: 0,
      [MaintenanceType.CORRECTIVE]: 0,
      [MaintenanceType.INSPECTION]: 0,
      [MaintenanceType.CALIBRATION]: 0,
      [MaintenanceType.CLEANING]: 0,
      [MaintenanceType.UPGRADE]: 0,
    };

    const maintenance_by_status: Record<MaintenanceStatus, number> = {
      [MaintenanceStatus.SCHEDULED]: 0,
      [MaintenanceStatus.IN_PROGRESS]: 0,
      [MaintenanceStatus.COMPLETED]: 0,
      [MaintenanceStatus.CANCELLED]: 0,
      [MaintenanceStatus.OVERDUE]: 0,
    };

    // Count assets
    for (const asset of assets) {
      assets_by_type[asset.type]++;
      assets_by_status[asset.status]++;
    }

    // Count maintenance records and calculate costs
    let total_cost = 0;
    const now = new Date();
    let upcoming_maintenance = 0;
    let overdue_maintenance = 0;

    for (const record of records) {
      maintenance_by_type[record.type]++;

      if (
        record.status === MaintenanceStatus.SCHEDULED &&
        record.scheduled_date < now
      ) {
        maintenance_by_status[MaintenanceStatus.OVERDUE]++;
        overdue_maintenance++;
      } else {
        maintenance_by_status[record.status]++;
      }

      if (record.total_cost) {
        total_cost += record.total_cost;
      }

      // Count upcoming (within 30 days)
      if (
        record.status === MaintenanceStatus.SCHEDULED &&
        record.scheduled_date >= now
      ) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        if (record.scheduled_date <= thirtyDaysFromNow) {
          upcoming_maintenance++;
        }
      }
    }

    // Count warranty stats
    let assets_under_warranty = 0;
    let assets_warranty_expiring_soon = 0;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    for (const asset of assets) {
      if (asset.warranty_expires_at) {
        if (asset.warranty_expires_at > now) {
          assets_under_warranty++;
          if (asset.warranty_expires_at <= thirtyDaysFromNow) {
            assets_warranty_expiring_soon++;
          }
        }
      }
    }

    const average_cost_per_maintenance =
      records.length > 0 ? total_cost / records.length : 0;

    return {
      total_assets: assets.length,
      assets_by_type,
      assets_by_status,
      total_maintenance_records: records.length,
      maintenance_by_type,
      maintenance_by_status,
      upcoming_maintenance,
      overdue_maintenance,
      total_cost,
      average_cost_per_maintenance,
      assets_under_warranty,
      assets_warranty_expiring_soon,
    };
  }

  /**
   * Generar reporte de depreciación
   */
  async generateDepreciationReport(
    organization_id: string,
    as_of_date: Date = new Date(),
  ): Promise<DepreciationReport> {
    const assets = await this.findAllAssets(organization_id);

    let total_purchase_value = 0;
    let total_current_value = 0;
    const asset_details: DepreciationReport['assets'] = [];

    for (const asset of assets) {
      if (
        asset.purchase_price &&
        asset.purchase_date &&
        asset.useful_life_years
      ) {
        const current_value = this.calculateCurrentValue(
          asset.purchase_price,
          asset.purchase_date,
          asset.useful_life_years,
          asset.depreciation_method || 'straight_line',
          asset.residual_value || 0,
          as_of_date,
        );

        const accumulated_depreciation = asset.purchase_price - current_value;
        const depreciation_percentage =
          (accumulated_depreciation / asset.purchase_price) * 100;

        total_purchase_value += asset.purchase_price;
        total_current_value += current_value;

        asset_details.push({
          asset_id: asset.id,
          asset_name: asset.name,
          purchase_date: asset.purchase_date,
          purchase_price: asset.purchase_price,
          current_value,
          accumulated_depreciation,
          depreciation_percentage,
        });
      }
    }

    return {
      organization_id,
      as_of_date,
      total_assets: assets.length,
      total_purchase_value,
      total_current_value,
      total_depreciation: total_purchase_value - total_current_value,
      assets: asset_details.sort((a, b) => b.purchase_price - a.purchase_price),
    };
  }

  /**
   * ==================== HELPERS ====================
   */

  /**
   * Calcular valor actual de un activo con depreciación
   */
  private calculateCurrentValue(
    purchase_price: number,
    purchase_date: Date,
    useful_life_years: number,
    method: 'straight_line' | 'declining_balance',
    residual_value: number,
    as_of_date: Date = new Date(),
  ): number {
    const years_elapsed =
      (as_of_date.getTime() - purchase_date.getTime()) /
      (365.25 * 24 * 60 * 60 * 1000);

    if (years_elapsed >= useful_life_years) {
      return residual_value;
    }

    if (method === 'straight_line') {
      // Straight-line depreciation
      const annual_depreciation =
        (purchase_price - residual_value) / useful_life_years;
      const total_depreciation = annual_depreciation * years_elapsed;
      return Math.max(purchase_price - total_depreciation, residual_value);
    } else {
      // Declining balance (double declining)
      const rate = 2 / useful_life_years;
      let current_value = purchase_price;
      for (let i = 0; i < Math.floor(years_elapsed); i++) {
        current_value = current_value * (1 - rate);
      }
      // Partial year
      const partial_year = years_elapsed - Math.floor(years_elapsed);
      current_value = current_value * (1 - rate * partial_year);
      return Math.max(current_value, residual_value);
    }
  }
}
