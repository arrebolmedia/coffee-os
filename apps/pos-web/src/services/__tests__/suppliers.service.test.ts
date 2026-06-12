import { SuppliersService } from '../suppliers.service';
import { api } from '@/lib/api';

// Mock the API client
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('SuppliersService', () => {
  const mockOrganizationId = 'org-123';
  const mockSupplierId = 'supplier-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSuppliers', () => {
    it('should fetch suppliers for an organization', async () => {
      const mockSuppliers = [
        { id: '1', name: 'Supplier 1', active: true },
        { id: '2', name: 'Supplier 2', active: false },
      ];

      (api.get as jest.Mock).mockResolvedValue({ data: mockSuppliers });

      const result = await SuppliersService.getSuppliers(mockOrganizationId);

      expect(api.get).toHaveBeenCalledWith(
        `/suppliers/organization/${mockOrganizationId}`,
      );
      expect(result).toEqual(mockSuppliers);
    });

    it('should filter by active client-side when filter provided', async () => {
      const mockSuppliers = [
        { id: '1', name: 'Supplier 1', active: true },
        { id: '2', name: 'Supplier 2', active: false },
      ];

      (api.get as jest.Mock).mockResolvedValue({ data: mockSuppliers });

      const result = await SuppliersService.getSuppliers(mockOrganizationId, {
        active: true,
      });

      expect(api.get).toHaveBeenCalledWith(
        `/suppliers/organization/${mockOrganizationId}`,
      );
      expect(result).toEqual([{ id: '1', name: 'Supplier 1', active: true }]);
    });

    it('should handle errors when fetching suppliers', async () => {
      const mockError = new Error('Network error');
      (api.get as jest.Mock).mockRejectedValue(mockError);

      await expect(
        SuppliersService.getSuppliers(mockOrganizationId),
      ).rejects.toThrow('Network error');
    });
  });

  describe('getSupplier', () => {
    it('should fetch a single supplier by ID', async () => {
      const mockSupplier = {
        id: mockSupplierId,
        name: 'Coffee Beans Co.',
        contact_person: 'John Doe',
        active: true,
      };

      (api.get as jest.Mock).mockResolvedValue({ data: mockSupplier });

      const result = await SuppliersService.getSupplier(mockSupplierId);

      expect(api.get).toHaveBeenCalledWith(`/suppliers/${mockSupplierId}`);
      expect(result).toEqual(mockSupplier);
    });
  });

  describe('createSupplier', () => {
    it('should create a new supplier', async () => {
      const newSupplierData = {
        organization_id: mockOrganizationId,
        name: 'New Supplier',
        contact_person: 'John Doe',
        email: 'john@supplier.com',
        phone: '555-1234',
        payment_terms: '30 días',
        lead_time_days: 5,
        active: true,
      };

      const mockCreatedSupplier = { id: 'new-supplier-id', ...newSupplierData };

      (api.post as jest.Mock).mockResolvedValue({ data: mockCreatedSupplier });

      const result = await SuppliersService.createSupplier(newSupplierData);

      expect(api.post).toHaveBeenCalledWith('/suppliers', newSupplierData);
      expect(result).toEqual(mockCreatedSupplier);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        organization_id: mockOrganizationId,
        // Missing required fields
      };

      (api.post as jest.Mock).mockRejectedValue(new Error('Validation error'));

      await expect(
        SuppliersService.createSupplier(invalidData as any),
      ).rejects.toThrow('Validation error');
    });
  });

  describe('updateSupplier', () => {
    it('should update an existing supplier', async () => {
      const updateData = {
        name: 'Updated Supplier Name',
        payment_terms: '45 días',
      };

      const mockUpdatedSupplier = {
        id: mockSupplierId,
        ...updateData,
      };

      (api.put as jest.Mock).mockResolvedValue({ data: mockUpdatedSupplier });

      const result = await SuppliersService.updateSupplier(
        mockSupplierId,
        updateData,
      );

      expect(api.put).toHaveBeenCalledWith(
        `/suppliers/${mockSupplierId}`,
        updateData,
      );
      expect(result).toEqual(mockUpdatedSupplier);
    });
  });

  describe('deleteSupplier', () => {
    it('should delete a supplier', async () => {
      (api.delete as jest.Mock).mockResolvedValue({ data: { success: true } });

      await SuppliersService.deleteSupplier(mockSupplierId);

      expect(api.delete).toHaveBeenCalledWith(`/suppliers/${mockSupplierId}`);
    });
  });

  describe('getSupplierStats', () => {
    it('should fetch supplier statistics', async () => {
      const mockStats = {
        total_suppliers: 25,
        active_count: 22,
        inactive_count: 3,
      };

      (api.get as jest.Mock).mockResolvedValue({ data: mockStats });

      const result =
        await SuppliersService.getSupplierStats(mockOrganizationId);

      expect(api.get).toHaveBeenCalledWith(
        `/suppliers/organization/${mockOrganizationId}/stats`,
      );
      expect(result).toEqual(mockStats);
    });
  });
});
