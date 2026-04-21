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
        { id: '1', name: 'Supplier 1', category: 'coffee' },
        { id: '2', name: 'Supplier 2', category: 'dairy' },
      ];

      (api.get as jest.Mock).mockResolvedValue({ data: mockSuppliers });

      const result = await SuppliersService.getSuppliers(mockOrganizationId);

      expect(api.get).toHaveBeenCalledWith(
        `/organizations/${mockOrganizationId}/suppliers`,
      );
      expect(result).toEqual(mockSuppliers);
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
        category: 'coffee',
        rating: 4.5,
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
        business_name: 'New Supplier S.A.',
        category: 'packaging',
        contact_name: 'John Doe',
        contact_email: 'john@supplier.com',
        contact_phone: '555-1234',
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
        rating: 5,
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

  describe('getSuppliersByCategory', () => {
    it('should fetch suppliers filtered by category', async () => {
      const category = 'coffee';
      const mockSuppliers = [
        { id: '1', name: 'Coffee Supplier 1', category },
        { id: '2', name: 'Coffee Supplier 2', category },
      ];

      (api.get as jest.Mock).mockResolvedValue({ data: mockSuppliers });

      const result = await SuppliersService.getSuppliersByCategory(
        mockOrganizationId,
        category,
      );

      expect(api.get).toHaveBeenCalledWith(
        `/organizations/${mockOrganizationId}/suppliers?category=${category}`,
      );
      expect(result).toEqual(mockSuppliers);
    });
  });

  describe('getSupplierStats', () => {
    it('should fetch supplier statistics', async () => {
      const mockStats = {
        total_suppliers: 25,
        active_suppliers: 22,
        by_category: {
          coffee: 8,
          dairy: 5,
          packaging: 7,
          cleaning: 5,
        },
        average_rating: 4.2,
      };

      (api.get as jest.Mock).mockResolvedValue({ data: mockStats });

      const result =
        await SuppliersService.getSupplierStats(mockOrganizationId);

      expect(api.get).toHaveBeenCalledWith(
        `/organizations/${mockOrganizationId}/suppliers/stats`,
      );
      expect(result).toEqual(mockStats);
    });
  });
});
