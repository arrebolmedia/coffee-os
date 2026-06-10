import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Asset,
  AssetStatus,
  AssetType,
  DepreciationReport,
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

/**
 * Servicio para gestión de activos y mantenimiento
 */
@Injectable()
export class MaintenanceService {
  private assets: Map<string, Asset> = new Map();
  private maintenanceRecords: Map<string, MaintenanceRecord> = new Map();

  /**
   * ==================== ASSETS ====================
   */

  /**
   * Crear un activo
   */
  async createAsset(dto: CreateAssetDto): Promise<Asset> {
    const id = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

    const asset: Asset = {
      id,
      ...dto,
      status: dto.status || AssetStatus.ACTIVE,
      warranty_expires_at,
      current_value,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.assets.set(id, asset);
    return asset;
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
    let assets = Array.from(this.assets.values());

    if (organization_id) {
      assets = assets.filter(
        (asset) => asset.organization_id === organization_id,
      );
    }
    if (location_id) {
      assets = assets.filter((asset) => asset.location_id === location_id);
    }
    if (type) {
      assets = assets.filter((asset) => asset.type === type);
    }
    if (status) {
      assets = assets.filter((asset) => asset.status === status);
    }

    return assets.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Obtener un activo por ID
   */
  async findAssetById(id: string): Promise<Asset> {
    const asset = this.assets.get(id);
    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }
    return asset;
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

    const updated: Asset = {
      ...asset,
      ...dto,
      warranty_expires_at,
      current_value,
      updated_at: new Date(),
    };

    this.assets.set(id, updated);
    return updated;
  }

  /**
   * Eliminar un activo
   */
  async deleteAsset(id: string): Promise<void> {
    await this.findAssetById(id);

    // Check if asset has maintenance records
    const records = await this.findMaintenanceRecordsByAsset(id);
    if (records.length > 0) {
      throw new BadRequestException(
        'Cannot delete asset with existing maintenance records',
      );
    }

    this.assets.delete(id);
  }

  /**
   * ==================== MAINTENANCE RECORDS ====================
   */

  /**
   * Crear un registro de mantenimiento
   */
  async createMaintenanceRecord(
    dto: CreateMaintenanceRecordDto,
  ): Promise<MaintenanceRecord> {
    // Verify asset exists
    await this.findAssetById(dto.asset_id);

    const id = `maint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const record: MaintenanceRecord = {
      id,
      ...dto,
      status: dto.status || MaintenanceStatus.SCHEDULED,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.maintenanceRecords.set(id, record);

    // Update asset's next maintenance date
    const asset = await this.findAssetById(dto.asset_id);
    asset.next_maintenance_date = dto.scheduled_date;
    this.assets.set(asset.id, asset);

    return record;
  }

  /**
   * Obtener todos los registros de mantenimiento (con filtros)
   */
  async findAllMaintenanceRecords(
    organization_id?: string,
    asset_id?: string,
    status?: MaintenanceStatus,
  ): Promise<MaintenanceRecord[]> {
    let records = Array.from(this.maintenanceRecords.values());

    if (organization_id) {
      records = records.filter(
        (record) => record.organization_id === organization_id,
      );
    }
    if (asset_id) {
      records = records.filter((record) => record.asset_id === asset_id);
    }
    if (status) {
      records = records.filter((record) => record.status === status);
    }

    return records.sort(
      (a, b) => b.scheduled_date.getTime() - a.scheduled_date.getTime(),
    );
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
    const record = this.maintenanceRecords.get(id);
    if (!record) {
      throw new NotFoundException(`Maintenance record with ID ${id} not found`);
    }
    return record;
  }

  /**
   * Iniciar un mantenimiento
   */
  async startMaintenance(id: string): Promise<MaintenanceRecord> {
    const record = await this.findMaintenanceRecordById(id);

    if (record.status !== MaintenanceStatus.SCHEDULED) {
      throw new BadRequestException(
        'Can only start maintenance that is scheduled',
      );
    }

    const updated: MaintenanceRecord = {
      ...record,
      status: MaintenanceStatus.IN_PROGRESS,
      started_at: new Date(),
      updated_at: new Date(),
    };

    this.maintenanceRecords.set(id, updated);

    // Update asset status
    const asset = await this.findAssetById(record.asset_id);
    asset.status = AssetStatus.MAINTENANCE;
    this.assets.set(asset.id, asset);

    return updated;
  }

  /**
   * Completar un mantenimiento
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

    const updated: MaintenanceRecord = {
      ...record,
      status: MaintenanceStatus.COMPLETED,
      completed_at: dto.completed_at,
      work_performed: dto.work_performed,
      parts_replaced: dto.parts_replaced,
      performed_by: dto.performed_by,
      labor_cost,
      parts_cost,
      total_cost,
      external_invoice: dto.external_invoice,
      next_maintenance_date: dto.next_maintenance_date,
      attachments: dto.attachments,
      updated_at: new Date(),
    };

    this.maintenanceRecords.set(id, updated);

    // Update asset
    const asset = await this.findAssetById(record.asset_id);
    asset.status = AssetStatus.ACTIVE;
    asset.last_maintenance_date = dto.completed_at;
    if (dto.next_maintenance_date) {
      asset.next_maintenance_date = dto.next_maintenance_date;
    } else if (record.recurring_interval_days) {
      const next = new Date(dto.completed_at);
      next.setDate(next.getDate() + record.recurring_interval_days);
      asset.next_maintenance_date = next;
    }
    this.assets.set(asset.id, asset);

    return updated;
  }

  /**
   * Cancelar un mantenimiento
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

    const updated: MaintenanceRecord = {
      ...record,
      status: MaintenanceStatus.CANCELLED,
      notes: reason
        ? `${record.notes || ''}\nCancelled: ${reason}`
        : record.notes,
      updated_at: new Date(),
    };

    this.maintenanceRecords.set(id, updated);

    // Update asset status if it was in maintenance
    if (record.status === MaintenanceStatus.IN_PROGRESS) {
      const asset = await this.findAssetById(record.asset_id);
      asset.status = AssetStatus.ACTIVE;
      this.assets.set(asset.id, asset);
    }

    return updated;
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
