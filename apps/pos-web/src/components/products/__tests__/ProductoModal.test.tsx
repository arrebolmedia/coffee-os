import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProductoModal } from '../ProductoModal';

const crear = jest.fn();
const actualizar = jest.fn();

jest.mock('@/hooks/use-products', () => ({
  useCreateProduct: () => ({ mutateAsync: crear, isPending: false }),
  useUpdateProduct: () => ({ mutateAsync: actualizar, isPending: false }),
  useCategories: () => ({
    data: [
      { id: 'cat-cafe', name: 'Café Caliente' },
      { id: 'cat-pan', name: 'Panadería' },
    ],
  }),
}));

/**
 * El alta y la edición de un producto.
 *
 * No existía: la pantalla listaba y filtraba, y «Nuevo Producto» no tenía
 * `onClick`. Sin esto la carta de la cafetería sólo se podía cargar llamando a
 * la API a mano, que es lo que impedía abrir el negocio con el sistema.
 */
describe('ProductoModal', () => {
  const existente = {
    id: 'p1',
    name: 'Latte',
    sku: 'CAF-LAT-001',
    description: 'Espresso con leche vaporizada',
    categoryId: 'cat-cafe',
    price: 62,
    cost: 18,
    barcode: '',
    trackInventory: false,
    taxRate: 0.16,
    taxIncluded: false,
  };

  beforeEach(() => jest.clearAllMocks());

  it('no se pinta si está cerrado', () => {
    const { container } = render(
      <ProductoModal producto={null} onClose={jest.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  describe('alta', () => {
    const abrirAlta = () =>
      render(<ProductoModal producto="nuevo" onClose={jest.fn()} />);

    it('manda los campos con los nombres que espera la API', async () => {
      // El backend rechaza lo que no reconoce, así que camelCase daría un 400.
      abrirAlta();

      fireEvent.change(screen.getByLabelText('Nombre'), {
        target: { value: 'Cold Brew' },
      });
      fireEvent.change(screen.getByLabelText('Categoría'), {
        target: { value: 'cat-cafe' },
      });
      fireEvent.change(screen.getByLabelText('Precio de venta'), {
        target: { value: '55' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Crear producto/ }));

      await waitFor(() =>
        expect(crear).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Cold Brew',
            category_id: 'cat-cafe',
            base_price: 55,
            tax_rate: 0.16,
            tax_included: false,
          }),
        ),
      );
    });

    it('deja dar de alta un producto a tasa 0', async () => {
      // El pan para llevar tributa a tasa 0 (art. 2-A LIVA). Con el `||` que
      // había en el backend era imposible; ahora tampoco puede serlo desde aquí.
      abrirAlta();

      fireEvent.change(screen.getByLabelText('Nombre'), {
        target: { value: 'Concha' },
      });
      fireEvent.change(screen.getByLabelText('Categoría'), {
        target: { value: 'cat-pan' },
      });
      fireEvent.change(screen.getByLabelText('Precio de venta'), {
        target: { value: '25' },
      });
      fireEvent.click(screen.getByRole('radio', { name: /Tasa 0/ }));
      fireEvent.click(screen.getByRole('button', { name: /Crear producto/ }));

      await waitFor(() =>
        expect(crear).toHaveBeenCalledWith(
          expect.objectContaining({ tax_rate: 0 }),
        ),
      );
    });

    it('no manda nada si falta el nombre', async () => {
      abrirAlta();

      fireEvent.click(screen.getByRole('button', { name: /Crear producto/ }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /nombre es obligatorio/i,
      );
      expect(crear).not.toHaveBeenCalled();
    });

    it('ni si falta la categoría', async () => {
      abrirAlta();

      fireEvent.change(screen.getByLabelText('Nombre'), {
        target: { value: 'Algo' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Crear producto/ }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/categoría/i);
      expect(crear).not.toHaveBeenCalled();
    });

    it('enseña el mensaje del backend cuando rechaza', async () => {
      // Un SKU repetido o una tasa fuera de rango dicen más que «algo salió
      // mal».
      crear.mockRejectedValueOnce(new Error('Producto con SKU X ya existe'));
      abrirAlta();

      fireEvent.change(screen.getByLabelText('Nombre'), {
        target: { value: 'Duplicado' },
      });
      fireEvent.change(screen.getByLabelText('Categoría'), {
        target: { value: 'cat-cafe' },
      });
      fireEvent.change(screen.getByLabelText('Precio de venta'), {
        target: { value: '10' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Crear producto/ }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/ya existe/);
    });
  });

  describe('edición', () => {
    it('arranca con lo que el producto ya tiene', () => {
      render(<ProductoModal producto={existente} onClose={jest.fn()} />);

      expect(screen.getByLabelText('Nombre')).toHaveValue('Latte');
      expect(screen.getByLabelText('Precio de venta')).toHaveValue(62);
      expect(screen.getByRole('radio', { name: /16 %/ })).toBeChecked();
    });

    it('manda sólo lo editable, con los nombres de la API', async () => {
      render(<ProductoModal producto={existente} onClose={jest.fn()} />);

      fireEvent.change(screen.getByLabelText('Precio de venta'), {
        target: { value: '68' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Guardar$/ }));

      await waitFor(() =>
        expect(actualizar).toHaveBeenCalledWith({
          id: 'p1',
          data: expect.objectContaining({ base_price: 68, tax_rate: 0.16 }),
        }),
      );
    });

    it('el SKU y la categoría no se tocan en una edición', () => {
      // Cambiarlos rompería los tickets ya cobrados que los referencian.
      render(<ProductoModal producto={existente} onClose={jest.fn()} />);

      expect(screen.getByLabelText('SKU')).toBeDisabled();
      expect(screen.getByLabelText('Categoría')).toBeDisabled();
    });
  });

  describe('previsualización del IVA', () => {
    it('con el IVA por fuera, $100 se cobran como $116', () => {
      render(<ProductoModal producto="nuevo" onClose={jest.fn()} />);

      fireEvent.change(screen.getByLabelText('Precio de venta'), {
        target: { value: '100' },
      });

      expect(screen.getByText('$116.00')).toBeInTheDocument();
      expect(screen.getByText('$16.00')).toBeInTheDocument();
    });

    it('con el IVA dentro, el total no sube: se desglosa del precio', () => {
      render(<ProductoModal producto="nuevo" onClose={jest.fn()} />);

      fireEvent.change(screen.getByLabelText('Precio de venta'), {
        target: { value: '100' },
      });
      fireEvent.click(
        screen.getByRole('checkbox', { name: /ya lleva el IVA dentro/i }),
      );

      expect(screen.getByText('$86.21')).toBeInTheDocument();
      expect(screen.getByText('$13.79')).toBeInTheDocument();
    });
  });

  it('ofrece las tres tasas que existen en México, con su caso', () => {
    render(<ProductoModal producto="nuevo" onClose={jest.fn()} />);

    expect(screen.getByRole('radio', { name: /16 %/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /8 %/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Tasa 0/ })).toBeInTheDocument();
    expect(screen.getByText(/art\. 2-A LIVA/)).toBeInTheDocument();
  });
});
