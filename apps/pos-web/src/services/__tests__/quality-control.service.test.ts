import { QualityControlService } from '../quality-control.service';
import { api } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  // Implementación equivalente a buildQueryString de @/lib/api
  buildQueryString: (params: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  },
}));

describe('QualityControlService', () => {
  const mockOrganizationId = 'org-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Checklists (backend real: /quality/checklists)', () => {
    it('should fetch checklists with organization_id', async () => {
      const mockChecklists = [
        {
          id: '1',
          name: 'Limpieza apertura',
          type: 'DAILY',
          completed: false,
          completion_percentage: 0,
        },
      ];

      (api.get as jest.Mock).mockResolvedValue(mockChecklists);

      const result =
        await QualityControlService.getChecklists(mockOrganizationId);

      expect(api.get).toHaveBeenCalledWith(
        `/quality/checklists?organization_id=${mockOrganizationId}`,
      );
      expect(result).toEqual(mockChecklists);
    });

    it('should create a checklist via POST /quality/checklists', async () => {
      const newChecklist = {
        name: 'Limpieza semanal',
        type: 'WEEKLY' as const,
        location_id: 'loc-1',
        organization_id: mockOrganizationId,
        items: [
          {
            description: 'Limpiar máquina de espresso',
            category: 'CLEANING' as const,
          },
        ],
      };

      const mockCreated = { id: 'checklist-1', ...newChecklist };
      (api.post as jest.Mock).mockResolvedValue(mockCreated);

      const result = await QualityControlService.createChecklist(newChecklist);

      expect(api.post).toHaveBeenCalledWith(
        '/quality/checklists',
        newChecklist,
      );
      expect(result).toEqual(mockCreated);
    });

    it('should complete a checklist via PATCH /quality/checklists/:id/complete', async () => {
      const completeDto = {
        completed_by_user_id: 'user-123',
        items: [{ item_id: 'item-1', completed: true }],
      };
      const mockCompleted = { id: 'checklist-1', completed: true };

      (api.patch as jest.Mock).mockResolvedValue(mockCompleted);

      const result = await QualityControlService.completeChecklist(
        'checklist-1',
        completeDto,
      );

      expect(api.patch).toHaveBeenCalledWith(
        '/quality/checklists/checklist-1/complete',
        completeDto,
      );
      expect(result).toEqual(mockCompleted);
    });
  });

  describe('Checklist Templates (sin backend — deben lanzar)', () => {
    it('getChecklistTemplates should throw a clear error', async () => {
      await expect(
        QualityControlService.getChecklistTemplates(mockOrganizationId),
      ).rejects.toThrow(/Módulo en construcción/);
      expect(api.get).not.toHaveBeenCalled();
    });

    it('createChecklistTemplate should throw a clear error', async () => {
      await expect(
        QualityControlService.createChecklistTemplate({} as any),
      ).rejects.toThrow(/Módulo en construcción/);
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  describe('Checklist Executions (sin backend — deben lanzar)', () => {
    it('getChecklistExecutions should throw a clear error', async () => {
      await expect(
        QualityControlService.getChecklistExecutions(mockOrganizationId),
      ).rejects.toThrow(/Módulo en construcción/);
      expect(api.get).not.toHaveBeenCalled();
    });

    it('completeChecklistExecution should throw a clear error', async () => {
      await expect(
        QualityControlService.completeChecklistExecution('execution-789'),
      ).rejects.toThrow(/Módulo en construcción/);
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  describe('Temperature Logs (backend real: /quality/temperature-logs)', () => {
    it('should create a temperature log with the real DTO', async () => {
      const logData = {
        location_id: 'location-123',
        organization_id: mockOrganizationId,
        type: 'REFRIGERATOR' as const,
        temperature: 4.2,
        unit: 'CELSIUS' as const,
        equipment_name: 'Main Fridge',
        recorded_by_user_id: 'user-123',
        recorded_at: '2025-10-27T10:00:00Z',
      };

      const mockCreated = {
        id: 'log-123',
        ...logData,
        is_within_range: true,
        alert_triggered: false,
      };

      (api.post as jest.Mock).mockResolvedValue(mockCreated);

      const result = await QualityControlService.createTemperatureLog(logData);

      expect(api.post).toHaveBeenCalledWith(
        '/quality/temperature-logs',
        logData,
      );
      expect(result).toEqual(mockCreated);
    });

    it('should fetch temperature logs with filters', async () => {
      const mockLogs = [
        {
          id: '1',
          type: 'REFRIGERATOR',
          temperature: 4.2,
          is_within_range: true,
        },
      ];

      (api.get as jest.Mock).mockResolvedValue(mockLogs);

      const result = await QualityControlService.getTemperatureLogs(
        mockOrganizationId,
        { type: 'REFRIGERATOR', start_date: '2025-10-01' },
      );

      expect(api.get).toHaveBeenCalledWith(
        `/quality/temperature-logs?organization_id=${mockOrganizationId}&type=REFRIGERATOR&start_date=2025-10-01`,
      );
      expect(result).toEqual(mockLogs);
    });

    it('should fetch temperature alerts from the real route', async () => {
      const mockAlerts = [
        {
          id: 'log-1',
          temperature: 15.2,
          is_within_range: false,
          alert_triggered: true,
        },
      ];

      (api.get as jest.Mock).mockResolvedValue(mockAlerts);

      const result =
        await QualityControlService.getTemperatureAlerts(mockOrganizationId);

      expect(api.get).toHaveBeenCalledWith(
        `/quality/temperature-logs/alerts?organization_id=${mockOrganizationId}`,
      );
      expect(result).toEqual(mockAlerts);
    });
  });

  describe('Compliance & Reporting (sin backend — deben lanzar)', () => {
    it('getComplianceReport should throw a clear error', async () => {
      await expect(
        QualityControlService.getComplianceReport(mockOrganizationId, {
          from: '2025-10-01',
          to: '2025-10-31',
        }),
      ).rejects.toThrow(/Módulo en construcción/);
      expect(api.get).not.toHaveBeenCalled();
    });

    it('getNOM251ComplianceStatus should throw a clear error', async () => {
      await expect(
        QualityControlService.getNOM251ComplianceStatus(mockOrganizationId),
      ).rejects.toThrow(/Módulo en construcción/);
      expect(api.get).not.toHaveBeenCalled();
    });
  });

  describe('Corrective Actions (sin backend — deben lanzar)', () => {
    it('createCorrectiveAction should throw a clear error', async () => {
      await expect(
        QualityControlService.createCorrectiveAction({} as any),
      ).rejects.toThrow(/Módulo en construcción/);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('completeCorrectiveAction should throw a clear error', async () => {
      await expect(
        QualityControlService.completeCorrectiveAction('action-123', 'notes'),
      ).rejects.toThrow(/Módulo en construcción/);
      expect(api.post).not.toHaveBeenCalled();
    });
  });
});
