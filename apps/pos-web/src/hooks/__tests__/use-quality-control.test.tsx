import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useChecklistExecutions,
  useChecklistTemplates,
  useCompleteChecklistExecution,
  useCompleteCorrectiveAction,
  useComplianceReport,
  useCorrectiveActions,
  useCreateChecklistTemplate,
  useCreateCorrectiveAction,
  useCreateTemperatureLog,
  useNOM251Status,
  useTemperatureLogs,
} from '../use-quality-control';
import { QualityControlService } from '@/services/quality-control.service';

jest.mock('@/services/quality-control.service');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Quality Control Hooks', () => {
  const mockOrganizationId = 'org-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Checklist Templates', () => {
    describe('useChecklistTemplates', () => {
      it('should fetch checklist templates successfully', async () => {
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

        (
          QualityControlService.getChecklistTemplates as jest.Mock
        ).mockResolvedValue(mockTemplates);

        const { result } = renderHook(() => useChecklistTemplates(true), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockTemplates);
        expect(QualityControlService.getChecklistTemplates).toHaveBeenCalled();
      });
    });

    describe('useCreateChecklistTemplate', () => {
      it('should create a new checklist template', async () => {
        const newTemplate = {
          organization_id: mockOrganizationId,
          name: 'Equipment Cleaning',
          type: 'cleaning' as const,
          frequency: 'daily' as const,
          items: [
            {
              order: 1,
              description: 'Clean espresso machine',
              is_critical: true,
              expected_value: 'Complete',
            },
          ],
        };

        const mockCreated = { id: 'template-123', ...newTemplate };

        (
          QualityControlService.createChecklistTemplate as jest.Mock
        ).mockResolvedValue(mockCreated);

        const { result } = renderHook(() => useCreateChecklistTemplate(), {
          wrapper: createWrapper(),
        });

        result.current.mutate(newTemplate);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockCreated);
        expect(
          QualityControlService.createChecklistTemplate,
        ).toHaveBeenCalledWith(newTemplate);
      });
    });
  });

  describe('Checklist Executions', () => {
    describe('useChecklistExecutions', () => {
      it('should fetch executions with filters', async () => {
        const filters = { status: 'completed' as const };
        const mockExecutions = [
          {
            id: '1',
            template_id: 'template-1',
            status: 'completed',
            overall_score: 95,
          },
        ];

        (
          QualityControlService.getChecklistExecutions as jest.Mock
        ).mockResolvedValue(mockExecutions);

        const { result } = renderHook(() => useChecklistExecutions(filters), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockExecutions);
        expect(QualityControlService.getChecklistExecutions).toHaveBeenCalled();
      });
    });

    describe('useCompleteChecklistExecution', () => {
      it('should complete an execution', async () => {
        const executionId = 'execution-123';
        const mockCompleted = {
          id: executionId,
          status: 'completed',
          completed_at: '2025-10-27T12:00:00Z',
        };

        (
          QualityControlService.completeChecklistExecution as jest.Mock
        ).mockResolvedValue(mockCompleted);

        const { result } = renderHook(() => useCompleteChecklistExecution(), {
          wrapper: createWrapper(),
        });

        result.current.mutate(executionId);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockCompleted);
        expect(
          QualityControlService.completeChecklistExecution,
        ).toHaveBeenCalledWith(executionId);
      });
    });
  });

  describe('Temperature Logs', () => {
    describe('useTemperatureLogs', () => {
      it('should fetch temperature logs', async () => {
        const mockLogs = [
          {
            id: '1',
            equipment_type: 'refrigerator',
            temperature: 4.2,
            is_within_range: true,
          },
          {
            id: '2',
            equipment_type: 'freezer',
            temperature: -18.5,
            is_within_range: true,
          },
        ];

        (
          QualityControlService.getTemperatureLogs as jest.Mock
        ).mockResolvedValue(mockLogs);

        const { result } = renderHook(() => useTemperatureLogs(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockLogs);
      });
    });

    describe('useCreateTemperatureLog', () => {
      it('should create a temperature log', async () => {
        // DTO real del backend: location_id, type, unit CELSIUS/FAHRENHEIT,
        // recorded_by_user_id (lo agrega el hook desde la sesión).
        const logData = {
          location_id: 'loc-123',
          type: 'REFRIGERATOR' as const,
          equipment_name: 'Main Fridge',
          temperature: 4.2,
          unit: 'CELSIUS' as const,
          recorded_at: '2025-10-27T10:00:00Z',
        };

        const mockCreated = {
          id: 'log-123',
          ...logData,
          organization_id: mockOrganizationId,
          recorded_by_user_id: 'user-123',
          is_within_range: true,
          alert_triggered: false,
        };

        (
          QualityControlService.createTemperatureLog as jest.Mock
        ).mockResolvedValue(mockCreated);

        const { result } = renderHook(() => useCreateTemperatureLog(), {
          wrapper: createWrapper(),
        });

        result.current.mutate(logData);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockCreated);
        expect(result.current.data?.is_within_range).toBe(true);
      });

      it('should handle out-of-range temperatures', async () => {
        const logData = {
          location_id: 'loc-123',
          type: 'REFRIGERATOR' as const,
          equipment_name: 'Main Fridge',
          temperature: 12.5,
          unit: 'CELSIUS' as const,
          recorded_at: '2025-10-27T10:00:00Z',
          notes: 'Adjusted thermostat',
        };

        const mockCreated = {
          id: 'log-456',
          ...logData,
          organization_id: mockOrganizationId,
          recorded_by_user_id: 'user-123',
          is_within_range: false,
          alert_triggered: true,
        };

        (
          QualityControlService.createTemperatureLog as jest.Mock
        ).mockResolvedValue(mockCreated);

        const { result } = renderHook(() => useCreateTemperatureLog(), {
          wrapper: createWrapper(),
        });

        result.current.mutate(logData);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.is_within_range).toBe(false);
        expect(result.current.data?.alert_triggered).toBe(true);
      });
    });
  });

  describe('Compliance & Reporting', () => {
    describe('useComplianceReport', () => {
      it('should fetch compliance report', async () => {
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

        (
          QualityControlService.getComplianceReport as jest.Mock
        ).mockResolvedValue(mockReport);

        const { result } = renderHook(() => useComplianceReport(dateRange), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockReport);
        expect(
          result.current.data?.overall_compliance_score,
        ).toBeGreaterThanOrEqual(90);
        expect(result.current.data?.nom251_compliant).toBe(true);
      });
    });

    describe('useNOM251Status', () => {
      it('should fetch NOM-251 compliance status', async () => {
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

        (
          QualityControlService.getNOM251ComplianceStatus as jest.Mock
        ).mockResolvedValue(mockStatus);

        const { result } = renderHook(() => useNOM251Status(true), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockStatus);
        expect(result.current.data?.compliant).toBe(true);
      });
    });
  });

  describe('Corrective Actions', () => {
    describe('useCorrectiveActions', () => {
      it('should fetch corrective actions', async () => {
        const mockActions = [
          {
            id: '1',
            issue_type: 'temperature_deviation',
            severity: 'high',
            status: 'open',
            description: 'Refrigerator temperature exceeded safe range',
          },
        ];

        (
          QualityControlService.getCorrectiveActions as jest.Mock
        ).mockResolvedValue(mockActions);

        const { result } = renderHook(() => useCorrectiveActions(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockActions);
      });
    });

    describe('useCreateCorrectiveAction', () => {
      it('should create a corrective action', async () => {
        const actionData = {
          organization_id: mockOrganizationId,
          issue_type: 'temperature' as const,
          severity: 'high' as const,
          description: 'Refrigerator temperature exceeded safe range',
          root_cause: 'Faulty thermostat',
          corrective_action: 'Replace thermostat',
          preventive_action: 'Schedule monthly maintenance',
          responsible_person: 'user-123',
          due_date: '2025-11-03',
        };

        const mockCreated = {
          id: 'action-123',
          ...actionData,
          status: 'open' as const,
        };

        (
          QualityControlService.createCorrectiveAction as jest.Mock
        ).mockResolvedValue(mockCreated);

        const { result } = renderHook(() => useCreateCorrectiveAction(), {
          wrapper: createWrapper(),
        });

        result.current.mutate(actionData);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockCreated);
        expect(result.current.data?.status).toBe('open');
      });
    });

    describe('useCompleteCorrectiveAction', () => {
      it('should complete a corrective action', async () => {
        const payload = {
          id: 'action-123',
          verificationNotes: 'Issue resolved successfully',
        };

        const mockCompleted = {
          id: payload.id,
          status: 'completed',
          verification_notes: payload.verificationNotes,
          verified_at: '2025-10-28T10:00:00Z',
        };

        (
          QualityControlService.completeCorrectiveAction as jest.Mock
        ).mockResolvedValue(mockCompleted);

        const { result } = renderHook(() => useCompleteCorrectiveAction(), {
          wrapper: createWrapper(),
        });

        result.current.mutate(payload);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.status).toBe('completed');
        expect(
          QualityControlService.completeCorrectiveAction,
        ).toHaveBeenCalledWith(payload.id, payload.verificationNotes);
      });
    });
  });
});
