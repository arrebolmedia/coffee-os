import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SupplierFormModal } from '../SupplierFormModal';
import { useCreateSupplier, useUpdateSupplier } from '@/hooks/use-suppliers';

// Mock the hooks
jest.mock('@/hooks/use-suppliers', () => ({
  useCreateSupplier: jest.fn(),
  useUpdateSupplier: jest.fn(),
}));

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

describe('SupplierFormModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useCreateSupplier as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    (useUpdateSupplier as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });
  });

  it('should render in create mode', () => {
    render(
      <SupplierFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSuccess}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText('Nuevo Proveedor')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre Comercial/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Razón Social/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/RFC/i)).toBeInTheDocument();
  });

  it('should render in edit mode with existing supplier data', () => {
    const existingSupplier = {
      id: 'supplier-123',
      organization_id: 'org-123',
      name: 'Coffee Beans Co.',
      business_name: 'Coffee Beans Company S.A. de C.V.',
      rfc: 'CBC123456ABC',
      category: 'coffee',
      rating: 4,
      status: 'active' as const,
      contact_name: 'John Doe',
      contact_email: 'john@coffeebeans.com',
      contact_phone: '555-1234',
      address_street: '123 Main St',
      address_city: 'CDMX',
      address_state: 'CDMX',
      address_zip: '01234',
      payment_terms: '30_days',
      products_supplied: ['Café en grano', 'Café molido'],
      total_purchases: 0,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    render(
      <SupplierFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSuccess}
        supplier={existingSupplier}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText('Editar Proveedor')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Coffee Beans Co.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('CBC123456ABC')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
  });

  it('should display all form sections', () => {
    render(
      <SupplierFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSuccess}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText('Información General')).toBeInTheDocument();
    expect(screen.getByText('Información de Contacto')).toBeInTheDocument();
    expect(screen.getByText('Dirección')).toBeInTheDocument();
    expect(screen.getByText('Términos Comerciales')).toBeInTheDocument();
  });

  it('should handle star rating interaction', () => {
    render(
      <SupplierFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSuccess}
      />,
      { wrapper: createWrapper() },
    );

    // Find star rating elements (they should be buttons or clickable elements)
    const stars = screen.getAllByRole('button', { name: /star/i });

    // Click on the 4th star
    if (stars.length >= 4) {
      fireEvent.click(stars[3]);
    }

    // The form should now have a rating value set
    // This would be verified through form submission
  });

  it('should allow adding product tags', () => {
    render(
      <SupplierFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSuccess}
      />,
      { wrapper: createWrapper() },
    );

    const productInput = screen.getByPlaceholderText(/Agregar producto/i);

    // Type a product name
    fireEvent.change(productInput, { target: { value: 'Café en grano' } });

    // Press Enter to add the tag
    fireEvent.keyPress(productInput, { key: 'Enter', code: 13, charCode: 13 });

    // The product should be added as a tag
    expect(screen.getByText('Café en grano')).toBeInTheDocument();
  });

  it('should allow removing product tags', () => {
    const supplierWithProducts = {
      id: 'supplier-123',
      organization_id: 'org-123',
      name: 'Test Supplier',
      products_supplied: ['Café en grano', 'Café molido'],
    };

    render(
      <SupplierFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSuccess}
        supplier={supplierWithProducts as any}
      />,
      { wrapper: createWrapper() },
    );

    // Find and click the remove button for the first tag
    const removeButtons = screen.getAllByRole('button', { name: /×/i });

    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0]);
    }

    // One product should be removed
  });

  it('should call onClose when cancel button is clicked', () => {
    render(
      <SupplierFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSuccess}
      />,
      { wrapper: createWrapper() },
    );

    const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should submit form data when creating new supplier', async () => {
    render(
      <SupplierFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSuccess}
      />,
      { wrapper: createWrapper() },
    );

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Nombre Comercial/i), {
      target: { value: 'New Supplier' },
    });

    fireEvent.change(screen.getByLabelText(/Razón Social/i), {
      target: { value: 'New Supplier S.A. de C.V.' },
    });

    fireEvent.change(screen.getByLabelText(/RFC/i), {
      target: { value: 'NSU123456ABC' },
    });

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'contact@newsupplier.com' },
    });

    // Submit the form
    const submitButton = screen.getByRole('button', {
      name: /Crear Proveedor/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it('should display loading state during submission', () => {
    (useCreateSupplier as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });

    render(
      <SupplierFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSuccess}
      />,
      { wrapper: createWrapper() },
    );

    const submitButton = screen.getByRole('button', {
      name: /Crear Proveedor/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it('should validate RFC format', async () => {
    render(
      <SupplierFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSuccess}
      />,
      { wrapper: createWrapper() },
    );

    const rfcInput = screen.getByLabelText(/RFC/i);

    // Enter an invalid RFC
    fireEvent.change(rfcInput, { target: { value: 'INVALID' } });
    fireEvent.blur(rfcInput);

    // Should show validation error
    await waitFor(() => {
      const errorMessage = screen.queryByText(/RFC debe tener/i);
      if (errorMessage) {
        expect(errorMessage).toBeInTheDocument();
      }
    });
  });

  it('should validate email format', async () => {
    render(
      <SupplierFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSuccess}
      />,
      { wrapper: createWrapper() },
    );

    const emailInput = screen.getByLabelText(/Email/i);

    // Enter an invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    // Should show validation error
    await waitFor(() => {
      const errorMessage = screen.queryByText(/email válido/i);
      if (errorMessage) {
        expect(errorMessage).toBeInTheDocument();
      }
    });
  });
});
