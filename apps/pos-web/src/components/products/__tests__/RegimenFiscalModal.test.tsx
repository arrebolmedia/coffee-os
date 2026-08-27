import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RegimenFiscalModal } from '../RegimenFiscalModal';

const mutateAsync = jest.fn();

jest.mock('@/hooks/use-products', () => ({
  useUpdateProduct: () => ({ mutateAsync, isPending: false }),
}));

/**
 * El diálogo que fija la tasa de IVA de un producto.
 *
 * Importa por dos motivos: es la única forma de dar de alta el pan a tasa 0
 * desde la interfaz —hasta ahora había que llamar a la API a mano—, y la
 * previsualización tiene que hacer exactamente la misma cuenta que el carrito y
 * el backend. Si no coincide, el dueño configura una cosa creyendo otra.
 */
describe('RegimenFiscalModal', () => {
  const producto = {
    id: 'p1',
    name: 'Concha',
    price: 100,
    taxRate: 0.16,
    taxIncluded: false,
  };

  beforeEach(() => jest.clearAllMocks());

  it('no se pinta si no hay producto', () => {
    const { container } = render(
      <RegimenFiscalModal producto={null} onClose={jest.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('arranca con el régimen que ya tiene el producto', () => {
    render(<RegimenFiscalModal producto={producto} onClose={jest.fn()} />);

    expect(screen.getByRole('radio', { name: /16 %/ })).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: /ya lleva el IVA dentro/i }),
    ).not.toBeChecked();
  });

  describe('previsualización de lo que paga el cliente', () => {
    it('al 16 % por fuera, $100 se convierten en $116', () => {
      render(<RegimenFiscalModal producto={producto} onClose={jest.fn()} />);

      expect(screen.getByText('$116.00')).toBeInTheDocument();
      expect(screen.getByText('$16.00')).toBeInTheDocument();
    });

    it('a tasa 0 no hay impuesto y el total es el precio', () => {
      render(<RegimenFiscalModal producto={producto} onClose={jest.fn()} />);

      fireEvent.click(screen.getByRole('radio', { name: /Tasa 0/ }));

      expect(screen.getByText('$0.00')).toBeInTheDocument();
      // Base y total, los dos a 100.
      expect(screen.getAllByText('$100.00')).toHaveLength(2);
    });

    it('con el IVA dentro, el total no sube: se desglosa del precio', () => {
      render(<RegimenFiscalModal producto={producto} onClose={jest.fn()} />);

      fireEvent.click(
        screen.getByRole('checkbox', { name: /ya lleva el IVA dentro/i }),
      );

      // 100 / 1.16 = 86.21 de base, 13.79 de IVA, 100 de total.
      expect(screen.getByText('$86.21')).toBeInTheDocument();
      expect(screen.getByText('$13.79')).toBeInTheDocument();
      expect(screen.getByText('$100.00')).toBeInTheDocument();
    });
  });

  describe('al guardar', () => {
    it('manda la tasa con los nombres que espera la API', async () => {
      // El backend rechaza lo que no reconoce, así que camelCase daría un 400.
      const onClose = jest.fn();
      render(<RegimenFiscalModal producto={producto} onClose={onClose} />);

      fireEvent.click(screen.getByRole('radio', { name: /Tasa 0/ }));
      fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));

      await waitFor(() =>
        expect(mutateAsync).toHaveBeenCalledWith({
          id: 'p1',
          data: { tax_rate: 0, tax_included: false },
        }),
      );
      await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('manda también el IVA incluido', async () => {
      render(<RegimenFiscalModal producto={producto} onClose={jest.fn()} />);

      fireEvent.click(
        screen.getByRole('checkbox', { name: /ya lleva el IVA dentro/i }),
      );
      fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));

      await waitFor(() =>
        expect(mutateAsync).toHaveBeenCalledWith({
          id: 'p1',
          data: { tax_rate: 0.16, tax_included: true },
        }),
      );
    });

    it('cancelar no guarda nada', () => {
      const onClose = jest.fn();
      render(<RegimenFiscalModal producto={producto} onClose={onClose} />);

      fireEvent.click(screen.getByRole('radio', { name: /Tasa 0/ }));
      fireEvent.click(screen.getByRole('button', { name: /Cancelar/ }));

      expect(mutateAsync).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('ofrece las tres tasas que existen en México', () => {
    render(<RegimenFiscalModal producto={producto} onClose={jest.fn()} />);

    expect(screen.getByRole('radio', { name: /16 %/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /8 %/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Tasa 0/ })).toBeInTheDocument();
    // Y explica cuándo aplica cada una, que es lo que no sabe un barista.
    expect(screen.getByText(/art\. 2-A LIVA/)).toBeInTheDocument();
  });
});
