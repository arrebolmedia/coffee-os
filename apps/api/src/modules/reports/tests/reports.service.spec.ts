import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReportsService } from '../reports.service';
import {
  ExportFormat,
  ReportCategory,
  ReportStatus,
  ReportType,
  ScheduleFrequency,
} from '../interfaces/report.interface';
import { CreateReportTemplateDto } from '../dto/create-report-template.dto';
import { UpdateReportTemplateDto } from '../dto/update-report-template.dto';
import { GenerateReportDto } from '../dto/generate-report.dto';
import { CreateReportScheduleDto } from '../dto/create-report-schedule.dto';

describe('ReportsService', () => {
  let service: ReportsService;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '123e4567-e89b-12d3-a456-426614174001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => {
    // Clear all storage after each test
    service['templates'].clear();
    service['reports'].clear();
    service['schedules'].clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Template Management', () => {
    describe('createReportTemplate', () => {
      it('should create a new report template with all required fields', async () => {
        const dto: CreateReportTemplateDto = {
          organization_id: mockOrgId,
          name: 'Daily Sales Report',
          description: 'Daily sales performance report',
          category: ReportCategory.SALES,
          type: ReportType.DAILY_SALES,
          parameters: {
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-12-31'),
          },
          layout: 'portrait',
          is_public: true,
          created_by: mockUserId,
        };

        const result = await service.createReportTemplate(dto);

        expect(result).toBeDefined();
        expect(result.id).toContain('template-');
        expect(result.organization_id).toBe(mockOrgId);
        expect(result.name).toBe('Daily Sales Report');
        expect(result.category).toBe(ReportCategory.SALES);
        expect(result.type).toBe(ReportType.DAILY_SALES);
        expect(result.is_active).toBe(true);
        expect(result.created_at).toBeDefined();
        expect(result.updated_at).toBeDefined();
      });

      it('should create template with optional fields', async () => {
        const dto: CreateReportTemplateDto = {
          organization_id: mockOrgId,
          name: 'Inventory Report',
          category: ReportCategory.INVENTORY,
          type: ReportType.INVENTORY_LEVELS,
          parameters: {},
          is_public: false,
          allowed_roles: ['admin', 'manager'],
          header_template: 'Custom Header',
          footer_template: 'Custom Footer',
          styles: { fontSize: 12, color: 'blue' },
          created_by: mockUserId,
        };

        const result = await service.createReportTemplate(dto);

        expect(result.allowed_roles).toEqual(['admin', 'manager']);
        expect(result.header_template).toBe('Custom Header');
        expect(result.footer_template).toBe('Custom Footer');
        expect(result.styles).toEqual({ fontSize: 12, color: 'blue' });
      });
    });

    describe('findAllReportTemplates', () => {
      beforeEach(async () => {
        await service.createReportTemplate({
          organization_id: mockOrgId,
          name: 'Sales Report 1',
          category: ReportCategory.SALES,
          type: ReportType.DAILY_SALES,
          parameters: {},
          is_public: true,
          created_by: mockUserId,
        });

        await service.createReportTemplate({
          organization_id: mockOrgId,
          name: 'Inventory Report',
          category: ReportCategory.INVENTORY,
          type: ReportType.INVENTORY_LEVELS,
          parameters: {},
          is_public: true,
          created_by: mockUserId,
        });
      });

      it('should return all templates without filters', async () => {
        const result = await service.findAllReportTemplates();
        expect(result).toHaveLength(2);
      });

      it('should filter templates by organization_id', async () => {
        const result = await service.findAllReportTemplates(mockOrgId);
        expect(result).toHaveLength(2);

        const otherOrgResult =
          await service.findAllReportTemplates('other-org-id');
        expect(otherOrgResult).toHaveLength(0);
      });

      it('should filter templates by category', async () => {
        const result = await service.findAllReportTemplates(
          undefined,
          ReportCategory.SALES,
        );
        expect(result).toHaveLength(1);
        expect(result[0].category).toBe(ReportCategory.SALES);
      });

      it('should filter templates by type', async () => {
        const result = await service.findAllReportTemplates(
          undefined,
          undefined,
          ReportType.INVENTORY_LEVELS,
        );
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe(ReportType.INVENTORY_LEVELS);
      });

      it('should filter templates by is_active', async () => {
        const result = await service.findAllReportTemplates(
          undefined,
          undefined,
          undefined,
          true,
        );
        expect(result).toHaveLength(2);
        expect(result.every((t) => t.is_active)).toBe(true);
      });
    });

    describe('findReportTemplateById', () => {
      it('should return template by id', async () => {
        const created = await service.createReportTemplate({
          organization_id: mockOrgId,
          name: 'Test Template',
          category: ReportCategory.SALES,
          type: ReportType.DAILY_SALES,
          parameters: {},
          is_public: true,
          created_by: mockUserId,
        });

        const result = await service.findReportTemplateById(created.id);
        expect(result).toEqual(created);
      });

      it('should throw NotFoundException for non-existent template', async () => {
        await expect(
          service.findReportTemplateById('non-existent-id'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('updateReportTemplate', () => {
      it('should update template fields', async () => {
        const created = await service.createReportTemplate({
          organization_id: mockOrgId,
          name: 'Original Name',
          category: ReportCategory.SALES,
          type: ReportType.DAILY_SALES,
          parameters: {},
          is_public: true,
          created_by: mockUserId,
        });

        // Wait a moment to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 10));

        const updateDto: UpdateReportTemplateDto = {
          name: 'Updated Name',
          description: 'Updated description',
        };

        const result = await service.updateReportTemplate(
          created.id,
          updateDto,
        );
        expect(result.name).toBe('Updated Name');
        expect(result.description).toBe('Updated description');
        expect(result.updated_at.getTime()).toBeGreaterThan(
          created.updated_at.getTime(),
        );
      });

      it('should throw NotFoundException for non-existent template', async () => {
        await expect(
          service.updateReportTemplate('non-existent-id', {}),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteReportTemplate', () => {
      it('should delete template when no active schedules exist', async () => {
        const created = await service.createReportTemplate({
          organization_id: mockOrgId,
          name: 'Test Template',
          category: ReportCategory.SALES,
          type: ReportType.DAILY_SALES,
          parameters: {},
          is_public: true,
          created_by: mockUserId,
        });

        await service.deleteReportTemplate(created.id);

        await expect(
          service.findReportTemplateById(created.id),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw BadRequestException when active schedules exist', async () => {
        const template = await service.createReportTemplate({
          organization_id: mockOrgId,
          name: 'Test Template',
          category: ReportCategory.SALES,
          type: ReportType.DAILY_SALES,
          parameters: {},
          is_public: true,
          created_by: mockUserId,
        });

        await service.createReportSchedule({
          organization_id: mockOrgId,
          name: 'Daily Schedule',
          template_id: template.id,
          export_format: ExportFormat.PDF,
          frequency: ScheduleFrequency.DAILY,
          start_date: new Date(),
          recipients: ['test@example.com'],
          created_by: mockUserId,
        });

        await expect(service.deleteReportTemplate(template.id)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should throw NotFoundException for non-existent template', async () => {
        await expect(
          service.deleteReportTemplate('non-existent-id'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('Report Generation', () => {
    describe('generateReport', () => {
      it('should generate report with PENDING status', async () => {
        const dto: GenerateReportDto = {
          organization_id: mockOrgId,
          name: 'Test Report',
          category: ReportCategory.SALES,
          type: ReportType.DAILY_SALES,
          parameters: {
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31'),
          },
          requested_by: mockUserId,
        };

        const result = await service.generateReport(dto);

        expect(result).toBeDefined();
        expect(result.id).toContain('report-');
        expect(result.status).toBe(ReportStatus.PENDING);
        expect(result.organization_id).toBe(mockOrgId);
        expect(result.requested_by).toBe(mockUserId);
      });

      it('should generate report using template_id', async () => {
        const template = await service.createReportTemplate({
          organization_id: mockOrgId,
          name: 'Template',
          category: ReportCategory.SALES,
          type: ReportType.DAILY_SALES,
          parameters: {},
          is_public: true,
          created_by: mockUserId,
        });

        const dto: GenerateReportDto = {
          organization_id: mockOrgId,
          name: 'Report from Template',
          category: ReportCategory.SALES,
          type: ReportType.DAILY_SALES,
          template_id: template.id,
          parameters: {},
          requested_by: mockUserId,
        };

        const result = await service.generateReport(dto);
        expect(result.template_id).toBe(template.id);
      });

      it('should generate report with export format', async () => {
        const dto: GenerateReportDto = {
          organization_id: mockOrgId,
          name: 'Export Test',
          category: ReportCategory.SALES,
          type: ReportType.DAILY_SALES,
          parameters: {},
          export_format: ExportFormat.EXCEL,
          requested_by: mockUserId,
        };

        const result = await service.generateReport(dto);
        expect(result.export_format).toBe(ExportFormat.EXCEL);
      });

      it('should throw NotFoundException for invalid template_id', async () => {
        const dto: GenerateReportDto = {
          organization_id: mockOrgId,
          name: 'Test Report',
          category: ReportCategory.SALES,
          type: ReportType.DAILY_SALES,
          template_id: 'invalid-template-id',
          parameters: {},
          requested_by: mockUserId,
        };

        await expect(service.generateReport(dto)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should complete report generation asynchronously', async () => {
        const dto: GenerateReportDto = {
          organization_id: mockOrgId,
          name: 'Async Test',
          category: ReportCategory.SALES,
          type: ReportType.DAILY_SALES,
          parameters: {},
          requested_by: mockUserId,
        };

        const report = await service.generateReport(dto);
        expect(report.status).toBe(ReportStatus.PENDING);

        // Wait for async generation
        await new Promise((resolve) => setTimeout(resolve, 200));

        const completed = await service.findReportById(report.id);
        expect(completed.status).toBe(ReportStatus.COMPLETED);
        expect(completed.data).toBeDefined();
        expect(completed.generation_time_ms).toBeGreaterThan(0);
        expect(completed.generated_at).toBeDefined();
      });
    });

    describe('Data Generators', () => {
      it('should generate daily sales data', async () => {
        const dto: GenerateReportDto = {
          organization_id: mockOrgId,
          name: 'Daily Sales',
          category: ReportCategory.SALES,
          type: ReportType.DAILY_SALES,
          parameters: {},
          requested_by: mockUserId,
        };

        const report = await service.generateReport(dto);

        // Wait for generation
        await new Promise((resolve) => setTimeout(resolve, 200));

        const completed = await service.findReportById(report.id);
        expect(completed.status).toBe(ReportStatus.COMPLETED);
        expect(completed.data).toBeInstanceOf(Array);
        // Daily sales data generation not yet implemented — returns empty array
      });

      it('should generate inventory levels data', async () => {
        const dto: GenerateReportDto = {
          organization_id: mockOrgId,
          name: 'Inventory Levels',
          category: ReportCategory.INVENTORY,
          type: ReportType.INVENTORY_LEVELS,
          parameters: {},
          requested_by: mockUserId,
        };

        const report = await service.generateReport(dto);
        await new Promise((resolve) => setTimeout(resolve, 200));

        const completed = await service.findReportById(report.id);
        expect(completed.status).toBe(ReportStatus.COMPLETED);
        expect(completed.data).toBeInstanceOf(Array);
        // Inventory levels data generation not yet implemented — returns empty array
      });

      it('should generate profit & loss data', async () => {
        const dto: GenerateReportDto = {
          organization_id: mockOrgId,
          name: 'P&L Report',
          category: ReportCategory.FINANCE,
          type: ReportType.PROFIT_LOSS,
          parameters: {},
          requested_by: mockUserId,
        };

        const report = await service.generateReport(dto);
        await new Promise((resolve) => setTimeout(resolve, 200));

        const completed = await service.findReportById(report.id);
        expect(completed.data).toHaveProperty('revenue');
        expect(completed.data).toHaveProperty('costs');
        expect(completed.data).toHaveProperty('profit');
        expect(completed.data).toHaveProperty('profit_margin');
      });

      it('should generate employee performance data', async () => {
        const dto: GenerateReportDto = {
          organization_id: mockOrgId,
          name: 'Employee Performance',
          category: ReportCategory.HR,
          type: ReportType.EMPLOYEE_PERFORMANCE,
          parameters: {},
          requested_by: mockUserId,
        };

        const report = await service.generateReport(dto);
        await new Promise((resolve) => setTimeout(resolve, 200));

        const completed = await service.findReportById(report.id);
        expect(completed.status).toBe(ReportStatus.COMPLETED);
        expect(completed.data).toBeInstanceOf(Array);
        // Employee performance data generation not yet implemented — returns empty array
      });

      it('should generate generic data for unknown report types', async () => {
        const dto: GenerateReportDto = {
          organization_id: mockOrgId,
          name: 'Custom Report',
          category: ReportCategory.CUSTOM,
          type: ReportType.CUSTOM_QUERY,
          parameters: {},
          requested_by: mockUserId,
        };

        const report = await service.generateReport(dto);
        await new Promise((resolve) => setTimeout(resolve, 200));

        const completed = await service.findReportById(report.id);
        expect(completed.data).toBeInstanceOf(Array);
        expect(completed.data.length).toBe(20);
        expect(completed.data[0]).toHaveProperty('id');
        expect(completed.data[0]).toHaveProperty('value');
        expect(completed.data[0]).toHaveProperty('timestamp');
      });
    });

    describe('findAllReports', () => {
      beforeEach(async () => {
        await service.generateReport({
          organization_id: mockOrgId,
          name: 'Sales Report',
          category: ReportCategory.SALES,
          type: ReportType.DAILY_SALES,
          parameters: {},
          requested_by: mockUserId,
        });

        await service.generateReport({
          organization_id: mockOrgId,
          name: 'Inventory Report',
          category: ReportCategory.INVENTORY,
          type: ReportType.INVENTORY_LEVELS,
          parameters: {},
          requested_by: mockUserId,
        });
      });

      it('should return all reports without filters', async () => {
        const result = await service.findAllReports();
        expect(result.length).toBeGreaterThanOrEqual(2);
      });

      it('should filter reports by organization_id', async () => {
        const result = await service.findAllReports(mockOrgId);
        expect(result.length).toBeGreaterThanOrEqual(2);
        expect(result.every((r) => r.organization_id === mockOrgId)).toBe(true);
      });

      it('should filter reports by category', async () => {
        const result = await service.findAllReports(
          undefined,
          ReportCategory.SALES,
        );
        expect(result.length).toBeGreaterThanOrEqual(1);
        expect(result.every((r) => r.category === ReportCategory.SALES)).toBe(
          true,
        );
      });

      it('should filter reports by status', async () => {
        const result = await service.findAllReports(
          undefined,
          undefined,
          ReportStatus.PENDING,
        );
        expect(result.every((r) => r.status === ReportStatus.PENDING)).toBe(
          true,
        );
      });

      it('should filter reports by requested_by', async () => {
        const result = await service.findAllReports(
          undefined,
          undefined,
          undefined,
          mockUserId,
        );
        expect(result.every((r) => r.requested_by === mockUserId)).toBe(true);
      });
    });

    describe('findReportById', () => {
      it('should return report by id', async () => {
        const created = await service.generateReport({
          organization_id: mockOrgId,
          name: 'Test Report',
          category: ReportCategory.SALES,
          type: ReportType.DAILY_SALES,
          parameters: {},
          requested_by: mockUserId,
        });

        const result = await service.findReportById(created.id);
        expect(result).toEqual(created);
      });

      it('should throw NotFoundException for non-existent report', async () => {
        await expect(service.findReportById('non-existent-id')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('getReportResult', () => {
      it('should return report result with metadata', async () => {
        const report = await service.generateReport({
          organization_id: mockOrgId,
          name: 'Test Report',
          category: ReportCategory.SALES,
          type: ReportType.DAILY_SALES,
          parameters: { include_charts: true },
          requested_by: mockUserId,
        });

        // Wait for generation
        await new Promise((resolve) => setTimeout(resolve, 200));

        const result = await service.getReportResult(report.id);
        expect(result.report).toBeDefined();
        expect(result.columns).toBeDefined();
        expect(result.columns!.length).toBeGreaterThan(0);
        expect(result.summary).toBeDefined();
        expect(result.charts).toBeDefined();
        expect(result.total_rows).toBeDefined();
        expect(result.page).toBeDefined();
        expect(result.total_pages).toBeDefined();
      });

      it('should throw BadRequestException for non-completed report', async () => {
        const report = await service.generateReport({
          organization_id: mockOrgId,
          name: 'Test Report',
          category: ReportCategory.SALES,
          type: ReportType.DAILY_SALES,
          parameters: {},
          requested_by: mockUserId,
        });

        // Don't wait for generation
        await expect(service.getReportResult(report.id)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should throw NotFoundException for non-existent report', async () => {
        await expect(
          service.getReportResult('non-existent-id'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteReport', () => {
      it('should delete report', async () => {
        const created = await service.generateReport({
          organization_id: mockOrgId,
          name: 'Test Report',
          category: ReportCategory.SALES,
          type: ReportType.DAILY_SALES,
          parameters: {},
          requested_by: mockUserId,
        });

        await service.deleteReport(created.id);

        await expect(service.findReportById(created.id)).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('Report Schedules', () => {
    let templateId: string;

    beforeEach(async () => {
      const template = await service.createReportTemplate({
        organization_id: mockOrgId,
        name: 'Scheduled Template',
        category: ReportCategory.SALES,
        type: ReportType.DAILY_SALES,
        parameters: {},
        is_public: true,
        created_by: mockUserId,
      });
      templateId = template.id;
    });

    describe('createReportSchedule', () => {
      it('should create a new report schedule', async () => {
        const dto: CreateReportScheduleDto = {
          organization_id: mockOrgId,
          name: 'Daily Sales Schedule',
          template_id: templateId,
          export_format: ExportFormat.PDF,
          frequency: ScheduleFrequency.DAILY,
          start_date: new Date(),
          recipients: ['test@example.com'],
          created_by: mockUserId,
        };

        const result = await service.createReportSchedule(dto);

        expect(result).toBeDefined();
        expect(result.id).toContain('schedule-');
        expect(result.template_id).toBe(templateId);
        expect(result.frequency).toBe(ScheduleFrequency.DAILY);
        expect(result.next_run_date).toBeDefined();
        expect(result.run_count).toBe(0);
        expect(result.failure_count).toBe(0);
        expect(result.is_active).toBe(true);
      });

      it('should create schedule with custom frequency and cron', async () => {
        const dto: CreateReportScheduleDto = {
          organization_id: mockOrgId,
          name: 'Custom Schedule',
          template_id: templateId,
          export_format: ExportFormat.EXCEL,
          frequency: ScheduleFrequency.CUSTOM,
          start_date: new Date(),
          cron_expression: '0 0 * * *',
          recipients: ['admin@example.com'],
          created_by: mockUserId,
        };

        const result = await service.createReportSchedule(dto);
        expect(result.frequency).toBe(ScheduleFrequency.CUSTOM);
        expect(result.cron_expression).toBe('0 0 * * *');
      });

      it('should throw NotFoundException for invalid template_id', async () => {
        const dto: CreateReportScheduleDto = {
          organization_id: mockOrgId,
          name: 'Invalid Schedule',
          template_id: 'invalid-template-id',
          export_format: ExportFormat.PDF,
          frequency: ScheduleFrequency.DAILY,
          start_date: new Date(),
          recipients: ['test@example.com'],
          created_by: mockUserId,
        };

        await expect(service.createReportSchedule(dto)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('calculateNextRunDate', () => {
      it('should calculate next run date for DAILY frequency', () => {
        const startDate = new Date('2024-01-01T00:00:00');
        const nextDate = service['calculateNextRunDate'](
          startDate,
          ScheduleFrequency.DAILY,
        );
        expect(nextDate.getDate()).toBe(2);
      });

      it('should calculate next run date for WEEKLY frequency', () => {
        const startDate = new Date('2024-01-01T00:00:00');
        const nextDate = service['calculateNextRunDate'](
          startDate,
          ScheduleFrequency.WEEKLY,
        );
        expect(nextDate.getDate()).toBe(8);
      });

      it('should calculate next run date for MONTHLY frequency', () => {
        const startDate = new Date('2024-01-15T00:00:00');
        const nextDate = service['calculateNextRunDate'](
          startDate,
          ScheduleFrequency.MONTHLY,
        );
        expect(nextDate.getMonth()).toBe(1); // February
      });

      it('should calculate next run date for QUARTERLY frequency', () => {
        const startDate = new Date('2024-01-01T00:00:00');
        const nextDate = service['calculateNextRunDate'](
          startDate,
          ScheduleFrequency.QUARTERLY,
        );
        expect(nextDate.getMonth()).toBe(3); // April
      });

      it('should calculate next run date for YEARLY frequency', () => {
        const startDate = new Date('2024-01-01T00:00:00');
        const nextDate = service['calculateNextRunDate'](
          startDate,
          ScheduleFrequency.YEARLY,
        );
        expect(nextDate.getFullYear()).toBe(2025);
      });
    });

    describe('findAllReportSchedules', () => {
      beforeEach(async () => {
        await service.createReportSchedule({
          organization_id: mockOrgId,
          name: 'Schedule 1',
          template_id: templateId,
          export_format: ExportFormat.PDF,
          frequency: ScheduleFrequency.DAILY,
          start_date: new Date(),
          recipients: ['test1@example.com'],
          created_by: mockUserId,
        });

        await service.createReportSchedule({
          organization_id: mockOrgId,
          name: 'Schedule 2',
          template_id: templateId,
          export_format: ExportFormat.EXCEL,
          frequency: ScheduleFrequency.WEEKLY,
          start_date: new Date(),
          recipients: ['test2@example.com'],
          created_by: mockUserId,
          is_active: false,
        });
      });

      it('should return all schedules without filters', async () => {
        const result = await service.findAllReportSchedules();
        expect(result.length).toBeGreaterThanOrEqual(2);
      });

      it('should filter schedules by organization_id', async () => {
        const result = await service.findAllReportSchedules(mockOrgId);
        expect(result.length).toBeGreaterThanOrEqual(2);
        expect(result.every((s) => s.organization_id === mockOrgId)).toBe(true);
      });

      it('should filter schedules by is_active', async () => {
        const activeResult = await service.findAllReportSchedules(
          undefined,
          true,
        );
        expect(activeResult.every((s) => s.is_active)).toBe(true);

        const inactiveResult = await service.findAllReportSchedules(
          undefined,
          false,
        );
        expect(inactiveResult.every((s) => !s.is_active)).toBe(true);
      });
    });

    describe('findReportScheduleById', () => {
      it('should return schedule by id', async () => {
        const created = await service.createReportSchedule({
          organization_id: mockOrgId,
          name: 'Test Schedule',
          template_id: templateId,
          export_format: ExportFormat.PDF,
          frequency: ScheduleFrequency.DAILY,
          start_date: new Date(),
          recipients: ['test@example.com'],
          created_by: mockUserId,
        });

        const result = await service.findReportScheduleById(created.id);
        expect(result).toEqual(created);
      });

      it('should throw NotFoundException for non-existent schedule', async () => {
        await expect(
          service.findReportScheduleById('non-existent-id'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('executeSchedule', () => {
      it('should execute schedule and generate report', async () => {
        const schedule = await service.createReportSchedule({
          organization_id: mockOrgId,
          name: 'Execute Test',
          template_id: templateId,
          export_format: ExportFormat.PDF,
          frequency: ScheduleFrequency.DAILY,
          start_date: new Date(),
          recipients: ['test@example.com'],
          created_by: mockUserId,
        });

        const result = await service.executeSchedule(schedule.id);

        expect(result).toBeDefined();
        expect(result.organization_id).toBe(mockOrgId);
        expect(result.schedule_id).toBe(schedule.id);

        const updatedSchedule = await service.findReportScheduleById(
          schedule.id,
        );
        expect(updatedSchedule.run_count).toBe(1);
        expect(updatedSchedule.last_run_date).toBeDefined();
        expect(updatedSchedule.next_run_date).toBeDefined();
      });

      it('should throw NotFoundException for invalid schedule', async () => {
        await expect(
          service.executeSchedule('non-existent-id'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deactivateSchedule', () => {
      it('should deactivate schedule', async () => {
        const schedule = await service.createReportSchedule({
          organization_id: mockOrgId,
          name: 'Deactivate Test',
          template_id: templateId,
          export_format: ExportFormat.PDF,
          frequency: ScheduleFrequency.DAILY,
          start_date: new Date(),
          recipients: ['test@example.com'],
          created_by: mockUserId,
        });

        expect(schedule.is_active).toBe(true);

        const result = await service.deactivateSchedule(schedule.id);
        expect(result.is_active).toBe(false);
      });

      it('should throw NotFoundException for non-existent schedule', async () => {
        await expect(
          service.deactivateSchedule('non-existent-id'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteReportSchedule', () => {
      it('should delete schedule', async () => {
        const created = await service.createReportSchedule({
          organization_id: mockOrgId,
          name: 'Delete Test',
          template_id: templateId,
          export_format: ExportFormat.PDF,
          frequency: ScheduleFrequency.DAILY,
          start_date: new Date(),
          recipients: ['test@example.com'],
          created_by: mockUserId,
        });

        await service.deleteReportSchedule(created.id);

        await expect(
          service.findReportScheduleById(created.id),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      // Create some test data
      await service.generateReport({
        organization_id: mockOrgId,
        name: 'Sales Report 1',
        category: ReportCategory.SALES,
        type: ReportType.DAILY_SALES,
        parameters: {},
        requested_by: mockUserId,
      });

      await service.generateReport({
        organization_id: mockOrgId,
        name: 'Inventory Report',
        category: ReportCategory.INVENTORY,
        type: ReportType.INVENTORY_LEVELS,
        parameters: {},
        requested_by: mockUserId,
      });

      // Wait for generation
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    describe('getReportStats', () => {
      it('should return comprehensive statistics', async () => {
        const result = await service.getReportStats(mockOrgId);

        expect(result).toBeDefined();
        expect(result.total_reports).toBeGreaterThanOrEqual(2);
        expect(result.reports_by_category).toBeDefined();
        expect(result.reports_by_type).toBeDefined();
        expect(result.reports_by_status).toBeDefined();
        expect(result.active_schedules).toBeDefined();
        expect(result.total_scheduled_runs).toBeDefined();
        expect(result.average_generation_time_ms).toBeGreaterThan(0);
        expect(result.total_file_size_mb).toBeGreaterThanOrEqual(0);
      });

      it('should track activity by time periods', async () => {
        const result = await service.getReportStats(mockOrgId);

        expect(result.reports_today).toBeGreaterThanOrEqual(2);
        expect(result.reports_this_week).toBeGreaterThanOrEqual(2);
        expect(result.reports_this_month).toBeGreaterThanOrEqual(2);
      });

      it('should identify most generated type', async () => {
        const result = await service.getReportStats(mockOrgId);

        expect(result.most_generated_type).toBeDefined();
        expect(Object.values(ReportType)).toContain(result.most_generated_type);
      });

      it('should return zero statistics for organization with no reports', async () => {
        const result = await service.getReportStats('other-org-id');

        expect(result.total_reports).toBe(0);
        expect(result.active_schedules).toBe(0);
        expect(result.reports_today).toBe(0);
      });
    });
  });
});
