/**
 * La compuerta de carga de la pantalla de productos, con un diálogo abierto.
 *
 * El alta fallaba de vez en cuando en los e2e con «El nombre es obligatorio»
 * teniendo el precio y la categoría correctos. Lo que pasaba: mientras se
 * escribía, una consulta de fondo volvía a estado de carga, la página entera se
 * sustituía por el spinner —modal incluido, porque el `return` temprano estaba
 * por encima— y al volver, el formulario estaba en blanco. Los campos tecleados
 * hasta ese momento se perdían y los siguientes caían en el formulario nuevo.
 *
 * No es un problema de tests: es lo que le pasa a un cajero con la red lenta.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import ProductsPage from '../page';

const estado = {
  productos: { data: undefined as any, isLoading: false, error: null as any },
  categorias: { data: undefined as any, isLoading: false },
};

jest.mock('@/hooks/use-products', () => ({
  useProducts: () => estado.productos,
  useCategories: () => estado.categorias,
  useDeleteProduct: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCreateProduct: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateProduct: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/hooks/use-costing', () => ({
  useProductCOGS: () => ({ data: null, isLoading: false }),
  useMarginBadge: () => ({ label: '', className: '' }),
}));

jest.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe('Pantalla de productos — la carga no se traga el diálogo', () => {
  beforeEach(() => {
    estado.productos = {
      data: { data: [] },
      isLoading: false,
      error: null,
    };
    // `useCategories` devuelve el array pelado, no envuelto en `data`.
    estado.categorias = {
      data: [{ id: 'cat1', name: 'Café Caliente' }],
      isLoading: false,
    };
  });

  it('lo tecleado sobrevive a que una consulta vuelva a cargar', () => {
    const { rerender } = render(<ProductsPage />);

    fireEvent.click(screen.getByRole('button', { name: /Nuevo Producto/i }));
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Cold Brew de temporada' },
    });

    // Una consulta de fondo vuelve a estado de carga con el diálogo abierto.
    estado.categorias = { data: undefined, isLoading: true };
    rerender(<ProductsPage />);

    expect(screen.getByLabelText('Nombre')).toHaveValue(
      'Cold Brew de temporada',
    );
  });

  it('sin diálogo abierto sí enseña el spinner', () => {
    estado.productos = { data: undefined, isLoading: true, error: null };

    render(<ProductsPage />);

    expect(screen.getByText(/Cargando productos/i)).toBeInTheDocument();
  });
});
