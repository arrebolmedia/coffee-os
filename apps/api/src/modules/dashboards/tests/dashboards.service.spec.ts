import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DashboardsService } from '../dashboards.service';
import {
  ComparisonType,
  DashboardCategory,
  RefreshInterval,
  WidgetSize,
  WidgetType,
} from '../interfaces/dashboard.interface';
import { CreateDashboardDto } from '../dto/create-dashboard.dto';
import { UpdateDashboardDto } from '../dto/update-dashboard.dto';
import { AddWidgetDto } from '../dto/add-widget.dto';
import { UpdateWidgetDto } from '../dto/update-widget.dto';
import { CreateAlertDto } from '../dto/create-alert.dto';

describe('DashboardsService', () => {
  let service: DashboardsService;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '123e4567-e89b-12d3-a456-426614174001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardsService],
    }).compile();

    service = module.get<DashboardsService>(DashboardsService);
  });

  afterEach(() => {
    // Clear all storage after each test
    service['dashboards'].clear();
    service['alerts'].clear();
    service['favorites'].clear();
    service['snapshots'].clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Dashboard CRUD', () => {
    describe('createDashboard', () => {
      it('should create a new dashboard with all required fields', async () => {
        const dto: CreateDashboardDto = {
          organization_id: mockOrgId,
          name: 'Executive Dashboard',
          description: 'Main executive dashboard',
          category: DashboardCategory.EXECUTIVE,
          widgets: [],
          created_by: mockUserId,
        };

        const result = await service.createDashboard(dto);

        expect(result).toBeDefined();
        expect(result.id).toContain('dashboard-');
        expect(result.name).toBe('Executive Dashboard');
        expect(result.category).toBe(DashboardCategory.EXECUTIVE);
        expect(result.is_active).toBe(true);
        expect(result.created_at).toBeDefined();
      });

      it('should create dashboard with widgets', async () => {
        const dto: CreateDashboardDto = {
          organization_id: mockOrgId,
          name: 'Sales Dashboard',
          category: DashboardCategory.SALES,
          widgets: [
            {
              id: 'widget-1',
              type: WidgetType.KPI,
              title: 'Daily Sales',
              size: WidgetSize.MEDIUM,
              position: { x: 0, y: 0, w: 2, h: 1 },
              data_source: '/api/analytics/sales/daily',
              refresh_interval: RefreshInterval.EVERY_5_MINUTES,
            },
          ],
          created_by: mockUserId,
        };

        const result = await service.createDashboard(dto);
        expect(result.widgets).toHaveLength(1);
        expect(result.widgets[0].type).toBe(WidgetType.KPI);
      });

      it('should create dashboard with optional fields', async () => {
        const dto: CreateDashboardDto = {
          organization_id: mockOrgId,
          name: 'Custom Dashboard',
          category: DashboardCategory.CUSTOM,
          is_template: true,
          is_public: true,
          allowed_roles: ['admin', 'manager'],
          created_by: mockUserId,
        };

        const result = await service.createDashboard(dto);
        expect(result.is_template).toBe(true);
        expect(result.is_public).toBe(true);
        expect(result.allowed_roles).toEqual(['admin', 'manager']);
      });
    });

    describe('findAllDashboards', () => {
      beforeEach(async () => {
        await service.createDashboard({
          organization_id: mockOrgId,
          name: 'Dashboard 1',
          category: DashboardCategory.SALES,
          created_by: mockUserId,
        });

        await service.createDashboard({
          organization_id: mockOrgId,
          name: 'Dashboard 2',
          category: DashboardCategory.OPERATIONS,
          is_template: true,
          created_by: mockUserId,
        });
      });

      it('should return all dashboards without filters', async () => {
        const result = await service.findAllDashboards();
        expect(result.length).toBeGreaterThanOrEqual(2);
      });

      it('should filter dashboards by organization_id', async () => {
        const result = await service.findAllDashboards(mockOrgId);
        expect(result.length).toBeGreaterThanOrEqual(2);
        expect(result.every((d) => d.organization_id === mockOrgId)).toBe(true);
      });

      it('should filter dashboards by category', async () => {
        const result = await service.findAllDashboards(
          undefined,
          DashboardCategory.SALES,
        );
        expect(result.length).toBeGreaterThanOrEqual(1);
        expect(
          result.every((d) => d.category === DashboardCategory.SALES),
        ).toBe(true);
      });

      it('should filter dashboards by is_template', async () => {
        const result = await service.findAllDashboards(
          undefined,
          undefined,
          true,
        );
        expect(result.every((d) => d.is_template === true)).toBe(true);
      });
    });

    describe('findDashboardById', () => {
      it('should return dashboard by id', async () => {
        const created = await service.createDashboard({
          organization_id: mockOrgId,
          name: 'Test Dashboard',
          category: DashboardCategory.SALES,
          created_by: mockUserId,
        });

        const result = await service.findDashboardById(created.id);
        expect(result).toEqual(created);
      });

      it('should throw NotFoundException for non-existent dashboard', async () => {
        await expect(
          service.findDashboardById('non-existent-id'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('updateDashboard', () => {
      it('should update dashboard fields', async () => {
        const created = await service.createDashboard({
          organization_id: mockOrgId,
          name: 'Original Name',
          category: DashboardCategory.SALES,
          created_by: mockUserId,
        });

        await new Promise((resolve) => setTimeout(resolve, 10));

        const updateDto: UpdateDashboardDto = {
          name: 'Updated Name',
          description: 'Updated description',
        };

        const result = await service.updateDashboard(created.id, updateDto);
        expect(result.name).toBe('Updated Name');
        expect(result.description).toBe('Updated description');
        expect(result.updated_at.getTime()).toBeGreaterThan(
          created.updated_at.getTime(),
        );
      });

      it('should throw NotFoundException for non-existent dashboard', async () => {
        await expect(
          service.updateDashboard('non-existent-id', {}),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteDashboard', () => {
      it('should delete dashboard', async () => {
        const created = await service.createDashboard({
          organization_id: mockOrgId,
          name: 'Test Dashboard',
          category: DashboardCategory.SALES,
          created_by: mockUserId,
        });

        await service.deleteDashboard(created.id);

        await expect(service.findDashboardById(created.id)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should throw NotFoundException for non-existent dashboard', async () => {
        await expect(
          service.deleteDashboard('non-existent-id'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('cloneDashboard', () => {
      it('should clone dashboard with new name', async () => {
        const original = await service.createDashboard({
          organization_id: mockOrgId,
          name: 'Original Dashboard',
          category: DashboardCategory.SALES,
          widgets: [
            {
              id: 'widget-1',
              type: WidgetType.KPI,
              title: 'Sales KPI',
              size: WidgetSize.MEDIUM,
              position: { x: 0, y: 0, w: 2, h: 1 },
              data_source: '/api/analytics/sales',
              refresh_interval: RefreshInterval.EVERY_5_MINUTES,
            },
          ],
          created_by: mockUserId,
        });

        const cloned = await service.cloneDashboard(
          original.id,
          'Cloned Dashboard',
          mockUserId,
        );

        expect(cloned.id).not.toBe(original.id);
        expect(cloned.name).toBe('Cloned Dashboard');
        expect(cloned.widgets).toHaveLength(1);
        expect(cloned.is_template).toBe(false);
        expect(cloned.is_public).toBe(false);
      });
    });
  });

  describe('Widget Management', () => {
    let dashboardId: string;

    beforeEach(async () => {
      const dashboard = await service.createDashboard({
        organization_id: mockOrgId,
        name: 'Test Dashboard',
        category: DashboardCategory.OPERATIONS,
        created_by: mockUserId,
      });
      dashboardId = dashboard.id;
    });

    describe('addWidget', () => {
      it('should add widget to dashboard', async () => {
        const dto: AddWidgetDto = {
          dashboard_id: dashboardId,
          widget: {
            id: 'widget-1',
            type: WidgetType.LINE_CHART,
            title: 'Sales Trend',
            size: WidgetSize.LARGE,
            position: { x: 0, y: 0, w: 2, h: 2 },
            data_source: '/api/analytics/sales/trend',
            refresh_interval: RefreshInterval.EVERY_15_MINUTES,
          },
        };

        const result = await service.addWidget(dto);
        expect(result.widgets).toHaveLength(1);
        expect(result.widgets[0].type).toBe(WidgetType.LINE_CHART);
      });

      it('should generate widget ID if not provided', async () => {
        const dto: AddWidgetDto = {
          dashboard_id: dashboardId,
          widget: {
            id: '',
            type: WidgetType.KPI,
            title: 'Test Widget',
            size: WidgetSize.SMALL,
            position: { x: 0, y: 0, w: 1, h: 1 },
            data_source: '/api/test',
            refresh_interval: RefreshInterval.MANUAL,
          },
        };

        const result = await service.addWidget(dto);
        expect(result.widgets[0].id).toContain('widget-');
      });
    });

    describe('updateWidget', () => {
      it('should update widget properties', async () => {
        await service.addWidget({
          dashboard_id: dashboardId,
          widget: {
            id: 'widget-1',
            type: WidgetType.KPI,
            title: 'Original Title',
            size: WidgetSize.SMALL,
            position: { x: 0, y: 0, w: 1, h: 1 },
            data_source: '/api/test',
            refresh_interval: RefreshInterval.MANUAL,
          },
        });

        const dto: UpdateWidgetDto = {
          dashboard_id: dashboardId,
          widget_id: 'widget-1',
          updates: {
            title: 'Updated Title',
            size: WidgetSize.MEDIUM,
          },
        };

        const result = await service.updateWidget(dto);
        const updatedWidget = result.widgets.find((w) => w.id === 'widget-1');
        expect(updatedWidget!.title).toBe('Updated Title');
        expect(updatedWidget!.size).toBe(WidgetSize.MEDIUM);
      });

      it('should throw NotFoundException for non-existent widget', async () => {
        const dto: UpdateWidgetDto = {
          dashboard_id: dashboardId,
          widget_id: 'non-existent-widget',
          updates: { title: 'Test' },
        };

        await expect(service.updateWidget(dto)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('removeWidget', () => {
      it('should remove widget from dashboard', async () => {
        await service.addWidget({
          dashboard_id: dashboardId,
          widget: {
            id: 'widget-1',
            type: WidgetType.KPI,
            title: 'Test Widget',
            size: WidgetSize.SMALL,
            position: { x: 0, y: 0, w: 1, h: 1 },
            data_source: '/api/test',
            refresh_interval: RefreshInterval.MANUAL,
          },
        });

        const result = await service.removeWidget(dashboardId, 'widget-1');
        expect(result.widgets).toHaveLength(0);
      });
    });

    describe('reorderWidgets', () => {
      it('should update widget positions', async () => {
        await service.addWidget({
          dashboard_id: dashboardId,
          widget: {
            id: 'widget-1',
            type: WidgetType.KPI,
            title: 'Widget 1',
            size: WidgetSize.SMALL,
            position: { x: 0, y: 0, w: 1, h: 1 },
            data_source: '/api/test',
            refresh_interval: RefreshInterval.MANUAL,
          },
        });

        const newPositions = [
          {
            id: 'widget-1',
            position: { x: 2, y: 1, w: 1, h: 1 },
          },
        ];

        const result = await service.reorderWidgets(dashboardId, newPositions);
        const widget = result.widgets.find((w) => w.id === 'widget-1');
        expect(widget!.position.x).toBe(2);
        expect(widget!.position.y).toBe(1);
      });
    });
  });

  describe('Dashboard Data', () => {
    it('should get dashboard with widget data', async () => {
      const dashboard = await service.createDashboard({
        organization_id: mockOrgId,
        name: 'Data Dashboard',
        category: DashboardCategory.SALES,
        widgets: [
          {
            id: 'widget-1',
            type: WidgetType.KPI,
            title: 'Sales KPI',
            size: WidgetSize.MEDIUM,
            position: { x: 0, y: 0, w: 2, h: 1 },
            data_source: '/api/analytics/sales',
            refresh_interval: RefreshInterval.REAL_TIME,
            comparison: ComparisonType.PREVIOUS_PERIOD,
          },
        ],
        created_by: mockUserId,
      });

      const result = await service.getDashboardWithData(dashboard.id);

      expect(result.layout).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data['widget-1']).toBeDefined();
      // We no longer emit random values — widget is marked unavailable
      expect(result.data['widget-1'].available).toBe(false);
      expect(result.data['widget-1'].reason).toBe('not_implemented');
      expect(result.data['widget-1'].comparison).toBeDefined();
      expect(result.metadata.last_updated).toBeDefined();
      expect(result.metadata.loading_time_ms).toBeGreaterThanOrEqual(0);
    });

    it('should refresh widget data', async () => {
      const dashboard = await service.createDashboard({
        organization_id: mockOrgId,
        name: 'Test Dashboard',
        category: DashboardCategory.SALES,
        widgets: [
          {
            id: 'widget-1',
            type: WidgetType.LINE_CHART,
            title: 'Sales Trend',
            size: WidgetSize.LARGE,
            position: { x: 0, y: 0, w: 2, h: 2 },
            data_source: '/api/analytics/sales/trend',
            refresh_interval: RefreshInterval.EVERY_MINUTE,
          },
        ],
        created_by: mockUserId,
      });

      const result = await service.refreshWidgetData(dashboard.id, 'widget-1');
      expect(result.widget_id).toBe('widget-1');
      expect(result.type).toBe(WidgetType.LINE_CHART);
      expect(result.series).toBeDefined();
      expect(result.last_updated).toBeDefined();
    });

    it('should generate data for different widget types', async () => {
      const widgetTypes = [
        WidgetType.KPI,
        WidgetType.BAR_CHART,
        WidgetType.PIE_CHART,
        WidgetType.TABLE,
        WidgetType.GAUGE_CHART,
      ];

      for (const type of widgetTypes) {
        const dashboard = await service.createDashboard({
          organization_id: mockOrgId,
          name: `Test ${type}`,
          category: DashboardCategory.SALES,
          widgets: [
            {
              id: `widget-${type}`,
              type,
              title: `Test ${type}`,
              size: WidgetSize.MEDIUM,
              position: { x: 0, y: 0, w: 2, h: 1 },
              data_source: '/api/test',
              refresh_interval: RefreshInterval.MANUAL,
            },
          ],
          created_by: mockUserId,
        });

        const result = await service.getDashboardWithData(dashboard.id);
        expect(result.data[`widget-${type}`]).toBeDefined();
      }
    });
  });

  describe('System KPIs', () => {
    describe('getSystemKPIs', () => {
      it('should return all system KPIs', async () => {
        const result = await service.getSystemKPIs();
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty('code');
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('category');
      });

      it('should filter KPIs by category', async () => {
        const result = await service.getSystemKPIs(DashboardCategory.SALES);
        expect(
          result.every((k) => k.category === DashboardCategory.SALES),
        ).toBe(true);
      });
    });

    describe('getSystemKPIByCode', () => {
      it('should return KPI by code', async () => {
        const result = await service.getSystemKPIByCode('daily_sales');
        expect(result.code).toBe('daily_sales');
        expect(result.name).toBeDefined();
      });

      it('should throw NotFoundException for invalid code', async () => {
        await expect(service.getSystemKPIByCode('invalid_kpi')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('Alerts', () => {
    describe('createAlert', () => {
      it('should create a new alert', async () => {
        const dto: CreateAlertDto = {
          organization_id: mockOrgId,
          name: 'Low Sales Alert',
          description: 'Alert when daily sales drop below threshold',
          kpi_code: 'daily_sales',
          condition: {
            operator: 'less_than',
            value: 1000,
          },
          notification_channels: ['email'],
          recipients: ['manager@example.com'],
          created_by: mockUserId,
        };

        const result = await service.createAlert(dto);
        expect(result.id).toContain('alert-');
        expect(result.name).toBe('Low Sales Alert');
        expect(result.is_active).toBe(true);
        expect(result.trigger_count).toBe(0);
      });

      it('should throw NotFoundException for invalid KPI code', async () => {
        const dto: CreateAlertDto = {
          organization_id: mockOrgId,
          name: 'Test Alert',
          kpi_code: 'invalid_kpi',
          condition: {
            operator: 'less_than',
            value: 100,
          },
          notification_channels: ['email'],
          recipients: ['test@example.com'],
          created_by: mockUserId,
        };

        await expect(service.createAlert(dto)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('findAllAlerts', () => {
      beforeEach(async () => {
        await service.createAlert({
          organization_id: mockOrgId,
          name: 'Alert 1',
          kpi_code: 'daily_sales',
          condition: { operator: 'less_than', value: 1000 },
          notification_channels: ['email'],
          recipients: ['test@example.com'],
          created_by: mockUserId,
        });

        await service.createAlert({
          organization_id: mockOrgId,
          name: 'Alert 2',
          kpi_code: 'average_ticket',
          condition: { operator: 'greater_than', value: 200 },
          notification_channels: ['sms'],
          recipients: ['test@example.com'],
          created_by: mockUserId,
        });
      });

      it('should return all alerts', async () => {
        const result = await service.findAllAlerts();
        expect(result.length).toBeGreaterThanOrEqual(2);
      });

      it('should filter alerts by organization', async () => {
        const result = await service.findAllAlerts(mockOrgId);
        expect(result.every((a) => a.organization_id === mockOrgId)).toBe(true);
      });

      it('should filter alerts by is_active', async () => {
        const result = await service.findAllAlerts(undefined, true);
        expect(result.every((a) => a.is_active === true)).toBe(true);
      });
    });

    describe('deactivateAlert', () => {
      it('should deactivate alert', async () => {
        const alert = await service.createAlert({
          organization_id: mockOrgId,
          name: 'Test Alert',
          kpi_code: 'daily_sales',
          condition: { operator: 'less_than', value: 1000 },
          notification_channels: ['email'],
          recipients: ['test@example.com'],
          created_by: mockUserId,
        });

        const result = await service.deactivateAlert(alert.id);
        expect(result.is_active).toBe(false);
      });
    });

    describe('deleteAlert', () => {
      it('should delete alert', async () => {
        const alert = await service.createAlert({
          organization_id: mockOrgId,
          name: 'Test Alert',
          kpi_code: 'daily_sales',
          condition: { operator: 'less_than', value: 1000 },
          notification_channels: ['email'],
          recipients: ['test@example.com'],
          created_by: mockUserId,
        });

        await service.deleteAlert(alert.id);

        await expect(service.findAlertById(alert.id)).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('Favorites', () => {
    let dashboardId: string;

    beforeEach(async () => {
      const dashboard = await service.createDashboard({
        organization_id: mockOrgId,
        name: 'Test Dashboard',
        category: DashboardCategory.SALES,
        created_by: mockUserId,
      });
      dashboardId = dashboard.id;
    });

    describe('addToFavorites', () => {
      it('should add dashboard to favorites', async () => {
        const result = await service.addToFavorites(mockUserId, dashboardId);
        expect(result.id).toContain('favorite-');
        expect(result.user_id).toBe(mockUserId);
        expect(result.dashboard_id).toBe(dashboardId);
        expect(result.order).toBe(1);
      });
    });

    describe('getUserFavorites', () => {
      it('should return user favorites in order', async () => {
        await service.addToFavorites(mockUserId, dashboardId);

        const result = await service.getUserFavorites(mockUserId);
        expect(result.length).toBe(1);
        expect(result[0].dashboard_id).toBe(dashboardId);
      });
    });

    describe('removeFromFavorites', () => {
      it('should remove favorite', async () => {
        const favorite = await service.addToFavorites(mockUserId, dashboardId);

        await service.removeFromFavorites(favorite.id);

        const favorites = await service.getUserFavorites(mockUserId);
        expect(favorites).toHaveLength(0);
      });
    });
  });

  describe('Snapshots', () => {
    let dashboardId: string;

    beforeEach(async () => {
      const dashboard = await service.createDashboard({
        organization_id: mockOrgId,
        name: 'Test Dashboard',
        category: DashboardCategory.SALES,
        widgets: [
          {
            id: 'widget-1',
            type: WidgetType.KPI,
            title: 'Sales',
            size: WidgetSize.MEDIUM,
            position: { x: 0, y: 0, w: 2, h: 1 },
            data_source: '/api/analytics/sales',
            refresh_interval: RefreshInterval.MANUAL,
          },
        ],
        created_by: mockUserId,
      });
      dashboardId = dashboard.id;
    });

    describe('createSnapshot', () => {
      it('should create snapshot of dashboard', async () => {
        const result = await service.createSnapshot(
          dashboardId,
          mockUserId,
          'End of day snapshot',
        );

        expect(result.id).toContain('snapshot-');
        expect(result.dashboard_id).toBe(dashboardId);
        expect(result.data).toBeDefined();
        expect(result.data.layout).toBeDefined();
        expect(result.notes).toBe('End of day snapshot');
      });
    });

    describe('getDashboardSnapshots', () => {
      it('should return snapshots for dashboard', async () => {
        await service.createSnapshot(dashboardId, mockUserId);
        await service.createSnapshot(dashboardId, mockUserId);

        const result = await service.getDashboardSnapshots(dashboardId);
        expect(result.length).toBe(2);
      });
    });

    describe('getSnapshotById', () => {
      it('should return snapshot by id', async () => {
        const created = await service.createSnapshot(dashboardId, mockUserId);

        const result = await service.getSnapshotById(created.id);
        expect(result).toEqual(created);
      });

      it('should throw NotFoundException for invalid id', async () => {
        await expect(service.getSnapshotById('invalid-id')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await service.createDashboard({
        organization_id: mockOrgId,
        name: 'Dashboard 1',
        category: DashboardCategory.SALES,
        created_by: mockUserId,
      });

      await service.createDashboard({
        organization_id: mockOrgId,
        name: 'Dashboard 2',
        category: DashboardCategory.OPERATIONS,
        widgets: [
          {
            id: 'widget-1',
            type: WidgetType.KPI,
            title: 'Test',
            size: WidgetSize.SMALL,
            position: { x: 0, y: 0, w: 1, h: 1 },
            data_source: '/api/test',
            refresh_interval: RefreshInterval.MANUAL,
          },
          {
            id: 'widget-2',
            type: WidgetType.BAR_CHART,
            title: 'Test',
            size: WidgetSize.MEDIUM,
            position: { x: 1, y: 0, w: 2, h: 1 },
            data_source: '/api/test',
            refresh_interval: RefreshInterval.MANUAL,
          },
        ],
        created_by: mockUserId,
      });
    });

    describe('getDashboardStats', () => {
      it('should return comprehensive statistics', async () => {
        const result = await service.getDashboardStats(mockOrgId);

        expect(result.organization_id).toBe(mockOrgId);
        expect(result.total_dashboards).toBeGreaterThanOrEqual(2);
        expect(result.dashboards_by_category).toBeDefined();
        expect(result.most_used_widgets).toBeDefined();
        expect(result.most_used_widgets.length).toBeGreaterThan(0);
      });

      it('should count dashboards by category', async () => {
        const result = await service.getDashboardStats(mockOrgId);

        expect(result.dashboards_by_category[DashboardCategory.SALES]).toBe(1);
        expect(
          result.dashboards_by_category[DashboardCategory.OPERATIONS],
        ).toBe(1);
      });

      it('should identify most used widgets', async () => {
        const result = await service.getDashboardStats(mockOrgId);

        const kpiWidget = result.most_used_widgets.find(
          (w) => w.type === WidgetType.KPI,
        );
        expect(kpiWidget).toBeDefined();
        expect(kpiWidget!.count).toBeGreaterThan(0);
      });
    });
  });
});
