import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WasteService } from '../waste.service';
import {
  WasteCategory,
  WasteReason,
  DisposalMethod,
  SustainabilityMetricType,
} from '../interfaces/waste.interface';
import {
  CreateWasteLogDto,
  UpdateWasteLogDto,
  CreateSustainabilityMetricDto,
  CreateSustainabilityTargetDto,
  QueryWasteLogsDto,
} from '../dto';

describe('WasteService', () => {
  let service: WasteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WasteService],
    }).compile();

    service = module.get<WasteService>(WasteService);
    
    // Clear maps before each test
    (service as any).wasteLogs.clear();
    (service as any).metrics.clear();
    (service as any).targets.clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * ==================== WASTE LOGS ====================
   */

  describe('createWasteLog', () => {
    it('should create a waste log with all fields', async () => {
      const dto: CreateWasteLogDto = {
        organization_id: 'org-1',
        location_id: 'loc-1',
        inventory_item_id: 'inv-1',
        item_name: 'Leche vencida',
        category: WasteCategory.FOOD,
        reason: WasteReason.EXPIRED,
        quantity: 2,
        unit: 'kg',
        cost_per_unit: 50,
        disposal_method: DisposalMethod.COMPOST,
        recorded_by: 'user-1',
        notes: 'Vencida hace 2 días',
      };

      const result = await service.createWasteLog(dto);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^waste-/);
      expect(result.organization_id).toBe('org-1');
      expect(result.item_name).toBe('Leche vencida');
      expect(result.category).toBe(WasteCategory.FOOD);
      expect(result.total_cost).toBe(100); // 2 * 50
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create waste log without total cost if cost_per_unit not provided', async () => {
      const dto: CreateWasteLogDto = {
        organization_id: 'org-1',
        item_name: 'Servilletas',
        category: WasteCategory.PAPER,
        reason: WasteReason.DAMAGED,
        quantity: 10,
        unit: 'packs',
        disposal_method: DisposalMethod.RECYCLING,
        recorded_by: 'user-1',
      };

      const result = await service.createWasteLog(dto);

      expect(result.total_cost).toBeUndefined();
    });

    it('should create waste log with product_id instead of inventory_item_id', async () => {
      const dto: CreateWasteLogDto = {
        organization_id: 'org-1',
        product_id: 'prod-1',
        item_name: 'Cappuccino',
        category: WasteCategory.BEVERAGE,
        reason: WasteReason.PREPARATION_ERROR,
        quantity: 1,
        unit: 'cup',
        disposal_method: DisposalMethod.TRASH,
        recorded_by: 'user-1',
      };

      const result = await service.createWasteLog(dto);

      expect(result.product_id).toBe('prod-1');
      expect(result.inventory_item_id).toBeUndefined();
    });
  });

  describe('findAllWasteLogs', () => {
    beforeEach(async () => {
      await service.createWasteLog({
        organization_id: 'org-1',
        item_name: 'Item 1',
        category: WasteCategory.FOOD,
        reason: WasteReason.EXPIRED,
        quantity: 1,
        unit: 'kg',
        disposal_method: DisposalMethod.TRASH,
        recorded_by: 'user-1',
      });
      await service.createWasteLog({
        organization_id: 'org-2',
        item_name: 'Item 2',
        category: WasteCategory.PLASTIC,
        reason: WasteReason.DAMAGED,
        quantity: 2,
        unit: 'kg',
        disposal_method: DisposalMethod.RECYCLING,
        recorded_by: 'user-2',
      });
    });

    it('should return all waste logs', async () => {
      const logs = await service.findAllWasteLogs();
      expect(logs).toHaveLength(2);
    });

    it('should filter by organization_id', async () => {
      const logs = await service.findAllWasteLogs({ organization_id: 'org-1' });
      expect(logs).toHaveLength(1);
      expect(logs[0].organization_id).toBe('org-1');
    });

    it('should filter by category', async () => {
      const logs = await service.findAllWasteLogs({ category: WasteCategory.PLASTIC });
      expect(logs).toHaveLength(1);
      expect(logs[0].category).toBe(WasteCategory.PLASTIC);
    });

    it('should filter by reason', async () => {
      const logs = await service.findAllWasteLogs({ reason: WasteReason.EXPIRED });
      expect(logs).toHaveLength(1);
      expect(logs[0].reason).toBe(WasteReason.EXPIRED);
    });

    it('should filter by disposal_method', async () => {
      const logs = await service.findAllWasteLogs({
        disposal_method: DisposalMethod.RECYCLING,
      });
      expect(logs).toHaveLength(1);
      expect(logs[0].disposal_method).toBe(DisposalMethod.RECYCLING);
    });

    it('should return logs sorted by created_at desc', async () => {
      const logs = await service.findAllWasteLogs();
      expect(logs[0].created_at.getTime()).toBeGreaterThanOrEqual(
        logs[1].created_at.getTime(),
      );
    });
  });

  describe('findWasteLogById', () => {
    it('should return waste log by id', async () => {
      const created = await service.createWasteLog({
        organization_id: 'org-1',
        item_name: 'Test',
        category: WasteCategory.FOOD,
        reason: WasteReason.EXPIRED,
        quantity: 1,
        unit: 'kg',
        disposal_method: DisposalMethod.TRASH,
        recorded_by: 'user-1',
      });

      const found = await service.findWasteLogById(created.id);
      expect(found).toEqual(created);
    });

    it('should throw NotFoundException if waste log not found', async () => {
      await expect(service.findWasteLogById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateWasteLog', () => {
    it('should update waste log', async () => {
      const created = await service.createWasteLog({
        organization_id: 'org-1',
        item_name: 'Original',
        category: WasteCategory.FOOD,
        reason: WasteReason.EXPIRED,
        quantity: 1,
        unit: 'kg',
        disposal_method: DisposalMethod.TRASH,
        recorded_by: 'user-1',
      });

      const updated = await service.updateWasteLog(created.id, {
        notes: 'Updated notes',
      });

      expect(updated.notes).toBe('Updated notes');
      expect(updated.item_name).toBe('Original');
    });

    it('should recalculate total_cost when quantity changes', async () => {
      const created = await service.createWasteLog({
        organization_id: 'org-1',
        item_name: 'Test',
        category: WasteCategory.FOOD,
        reason: WasteReason.EXPIRED,
        quantity: 2,
        unit: 'kg',
        cost_per_unit: 50,
        disposal_method: DisposalMethod.TRASH,
        recorded_by: 'user-1',
      });

      expect(created.total_cost).toBe(100);

      const updated = await service.updateWasteLog(created.id, {
        quantity: 3,
      });

      expect(updated.total_cost).toBe(150);
    });

    it('should recalculate total_cost when cost_per_unit changes', async () => {
      const created = await service.createWasteLog({
        organization_id: 'org-1',
        item_name: 'Test',
        category: WasteCategory.FOOD,
        reason: WasteReason.EXPIRED,
        quantity: 2,
        unit: 'kg',
        cost_per_unit: 50,
        disposal_method: DisposalMethod.TRASH,
        recorded_by: 'user-1',
      });

      const updated = await service.updateWasteLog(created.id, {
        cost_per_unit: 75,
      });

      expect(updated.total_cost).toBe(150);
    });

    it('should throw NotFoundException if waste log not found', async () => {
      await expect(
        service.updateWasteLog('invalid-id', { notes: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteWasteLog', () => {
    it('should delete waste log', async () => {
      const created = await service.createWasteLog({
        organization_id: 'org-1',
        item_name: 'Test',
        category: WasteCategory.FOOD,
        reason: WasteReason.EXPIRED,
        quantity: 1,
        unit: 'kg',
        disposal_method: DisposalMethod.TRASH,
        recorded_by: 'user-1',
      });

      await service.deleteWasteLog(created.id);

      await expect(service.findWasteLogById(created.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if waste log not found', async () => {
      await expect(service.deleteWasteLog('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getWasteStats', () => {
    beforeEach(async () => {
      // Create multiple waste logs
      await service.createWasteLog({
        organization_id: 'org-1',
        item_name: 'Milk',
        category: WasteCategory.FOOD,
        reason: WasteReason.EXPIRED,
        quantity: 2,
        unit: 'kg',
        cost_per_unit: 50,
        disposal_method: DisposalMethod.COMPOST,
        recorded_by: 'user-1',
      });
      await service.createWasteLog({
        organization_id: 'org-1',
        item_name: 'Coffee beans',
        category: WasteCategory.FOOD,
        reason: WasteReason.QUALITY_ISSUE,
        quantity: 1,
        unit: 'kg',
        cost_per_unit: 200,
        disposal_method: DisposalMethod.TRASH,
        recorded_by: 'user-1',
      });
      await service.createWasteLog({
        organization_id: 'org-1',
        item_name: 'Plastic cups',
        category: WasteCategory.PLASTIC,
        reason: WasteReason.DAMAGED,
        quantity: 50,
        unit: 'units',
        cost_per_unit: 2,
        disposal_method: DisposalMethod.RECYCLING,
        recorded_by: 'user-1',
      });
    });

    it('should calculate comprehensive waste stats', async () => {
      const stats = await service.getWasteStats('org-1');

      expect(stats.total_logs).toBe(3);
      expect(stats.total_cost).toBe(400); // 100 + 200 + 100
      expect(stats.total_weight_kg).toBe(3); // only kg units counted
      expect(stats.by_category[WasteCategory.FOOD]).toBe(2);
      expect(stats.by_category[WasteCategory.PLASTIC]).toBe(1);
      expect(stats.by_reason[WasteReason.EXPIRED]).toBe(1);
      expect(stats.by_disposal[DisposalMethod.COMPOST]).toBe(1);
      expect(stats.top_items).toHaveLength(3);
      expect(stats.top_items[0].item_name).toBe('Coffee beans'); // highest cost
    });

    it('should return empty stats for organization with no logs', async () => {
      const stats = await service.getWasteStats('org-2');
      expect(stats.total_logs).toBe(0);
      expect(stats.total_cost).toBe(0);
    });
  });

  /**
   * ==================== SUSTAINABILITY METRICS ====================
   */

  describe('createMetric', () => {
    it('should create a sustainability metric', async () => {
      const dto: CreateSustainabilityMetricDto = {
        organization_id: 'org-1',
        metric_type: SustainabilityMetricType.CARBON_FOOTPRINT,
        value: 125.5,
        unit: 'kg CO2e',
        period_start: new Date('2024-01-01'),
        period_end: new Date('2024-01-31'),
        notes: 'Monthly calculation',
        source: 'calculated',
      };

      const result = await service.createMetric(dto);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^metric-/);
      expect(result.metric_type).toBe(SustainabilityMetricType.CARBON_FOOTPRINT);
      expect(result.value).toBe(125.5);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create metric with location_id', async () => {
      const dto: CreateSustainabilityMetricDto = {
        organization_id: 'org-1',
        location_id: 'loc-1',
        metric_type: SustainabilityMetricType.WATER_USAGE,
        value: 5000,
        unit: 'liters',
        period_start: new Date('2024-01-01'),
        period_end: new Date('2024-01-31'),
      };

      const result = await service.createMetric(dto);
      expect(result.location_id).toBe('loc-1');
    });
  });

  describe('findAllMetrics', () => {
    beforeEach(async () => {
      await service.createMetric({
        organization_id: 'org-1',
        metric_type: SustainabilityMetricType.CARBON_FOOTPRINT,
        value: 100,
        unit: 'kg CO2e',
        period_start: new Date('2024-01-01'),
        period_end: new Date('2024-01-31'),
      });
      await service.createMetric({
        organization_id: 'org-2',
        metric_type: SustainabilityMetricType.WATER_USAGE,
        value: 5000,
        unit: 'liters',
        period_start: new Date('2024-01-01'),
        period_end: new Date('2024-01-31'),
      });
    });

    it('should return all metrics', async () => {
      const metrics = await service.findAllMetrics();
      expect(metrics).toHaveLength(2);
    });

    it('should filter by organization_id', async () => {
      const metrics = await service.findAllMetrics('org-1');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].organization_id).toBe('org-1');
    });

    it('should filter by metric_type', async () => {
      const metrics = await service.findAllMetrics(
        undefined,
        SustainabilityMetricType.WATER_USAGE,
      );
      expect(metrics).toHaveLength(1);
      expect(metrics[0].metric_type).toBe(SustainabilityMetricType.WATER_USAGE);
    });
  });

  describe('findMetricById', () => {
    it('should return metric by id', async () => {
      const created = await service.createMetric({
        organization_id: 'org-1',
        metric_type: SustainabilityMetricType.CARBON_FOOTPRINT,
        value: 100,
        unit: 'kg CO2e',
        period_start: new Date('2024-01-01'),
        period_end: new Date('2024-01-31'),
      });

      const found = await service.findMetricById(created.id);
      expect(found).toEqual(created);
    });

    it('should throw NotFoundException if metric not found', async () => {
      await expect(service.findMetricById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  /**
   * ==================== SUSTAINABILITY TARGETS ====================
   */

  describe('createTarget', () => {
    it('should create a sustainability target', async () => {
      const dto: CreateSustainabilityTargetDto = {
        organization_id: 'org-1',
        metric_type: SustainabilityMetricType.RECYCLING_RATE,
        target_value: 75,
        unit: '%',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        description: 'Achieve 75% recycling rate by end of year',
      };

      const result = await service.createTarget(dto);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^target-/);
      expect(result.target_value).toBe(75);
      expect(result.is_active).toBe(true);
      expect(result.achieved).toBe(false);
    });

    it('should set is_active to false if specified', async () => {
      const dto: CreateSustainabilityTargetDto = {
        organization_id: 'org-1',
        metric_type: SustainabilityMetricType.RECYCLING_RATE,
        target_value: 75,
        unit: '%',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        is_active: false,
      };

      const result = await service.createTarget(dto);
      expect(result.is_active).toBe(false);
    });
  });

  describe('findAllTargets', () => {
    beforeEach(async () => {
      await service.createTarget({
        organization_id: 'org-1',
        metric_type: SustainabilityMetricType.RECYCLING_RATE,
        target_value: 75,
        unit: '%',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        is_active: true,
      });
      await service.createTarget({
        organization_id: 'org-2',
        metric_type: SustainabilityMetricType.WASTE_GENERATED,
        target_value: 50,
        unit: 'kg',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        is_active: false,
      });
    });

    it('should return all targets', async () => {
      const targets = await service.findAllTargets();
      expect(targets).toHaveLength(2);
    });

    it('should filter by organization_id', async () => {
      const targets = await service.findAllTargets('org-1');
      expect(targets).toHaveLength(1);
      expect(targets[0].organization_id).toBe('org-1');
    });

    it('should filter by is_active', async () => {
      const targets = await service.findAllTargets(undefined, true);
      expect(targets).toHaveLength(1);
      expect(targets[0].is_active).toBe(true);
    });
  });

  describe('findTargetById', () => {
    it('should return target by id', async () => {
      const created = await service.createTarget({
        organization_id: 'org-1',
        metric_type: SustainabilityMetricType.RECYCLING_RATE,
        target_value: 75,
        unit: '%',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
      });

      const found = await service.findTargetById(created.id);
      expect(found).toEqual(created);
    });

    it('should throw NotFoundException if target not found', async () => {
      await expect(service.findTargetById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateTargetProgress', () => {
    it('should update target progress and not mark as achieved if below target', async () => {
      const created = await service.createTarget({
        organization_id: 'org-1',
        metric_type: SustainabilityMetricType.RECYCLING_RATE,
        target_value: 75,
        unit: '%',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
      });

      const updated = await service.updateTargetProgress(created.id, 50);

      expect(updated.current_value).toBe(50);
      expect(updated.achieved).toBe(false);
      expect(updated.achieved_at).toBeUndefined();
    });

    it('should mark target as achieved when reaching target_value', async () => {
      const created = await service.createTarget({
        organization_id: 'org-1',
        metric_type: SustainabilityMetricType.RECYCLING_RATE,
        target_value: 75,
        unit: '%',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
      });

      const updated = await service.updateTargetProgress(created.id, 80);

      expect(updated.current_value).toBe(80);
      expect(updated.achieved).toBe(true);
      expect(updated.achieved_at).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if target not found', async () => {
      await expect(
        service.updateTargetProgress('invalid-id', 50),
      ).rejects.toThrow(NotFoundException);
    });
  });

  /**
   * ==================== REPORTS ====================
   */

  describe('generateSustainabilityReport', () => {
    beforeEach(async () => {
      // Create metrics for current period
      await service.createMetric({
        organization_id: 'org-1',
        metric_type: SustainabilityMetricType.CARBON_FOOTPRINT,
        value: 100,
        unit: 'kg CO2e',
        period_start: new Date('2024-01-01'),
        period_end: new Date('2024-01-31'),
      });
      await service.createMetric({
        organization_id: 'org-1',
        metric_type: SustainabilityMetricType.WATER_USAGE,
        value: 5000,
        unit: 'liters',
        period_start: new Date('2024-01-01'),
        period_end: new Date('2024-01-31'),
      });
      await service.createMetric({
        organization_id: 'org-1',
        metric_type: SustainabilityMetricType.RECYCLING_RATE,
        value: 65,
        unit: '%',
        period_start: new Date('2024-01-01'),
        period_end: new Date('2024-01-31'),
      });

      // Create metrics for previous period (for comparison)
      // Previous period is Dec 2-31 (same length as Jan 1-31)
      await service.createMetric({
        organization_id: 'org-1',
        metric_type: SustainabilityMetricType.CARBON_FOOTPRINT,
        value: 120,
        unit: 'kg CO2e',
        period_start: new Date('2023-12-02'),
        period_end: new Date('2024-01-01'),
      });

      // Create targets
      await service.createTarget({
        organization_id: 'org-1',
        metric_type: SustainabilityMetricType.RECYCLING_RATE,
        target_value: 75,
        unit: '%',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
      });

      // Update target progress
      const targets = await service.findAllTargets('org-1', true);
      await service.updateTargetProgress(targets[0].id, 65);
    });

    it('should generate comprehensive sustainability report', async () => {
      const report = await service.generateSustainabilityReport(
        'org-1',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(report).toBeDefined();
      expect(report.organization_id).toBe('org-1');
      expect(report.metrics.carbon_footprint_kg_co2e).toBe(100);
      expect(report.metrics.water_usage_liters).toBe(5000);
      expect(report.metrics.recycling_rate_percentage).toBe(65);
      expect(report.targets_progress).toHaveLength(1);
      expect(report.targets_progress[0].progress_percentage).toBeCloseTo(86.67, 1);
      expect(report.improvements).toBeDefined();
    });

    it('should calculate improvements with trend analysis', async () => {
      const report = await service.generateSustainabilityReport(
        'org-1',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      const carbonImprovement = report.improvements.find(
        (i) => i.metric_type === SustainabilityMetricType.CARBON_FOOTPRINT,
      );
      
      expect(carbonImprovement).toBeDefined();
      expect(carbonImprovement!.change_percentage).toBeCloseTo(-16.67, 1); // (100-120)/120 * 100
      expect(carbonImprovement!.trend).toBe('improving'); // Lower is better for carbon
    });
  });
});
