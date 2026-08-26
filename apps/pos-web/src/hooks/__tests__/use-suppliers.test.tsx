import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useCreateSupplier,
  useDeleteSupplier,
  useSuppliers,
  useUpdateSupplier,
} from '../use-suppliers';
import { SuppliersService } from '@/services/suppliers.service';

// Mock the service
jest.mock('@/services/suppliers.service');

// Create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
};

describe('useSuppliers Hook', () => {
  const mockOrganizationId = 'org-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useSuppliers', () => {
    it('should fetch suppliers successfully', async () => {
      const mockSuppliers = [
        { id: '1', name: 'Coffee Beans Co.', active: true },
        { id: '2', name: 'Milk Dairy', active: true },
      ];

      (SuppliersService.getSuppliers as jest.Mock).mockResolvedValue(
        mockSuppliers,
      );

      const { result } = renderHook(() => useSuppliers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockSuppliers);
      expect(SuppliersService.getSuppliers).toHaveBeenCalled();
    });

    it('should handle loading state', () => {
      (SuppliersService.getSuppliers as jest.Mock).mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      const { result } = renderHook(() => useSuppliers(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle errors', async () => {
      const mockError = new Error('Failed to fetch suppliers');
      (SuppliersService.getSuppliers as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSuppliers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useCreateSupplier', () => {
    it('should create a supplier successfully', async () => {
      const newSupplier = {
        organization_id: mockOrganizationId,
        name: 'New Supplier',
        contact_person: 'John Doe',
        email: 'john@supplier.com',
        phone: '555-1234',
        payment_terms: '30 días',
        lead_time_days: 5,
        active: true,
      };

      const mockCreated = { id: 'new-supplier', ...newSupplier };

      (SuppliersService.createSupplier as jest.Mock).mockResolvedValue(
        mockCreated,
      );

      const { result } = renderHook(() => useCreateSupplier(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(newSupplier);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockCreated);
      expect(SuppliersService.createSupplier).toHaveBeenCalledWith(newSupplier);
    });

    it('should handle creation errors', async () => {
      const mockError = new Error('Validation failed');
      (SuppliersService.createSupplier as jest.Mock).mockRejectedValue(
        mockError,
      );

      const { result } = renderHook(() => useCreateSupplier(), {
        wrapper: createWrapper(),
      });

      const invalidData = { name: 'Test' } as any;
      result.current.mutate(invalidData);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useUpdateSupplier', () => {
    it('should update a supplier successfully', async () => {
      const supplierId = 'supplier-123';
      const updateData = { name: 'Updated Name', payment_terms: '45 días' };
      const mockUpdated = { id: supplierId, ...updateData };

      (SuppliersService.updateSupplier as jest.Mock).mockResolvedValue(
        mockUpdated,
      );

      const { result } = renderHook(() => useUpdateSupplier(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: supplierId, data: updateData });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockUpdated);
      expect(SuppliersService.updateSupplier).toHaveBeenCalledWith(
        supplierId,
        updateData,
      );
    });
  });

  describe('useDeleteSupplier', () => {
    it('should delete a supplier successfully', async () => {
      const supplierId = 'supplier-123';

      (SuppliersService.deleteSupplier as jest.Mock).mockResolvedValue(
        undefined,
      );

      const { result } = renderHook(() => useDeleteSupplier(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(supplierId);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(SuppliersService.deleteSupplier).toHaveBeenCalledWith(supplierId);
    });

    it('should handle deletion errors', async () => {
      const supplierId = 'supplier-123';
      const mockError = new Error('Cannot delete supplier with active orders');

      (SuppliersService.deleteSupplier as jest.Mock).mockRejectedValue(
        mockError,
      );

      const { result } = renderHook(() => useDeleteSupplier(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(supplierId);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });
  });
});
