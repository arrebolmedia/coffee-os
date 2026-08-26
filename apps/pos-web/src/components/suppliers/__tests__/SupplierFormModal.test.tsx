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

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
};

describe('SupplierFormModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useCreateSupplier as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    (useUpdateSupplier as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  it('should render in create mode', () => {
    render(
      <SupplierFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText('Nuevo Proveedor')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nombre \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Persona de Contacto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Términos de Pago/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tiempo de Entrega/i)).toBeInTheDocument();
  });

  it('should render in edit mode with existing supplier data', () => {
    const existingSupplier = {
      id: 'supplier-123',
      organization_id: 'org-123',
      name: 'Coffee Beans Co.',
      contact_person: 'John Doe',
      email: 'john@coffeebeans.com',
      phone: '555-1234',
      address: 'Av. Insurgentes Sur 123',
      payment_terms: '30 días',
      lead_time_days: 5,
      active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    render(
      <SupplierFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        supplier={existingSupplier}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText('Editar Proveedor')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Coffee Beans Co.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('555-1234')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('should display all form sections', () => {
    render(
      <SupplierFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText('Información General')).toBeInTheDocument();
    expect(screen.getByText('Información de Contacto')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Dirección/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Términos Comerciales')).toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked', () => {
    render(
      <SupplierFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />,
      { wrapper: createWrapper() },
    );

    const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should submit form data via onSubmit when creating new supplier', async () => {
    render(
      <SupplierFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />,
      { wrapper: createWrapper() },
    );

    fireEvent.change(screen.getByLabelText(/^Nombre \*/i), {
      target: { value: 'New Supplier' },
    });

    fireEvent.change(screen.getByLabelText(/Persona de Contacto/i), {
      target: { value: 'John Doe' },
    });

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'contact@newsupplier.com' },
    });

    fireEvent.change(screen.getByLabelText(/Tiempo de Entrega/i), {
      target: { value: '7' },
    });

    const submitButton = screen.getByRole('button', {
      name: /Crear Proveedor/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'New Supplier',
        contact_person: 'John Doe',
        email: 'contact@newsupplier.com',
        phone: undefined,
        address: undefined,
        payment_terms: 'Contado',
        lead_time_days: 7,
        active: true,
      });
    });

    // El padre es responsable de la mutación cuando provee onSubmit
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('should mutate directly when no onSubmit handler is provided', async () => {
    render(<SupplierFormModal isOpen={true} onClose={mockOnClose} />, {
      wrapper: createWrapper(),
    });

    fireEvent.change(screen.getByLabelText(/^Nombre \*/i), {
      target: { value: 'Standalone Supplier' },
    });

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
        onSubmit={mockOnSubmit}
      />,
      { wrapper: createWrapper() },
    );

    const submitButton = screen.getByRole('button', {
      name: /Crear Proveedor/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it('should toggle active checkbox', () => {
    render(
      <SupplierFormModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />,
      { wrapper: createWrapper() },
    );

    const activeCheckbox = screen.getByLabelText(/Proveedor activo/i);
    expect(activeCheckbox).toBeChecked();

    fireEvent.click(activeCheckbox);
    expect(activeCheckbox).not.toBeChecked();
  });
});
