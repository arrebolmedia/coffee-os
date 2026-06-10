import { QualityControlService } from '../quality-control.service';
import { api } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('QualityControlService', () => {
  const mockOrganizationId = 'org-123';
  const mockExecutionId = 'execution-789';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Checklist Templates', () => {
    describe('getChecklistTemplates', () => {
      it('should fetch all checklist templates', async () => {
        const mockTemplates = [
          {
            id: '1',
            name: 'Opening Checklist',
            type: 'opening',
            frequency: 'daily',
          },
          {
            id: '2',
            name: 'Closing Checklist',
            type: 'closing',
            frequency: 'daily',
          },
        ];

        (api.get as jest.Mock).mockResolvedValue({ data: mockTemplates });

        const result =
          await QualityControlService.getChecklistTemplates(mockOrganizationId);

        expect(api.get).toHaveBeenCalledWith(
          `/organizations/${mockOrganizationId}/quality/checklist-templates`,
        );
        expect(result).toEqual(mockTemplates);
      });
    });

    describe('createChecklistTemplate', () => {
      it('should create a new checklist template', async () => {
        const newTemplate = {
          organization_id: mockOrganizationId,
          name: 'Equipment Cleaning',
          type: 'cleaning' as const,
          frequency: 'daily' as const,
          active: true,
          items: [
            {
              id: 'item-1',
              order: 1,
              category: 'cleaning',
              task: 'Clean espresso machine',
              is_critical: true,
            },
          ],
        };

        const mockCreated = { id: 'new-template', ...newTemplate };

        (api.post as jest.Mock).mockResolvedValue({ data: mockCreated });

        const result =
          await QualityControlService.createChecklistTemplate(newTemplate);

        expect(api.post).toHaveBeenCalledWith(
          '/quality/checklist-templates',
          newTemplate,
        );
        expect(result).toEqual(mockCreated);
      });
    });
  });

  describe('Checklist Executions', () => {
    describe('getChecklistExecutions', () => {
      it('should fetch checklist executions with filters', async () => {
        const filters = {
          status: 'completed' as const,
          date_from: '2025-10-01',
          date_to: '2025-10-31',
        };

        const mockExecutions = [
          {
            id: '1',
            template_id: 'template-1',
            status: 'completed',
            overall_score: 95,
          },
        ];

        (api.get as jest.Mock).mockResolvedValue({ data: mockExecutions });

        const result = await QualityControlService.getChecklistExecutions(
          mockOrganizationId,
          filters,
        );

        expect(api.get).toHaveBeenCalledWith(
          `/organizations/${mockOrganizationId}/quality/checklist-executions`,
          { params: filters },
        );
        expect(result).toEqual(mockExecutions);
      });
    });

    describe('completeChecklistExecution', () => {
      it('should complete a checklist execution', async () => {
        const mockCompleted = {
          id: mockExecutionId,
          status: 'completed',
          completed_at: '2025-10-27T12:00:00Z',
        };

        (api.post as jest.Mock).mockResolvedValue({ data: mockCompleted });

        const result =
          await QualityControlService.completeChecklistExecution(
            mockExecutionId,
          );

        expect(api.post).toHaveBeenCalledWith(
          `/quality/checklist-executions/${mockExecutionId}/complete`,
        );
        expect(result).toEqual(mockCompleted);
      });
    });
  });

  describe('Temperature Logs', () => {
    describe('createTemperatureLog', () => {
      it('should create a temperature log', async () => {
        const logData = {
          organization_id: mockOrganizationId,
          location_id: 'location-123',
          equipment_type: 'refrigerator' as const,
          equipment_name: 'Main Fridge',
          temperature: 4.2,
          unit: 'celsius' as const,
          min_acceptable: 2,
          max_acceptable: 8,
          is_within_range: true,
          recorded_by: 'user-123',
          recorded_at: '2025-10-27T10:00:00Z',
        };

        const mockCreated = { id: 'log-123', ...logData };

        (api.post as jest.Mock).mockResolvedValue({ data: mockCreated });

        const result =
          await QualityControlService.createTemperatureLog(logData);

        expect(api.post).toHaveBeenCalledWith(
          '/quality/temperature-logs',
          logData,
        );
        expect(result).toEqual(mockCreated);
      });

      it('should handle out-of-range temperatures', async () => {
        const logData = {
          organization_id: mockOrganizationId,
          location_id: 'location-123',
          equipment_type: 'refrigerator' as const,
          equipment_name: 'Main Fridge',
          temperature: 12.5,
          unit: 'celsius' as const,
          min_acceptable: 2,
          max_acceptable: 8,
          is_within_range: false,
          corrective_action: 'Adjusted thermostat and monitoring',
          recorded_by: 'user-123',
          recorded_at: '2025-10-27T10:00:00Z',
        };

        const mockCreated = { id: 'log-456', ...logData, severity: 'high' };

        (api.post as jest.Mock).mockResolvedValue({ data: mockCreated });

        const result =
          await QualityControlService.createTemperatureLog(logData);

        expect(result.is_within_range).toBe(false);
        expect(result.corrective_action).toBeDefined();
      });
    });

    describe('getTemperatureAlerts', () => {
      it('should fetch unacknowledged temperature alerts', async () => {
        const mockAlerts = [
          {
            id: 'alert-1',
            temperature: 15.2,
            severity: 'high',
            acknowledged: false,
          },
          {
            id: 'alert-2',
            temperature: 1.5,
            severity: 'medium',
            acknowledged: false,
          },
        ];

        (api.get as jest.Mock).mockResolvedValue({ data: mockAlerts });

        const result = await QualityControlService.getTemperatureAlerts(
          mockOrganizationId,
          false,
        );

        expect(api.get).toHaveBeenCalledWith(
          `/organizations/${mockOrganizationId}/quality/temperature-alerts`,
          { params: { acknowledged: false } },
        );
        expect(result).toEqual(mockAlerts);
      });
    });
  });

  describe('Compliance & Reporting', () => {
    describe('getComplianceReport', () => {
      it('should generate compliance report', async () => {
        const dateRange = {
          from: '2025-10-01',
          to: '2025-10-31',
        };

        const mockReport = {
          period: dateRange,
          checklists: {
            total: 62,
            completed: 58,
            failed: 2,
            cancelled: 2,
            compliance_rate: 93.5,
            critical_failures: 1,
          },
          temperature: {
            total_logs: 186,
            out_of_range: 5,
            compliance_rate: 97.3,
            critical_violations: 2,
          },
          overall_compliance_score: 95,
          nom251_compliant: true,
          trend: 'improving' as const,
        };

        (api.get as jest.Mock).mockResolvedValue({ data: mockReport });

        const result = await QualityControlService.getComplianceReport(
          mockOrganizationId,
          dateRange,
        );

        expect(api.get).toHaveBeenCalledWith(
          `/organizations/${mockOrganizationId}/quality/compliance-report`,
          { params: dateRange },
        );
        expect(result).toEqual(mockReport);
        expect(result.overall_compliance_score).toBeGreaterThanOrEqual(90);
        expect(result.nom251_compliant).toBe(true);
      });
    });

    describe('getNOM251ComplianceStatus', () => {
      it('should get NOM-251 compliance status', async () => {
        const mockStatus = {
          compliant: true,
          last_assessment_date: '2025-10-27',
          compliance_score: 96,
          areas: {
            food_handling: 98,
            temperature_control: 95,
            cleaning_sanitation: 97,
            personnel_hygiene: 94,
            documentation: 96,
          },
          pending_actions: 2,
          next_audit_date: '2025-11-27',
        };

        (api.get as jest.Mock).mockResolvedValue({ data: mockStatus });

        const result =
          await QualityControlService.getNOM251ComplianceStatus(
            mockOrganizationId,
          );

        expect(api.get).toHaveBeenCalledWith(
          `/organizations/${mockOrganizationId}/quality/nom251-status`,
        );
        expect(result.compliant).toBe(true);
        expect(result.score).toBeGreaterThan(90);
      });
    });
  });

  describe('Corrective Actions', () => {
    describe('createCorrectiveAction', () => {
      it('should create a corrective action', async () => {
        const actionData = {
          organization_id: mockOrganizationId,
          issue_type: 'temperature' as const,
          severity: 'high' as const,
          created_by: 'user-123',
          description: 'Refrigerator temperature exceeded safe range',
          root_cause: 'Faulty thermostat',
          corrective_action: 'Replace thermostat and monitor closely',
          preventive_action: 'Schedule monthly equipment maintenance',
          responsible_person: 'user-123',
          due_date: '2025-11-03',
        };

        const mockCreated = {
          id: 'action-123',
          ...actionData,
          status: 'open' as const,
          created_at: '2025-10-27T12:00:00Z',
        };

        (api.post as jest.Mock).mockResolvedValue({ data: mockCreated });

        const result =
          await QualityControlService.createCorrectiveAction(actionData);

        expect(api.post).toHaveBeenCalledWith(
          '/quality/corrective-actions',
          actionData,
        );
        expect(result).toEqual(mockCreated);
        expect(result.status).toBe('open');
      });
    });

    describe('completeCorrectiveAction', () => {
      it('should complete and verify a corrective action', async () => {
        const verificationNotes =
          'New thermostat installed, temperature stable at 4°C';
        const verifiedBy = 'manager-456';

        const mockCompleted = {
          id: 'action-123',
          status: 'completed',
          verification_notes: verificationNotes,
          verified_by: verifiedBy,
          verified_at: '2025-10-28T10:00:00Z',
        };

        (api.post as jest.Mock).mockResolvedValue({ data: mockCompleted });

        const result = await QualityControlService.completeCorrectiveAction(
          'action-123',
          verificationNotes,
          verifiedBy,
        );

        expect(api.post).toHaveBeenCalledWith(
          '/quality/corrective-actions/action-123/complete',
          {
            verification_notes: verificationNotes,
            verified_by: verifiedBy,
          },
        );
        expect(result.status).toBe('completed');
      });
    });
  });
});
