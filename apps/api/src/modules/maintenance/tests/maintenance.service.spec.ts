import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MaintenanceService } from '../maintenance.service';
import {
  AssetStatus,
  AssetType,
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceType,
} from '../interfaces/maintenance.interface';
import {
  CompleteMaintenanceDto,
  CreateAssetDto,
  CreateMaintenanceRecordDto,
} from '../dto';

describe('MaintenanceService', () => {
  let service: MaintenanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MaintenanceService],
    }).compile();

    service = module.get<MaintenanceService>(MaintenanceService);

    // Clear maps before each test
    (service as any).assets.clear();
    (service as any).maintenanceRecords.clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * ==================== ASSETS ====================
   */

  describe('createAsset', () => {
    it('should create an asset with all fields', async () => {
      const dto: CreateAssetDto = {
        organization_id: 'org-1',
        location_id: 'loc-1',
        name: 'Espresso Machine La Marzocco',
        type: AssetType.ESPRESSO_MACHINE,
        brand: 'La Marzocco',
        model: 'Linea PB',
        serial_number: 'LM123456',
        purchase_date: new Date('2023-01-15'),
        purchase_price: 15000,
        supplier_id: 'sup-1',
        warranty_months: 24,
        useful_life_years: 10,
        depreciation_method: 'straight_line',
        residual_value: 1500,
      };

      const result = await service.createAsset(dto);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^asset-/);
      expect(result.name).toBe('Espresso Machine La Marzocco');
      expect(result.status).toBe(AssetStatus.ACTIVE);
      expect(result.warranty_expires_at).toBeInstanceOf(Date);
      expect(result.current_value).toBeLessThan(15000);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create asset without optional fields', async () => {
      const dto: CreateAssetDto = {
        organization_id: 'org-1',
        name: 'Coffee Grinder',
        type: AssetType.GRINDER,
      };

      const result = await service.createAsset(dto);

      expect(result).toBeDefined();
      expect(result.warranty_expires_at).toBeUndefined();
      expect(result.current_value).toBeUndefined();
    });

    it('should set default status to ACTIVE', async () => {
      const dto: CreateAssetDto = {
        organization_id: 'org-1',
        name: 'Blender',
        type: AssetType.BLENDER,
      };

      const result = await service.createAsset(dto);
      expect(result.status).toBe(AssetStatus.ACTIVE);
    });
  });

  describe('findAllAssets', () => {
    beforeEach(async () => {
      await service.createAsset({
        organization_id: 'org-1',
        location_id: 'loc-1',
        name: 'Asset 1',
        type: AssetType.ESPRESSO_MACHINE,
        status: AssetStatus.ACTIVE,
      });
      await service.createAsset({
        organization_id: 'org-2',
        location_id: 'loc-2',
        name: 'Asset 2',
        type: AssetType.GRINDER,
        status: AssetStatus.MAINTENANCE,
      });
    });

    it('should return all assets', async () => {
      const assets = await service.findAllAssets();
      expect(assets).toHaveLength(2);
    });

    it('should filter by organization_id', async () => {
      const assets = await service.findAllAssets('org-1');
      expect(assets).toHaveLength(1);
      expect(assets[0].organization_id).toBe('org-1');
    });

    it('should filter by location_id', async () => {
      const assets = await service.findAllAssets(undefined, 'loc-1');
      expect(assets).toHaveLength(1);
      expect(assets[0].location_id).toBe('loc-1');
    });

    it('should filter by type', async () => {
      const assets = await service.findAllAssets(
        undefined,
        undefined,
        AssetType.GRINDER,
      );
      expect(assets).toHaveLength(1);
      expect(assets[0].type).toBe(AssetType.GRINDER);
    });

    it('should filter by status', async () => {
      const assets = await service.findAllAssets(
        undefined,
        undefined,
        undefined,
        AssetStatus.MAINTENANCE,
      );
      expect(assets).toHaveLength(1);
      expect(assets[0].status).toBe(AssetStatus.MAINTENANCE);
    });
  });

  describe('findAssetById', () => {
    it('should return asset by id', async () => {
      const created = await service.createAsset({
        organization_id: 'org-1',
        name: 'Test Asset',
        type: AssetType.ESPRESSO_MACHINE,
      });

      const found = await service.findAssetById(created.id);
      expect(found).toEqual(created);
    });

    it('should throw NotFoundException if asset not found', async () => {
      await expect(service.findAssetById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateAsset', () => {
    it('should update asset', async () => {
      const created = await service.createAsset({
        organization_id: 'org-1',
        name: 'Original Name',
        type: AssetType.ESPRESSO_MACHINE,
      });

      const updated = await service.updateAsset(created.id, {
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.type).toBe(AssetType.ESPRESSO_MACHINE);
    });

    it('should recalculate warranty expiration when dates change', async () => {
      // Use local date to avoid timezone issues
      const purchaseDate = new Date(2023, 0, 1); // Jan 1, 2023 in local time
      const created = await service.createAsset({
        organization_id: 'org-1',
        name: 'Test',
        type: AssetType.ESPRESSO_MACHINE,
        purchase_date: purchaseDate,
        warranty_months: 12,
      });

      const updated = await service.updateAsset(created.id, {
        warranty_months: 24,
      });

      expect(updated.warranty_expires_at).toBeDefined();
      // 2023-01-01 + 24 months = 2025-01-01
      const year = updated.warranty_expires_at!.getFullYear();
      const month = updated.warranty_expires_at!.getMonth(); // 0-indexed
      expect(year).toBe(2025);
      expect(month).toBe(0); // January
    });

    it('should recalculate current value when depreciation params change', async () => {
      const created = await service.createAsset({
        organization_id: 'org-1',
        name: 'Test',
        type: AssetType.ESPRESSO_MACHINE,
        purchase_date: new Date('2022-01-01'),
        purchase_price: 10000,
        useful_life_years: 10,
      });

      const updated = await service.updateAsset(created.id, {
        useful_life_years: 5,
      });

      expect(updated.current_value).toBeLessThan(created.current_value!);
    });
  });

  describe('deleteAsset', () => {
    it('should delete asset', async () => {
      const created = await service.createAsset({
        organization_id: 'org-1',
        name: 'Test',
        type: AssetType.ESPRESSO_MACHINE,
      });

      await service.deleteAsset(created.id);

      await expect(service.findAssetById(created.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if asset has maintenance records', async () => {
      const asset = await service.createAsset({
        organization_id: 'org-1',
        name: 'Test',
        type: AssetType.ESPRESSO_MACHINE,
      });

      await service.createMaintenanceRecord({
        organization_id: 'org-1',
        asset_id: asset.id,
        type: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.MEDIUM,
        scheduled_date: new Date(),
        description: 'Test maintenance',
        is_external: false,
      });

      await expect(service.deleteAsset(asset.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  /**
   * ==================== MAINTENANCE RECORDS ====================
   */

  describe('createMaintenanceRecord', () => {
    let assetId: string;

    beforeEach(async () => {
      const asset = await service.createAsset({
        organization_id: 'org-1',
        name: 'Test Asset',
        type: AssetType.ESPRESSO_MACHINE,
      });
      assetId = asset.id;
    });

    it('should create a maintenance record', async () => {
      const dto: CreateMaintenanceRecordDto = {
        organization_id: 'org-1',
        asset_id: assetId,
        type: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.HIGH,
        scheduled_date: new Date('2024-03-01'),
        description: 'Monthly preventive maintenance',
        assigned_to: 'user-1',
        is_external: false,
        recurring_interval_days: 30,
      };

      const result = await service.createMaintenanceRecord(dto);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^maint-/);
      expect(result.status).toBe(MaintenanceStatus.SCHEDULED);
      expect(result.type).toBe(MaintenanceType.PREVENTIVE);
    });

    it('should update asset next_maintenance_date', async () => {
      const scheduled_date = new Date('2024-03-01');
      await service.createMaintenanceRecord({
        organization_id: 'org-1',
        asset_id: assetId,
        type: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.MEDIUM,
        scheduled_date,
        description: 'Test',
        is_external: false,
      });

      const asset = await service.findAssetById(assetId);
      expect(asset.next_maintenance_date).toEqual(scheduled_date);
    });

    it('should throw NotFoundException if asset does not exist', async () => {
      await expect(
        service.createMaintenanceRecord({
          organization_id: 'org-1',
          asset_id: 'invalid-id',
          type: MaintenanceType.PREVENTIVE,
          priority: MaintenancePriority.MEDIUM,
          scheduled_date: new Date(),
          description: 'Test',
          is_external: false,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllMaintenanceRecords', () => {
    let asset1Id: string;
    let asset2Id: string;

    beforeEach(async () => {
      const asset1 = await service.createAsset({
        organization_id: 'org-1',
        name: 'Asset 1',
        type: AssetType.ESPRESSO_MACHINE,
      });
      const asset2 = await service.createAsset({
        organization_id: 'org-2',
        name: 'Asset 2',
        type: AssetType.GRINDER,
      });
      asset1Id = asset1.id;
      asset2Id = asset2.id;

      await service.createMaintenanceRecord({
        organization_id: 'org-1',
        asset_id: asset1Id,
        type: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.MEDIUM,
        scheduled_date: new Date(),
        description: 'Maintenance 1',
        is_external: false,
      });
      await service.createMaintenanceRecord({
        organization_id: 'org-2',
        asset_id: asset2Id,
        type: MaintenanceType.CORRECTIVE,
        priority: MaintenancePriority.HIGH,
        scheduled_date: new Date(),
        description: 'Maintenance 2',
        is_external: true,
        status: MaintenanceStatus.COMPLETED,
      });
    });

    it('should return all maintenance records', async () => {
      const records = await service.findAllMaintenanceRecords();
      expect(records).toHaveLength(2);
    });

    it('should filter by organization_id', async () => {
      const records = await service.findAllMaintenanceRecords('org-1');
      expect(records).toHaveLength(1);
      expect(records[0].organization_id).toBe('org-1');
    });

    it('should filter by asset_id', async () => {
      const records = await service.findAllMaintenanceRecords(
        undefined,
        asset1Id,
      );
      expect(records).toHaveLength(1);
      expect(records[0].asset_id).toBe(asset1Id);
    });

    it('should filter by status', async () => {
      const records = await service.findAllMaintenanceRecords(
        undefined,
        undefined,
        MaintenanceStatus.COMPLETED,
      );
      expect(records).toHaveLength(1);
      expect(records[0].status).toBe(MaintenanceStatus.COMPLETED);
    });
  });

  describe('startMaintenance', () => {
    let recordId: string;
    let assetId: string;

    beforeEach(async () => {
      const asset = await service.createAsset({
        organization_id: 'org-1',
        name: 'Test Asset',
        type: AssetType.ESPRESSO_MACHINE,
      });
      assetId = asset.id;

      const record = await service.createMaintenanceRecord({
        organization_id: 'org-1',
        asset_id: assetId,
        type: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.MEDIUM,
        scheduled_date: new Date(),
        description: 'Test',
        is_external: false,
      });
      recordId = record.id;
    });

    it('should start maintenance', async () => {
      const result = await service.startMaintenance(recordId);

      expect(result.status).toBe(MaintenanceStatus.IN_PROGRESS);
      expect(result.started_at).toBeInstanceOf(Date);
    });

    it('should update asset status to MAINTENANCE', async () => {
      await service.startMaintenance(recordId);

      const asset = await service.findAssetById(assetId);
      expect(asset.status).toBe(AssetStatus.MAINTENANCE);
    });

    it('should throw BadRequestException if not scheduled', async () => {
      await service.startMaintenance(recordId);

      await expect(service.startMaintenance(recordId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('completeMaintenance', () => {
    let recordId: string;
    let assetId: string;

    beforeEach(async () => {
      const asset = await service.createAsset({
        organization_id: 'org-1',
        name: 'Test Asset',
        type: AssetType.ESPRESSO_MACHINE,
      });
      assetId = asset.id;

      const record = await service.createMaintenanceRecord({
        organization_id: 'org-1',
        asset_id: assetId,
        type: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.MEDIUM,
        scheduled_date: new Date(),
        description: 'Test',
        is_external: false,
        recurring_interval_days: 30,
      });
      recordId = record.id;

      await service.startMaintenance(recordId);
    });

    it('should complete maintenance', async () => {
      const dto: CompleteMaintenanceDto = {
        completed_at: new Date(),
        work_performed: 'Cleaned and calibrated',
        parts_replaced: ['O-ring', 'Gasket'],
        performed_by: 'Technician John',
        labor_cost: 100,
        parts_cost: 50,
      };

      const result = await service.completeMaintenance(recordId, dto);

      expect(result.status).toBe(MaintenanceStatus.COMPLETED);
      expect(result.completed_at).toEqual(dto.completed_at);
      expect(result.total_cost).toBe(150);
    });

    it('should update asset status to ACTIVE', async () => {
      await service.completeMaintenance(recordId, {
        completed_at: new Date(),
        work_performed: 'Test',
      });

      const asset = await service.findAssetById(assetId);
      expect(asset.status).toBe(AssetStatus.ACTIVE);
      expect(asset.last_maintenance_date).toBeInstanceOf(Date);
    });

    it('should set next_maintenance_date from recurring_interval_days', async () => {
      const completed_at = new Date('2024-01-15');
      await service.completeMaintenance(recordId, {
        completed_at,
        work_performed: 'Test',
      });

      const asset = await service.findAssetById(assetId);
      expect(asset.next_maintenance_date).toBeInstanceOf(Date);
      // 2024-01-15 + 30 days = 2024-02-14
      const expectedDate = new Date('2024-01-15');
      expectedDate.setDate(expectedDate.getDate() + 30);
      expect(asset.next_maintenance_date!.getDate()).toBe(
        expectedDate.getDate(),
      );
    });

    it('should throw BadRequestException if not in progress', async () => {
      await service.completeMaintenance(recordId, {
        completed_at: new Date(),
        work_performed: 'Test',
      });

      await expect(
        service.completeMaintenance(recordId, {
          completed_at: new Date(),
          work_performed: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelMaintenance', () => {
    let recordId: string;

    beforeEach(async () => {
      const asset = await service.createAsset({
        organization_id: 'org-1',
        name: 'Test Asset',
        type: AssetType.ESPRESSO_MACHINE,
      });

      const record = await service.createMaintenanceRecord({
        organization_id: 'org-1',
        asset_id: asset.id,
        type: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.MEDIUM,
        scheduled_date: new Date(),
        description: 'Test',
        is_external: false,
      });
      recordId = record.id;
    });

    it('should cancel maintenance', async () => {
      const result = await service.cancelMaintenance(
        recordId,
        'Equipment not available',
      );

      expect(result.status).toBe(MaintenanceStatus.CANCELLED);
      expect(result.notes).toContain('Equipment not available');
    });

    it('should throw BadRequestException if already completed', async () => {
      await service.startMaintenance(recordId);
      await service.completeMaintenance(recordId, {
        completed_at: new Date(),
        work_performed: 'Test',
      });

      await expect(service.cancelMaintenance(recordId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getUpcomingMaintenance', () => {
    beforeEach(async () => {
      const asset = await service.createAsset({
        organization_id: 'org-1',
        name: 'Test',
        type: AssetType.ESPRESSO_MACHINE,
      });

      const now = new Date();
      const in10Days = new Date();
      in10Days.setDate(now.getDate() + 10);
      const in40Days = new Date();
      in40Days.setDate(now.getDate() + 40);

      await service.createMaintenanceRecord({
        organization_id: 'org-1',
        asset_id: asset.id,
        type: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.MEDIUM,
        scheduled_date: in10Days,
        description: 'Soon',
        is_external: false,
      });

      await service.createMaintenanceRecord({
        organization_id: 'org-1',
        asset_id: asset.id,
        type: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.MEDIUM,
        scheduled_date: in40Days,
        description: 'Far',
        is_external: false,
      });
    });

    it('should return maintenance within 30 days', async () => {
      const records = await service.getUpcomingMaintenance('org-1', 30);
      expect(records).toHaveLength(1);
      expect(records[0].description).toBe('Soon');
    });

    it('should return maintenance within custom days', async () => {
      const records = await service.getUpcomingMaintenance('org-1', 50);
      expect(records).toHaveLength(2);
    });
  });

  describe('getOverdueMaintenance', () => {
    beforeEach(async () => {
      const asset = await service.createAsset({
        organization_id: 'org-1',
        name: 'Test',
        type: AssetType.ESPRESSO_MACHINE,
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await service.createMaintenanceRecord({
        organization_id: 'org-1',
        asset_id: asset.id,
        type: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.MEDIUM,
        scheduled_date: yesterday,
        description: 'Overdue',
        is_external: false,
      });

      await service.createMaintenanceRecord({
        organization_id: 'org-1',
        asset_id: asset.id,
        type: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.MEDIUM,
        scheduled_date: tomorrow,
        description: 'Upcoming',
        is_external: false,
      });
    });

    it('should return overdue maintenance', async () => {
      const records = await service.getOverdueMaintenance('org-1');
      expect(records).toHaveLength(1);
      expect(records[0].description).toBe('Overdue');
    });
  });

  describe('getMaintenanceStats', () => {
    beforeEach(async () => {
      const asset1 = await service.createAsset({
        organization_id: 'org-1',
        name: 'Asset 1',
        type: AssetType.ESPRESSO_MACHINE,
        status: AssetStatus.ACTIVE,
        purchase_date: new Date('2023-01-01'),
        warranty_months: 12,
      });

      const asset2 = await service.createAsset({
        organization_id: 'org-1',
        name: 'Asset 2',
        type: AssetType.GRINDER,
        status: AssetStatus.MAINTENANCE,
      });

      await service.createMaintenanceRecord({
        organization_id: 'org-1',
        asset_id: asset1.id,
        type: MaintenanceType.PREVENTIVE,
        priority: MaintenancePriority.MEDIUM,
        scheduled_date: new Date(),
        description: 'Test',
        is_external: false,
      });

      const record2 = await service.createMaintenanceRecord({
        organization_id: 'org-1',
        asset_id: asset2.id,
        type: MaintenanceType.CORRECTIVE,
        priority: MaintenancePriority.HIGH,
        scheduled_date: new Date(),
        description: 'Test',
        is_external: true,
      });

      await service.startMaintenance(record2.id);
      await service.completeMaintenance(record2.id, {
        completed_at: new Date(),
        work_performed: 'Fixed',
        labor_cost: 100,
        parts_cost: 50,
      });
    });

    it('should calculate comprehensive stats', async () => {
      const stats = await service.getMaintenanceStats('org-1');

      expect(stats.total_assets).toBe(2);
      expect(stats.assets_by_type[AssetType.ESPRESSO_MACHINE]).toBe(1);
      expect(stats.assets_by_type[AssetType.GRINDER]).toBe(1);
      expect(stats.assets_by_status[AssetStatus.ACTIVE]).toBe(2);
      expect(stats.total_maintenance_records).toBe(2);
      expect(stats.maintenance_by_type[MaintenanceType.PREVENTIVE]).toBe(1);
      expect(stats.total_cost).toBe(150);
      expect(stats.average_cost_per_maintenance).toBe(75);
    });
  });

  describe('generateDepreciationReport', () => {
    beforeEach(async () => {
      await service.createAsset({
        organization_id: 'org-1',
        name: 'Machine 1',
        type: AssetType.ESPRESSO_MACHINE,
        purchase_date: new Date('2022-01-01'),
        purchase_price: 10000,
        useful_life_years: 10,
        depreciation_method: 'straight_line',
        residual_value: 1000,
      });

      await service.createAsset({
        organization_id: 'org-1',
        name: 'Machine 2',
        type: AssetType.GRINDER,
        purchase_date: new Date('2023-01-01'),
        purchase_price: 5000,
        useful_life_years: 5,
        depreciation_method: 'straight_line',
        residual_value: 500,
      });
    });

    it('should generate depreciation report', async () => {
      const report = await service.generateDepreciationReport(
        'org-1',
        new Date('2024-01-01'),
      );

      expect(report).toBeDefined();
      expect(report.total_assets).toBe(2);
      expect(report.total_purchase_value).toBe(15000);
      expect(report.total_current_value).toBeLessThan(15000);
      expect(report.total_depreciation).toBeGreaterThan(0);
      expect(report.assets).toHaveLength(2);
      expect(report.assets[0].purchase_price).toBeGreaterThanOrEqual(
        report.assets[1].purchase_price,
      );
    });
  });
});
