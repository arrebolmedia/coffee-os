import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '../ProductCard';
import type { Product } from '@/types';
import { ProductStatus, ProductType } from '@/types';

describe('ProductCard', () => {
  const mockProduct: Product = {
    id: '1',
    name: 'Espresso',
    sku: 'ESP001',
    price: 45,
    category_id: 'cat1',
    status: ProductStatus.ACTIVE,
    image_url: '/espresso.jpg',
    type: ProductType.SIMPLE,
    track_inventory: true,
    organization_id: 'org1',
    location_id: 'loc1',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render product information', () => {
    render(<ProductCard product={mockProduct} onSelect={mockOnSelect} />);

    expect(screen.getByText('Espresso')).toBeInTheDocument();
    expect(screen.getByText('$45.00')).toBeInTheDocument();
  });

  it('should render product image', () => {
    render(<ProductCard product={mockProduct} onSelect={mockOnSelect} />);

    const image = screen.getByAltText('Espresso');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', expect.stringContaining('espresso.jpg'));
  });

  it('should call onClick when clicked', () => {
    render(<ProductCard product={mockProduct} onSelect={mockOnSelect} />);

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith(mockProduct);
  });

  it('should show out of stock badge when stock is 0', () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 };
    render(<ProductCard product={outOfStockProduct} onSelect={mockOnSelect} />);

    expect(screen.getByText('Agotado')).toBeInTheDocument();
  });

  it('should disable card when product is out of stock', () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 };
    render(<ProductCard product={outOfStockProduct} onSelect={mockOnSelect} />);

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  it('should show low stock badge when stock is low', () => {
    const lowStockProduct = { ...mockProduct, stock: 3 };
    render(<ProductCard product={lowStockProduct} onSelect={mockOnSelect} />);

    expect(screen.getByText(/quedan 3/i)).toBeInTheDocument();
  });

  it('should not show stock badge when stock is sufficient', () => {
    const normalStockProduct = { ...mockProduct, stock: 50 };
    render(<ProductCard product={normalStockProduct} onSelect={mockOnSelect} />);

    expect(screen.queryByText(/quedan/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Agotado')).not.toBeInTheDocument();
  });

  it('should show description if provided', () => {
    const productWithDesc = { 
      ...mockProduct, 
      description: 'Café espresso doble shot' 
    };
    render(<ProductCard product={productWithDesc} onSelect={mockOnSelect} />);

    expect(screen.getByText('Café espresso doble shot')).toBeInTheDocument();
  });

  it('should apply hover effect on mouse enter', () => {
    render(<ProductCard product={mockProduct} onSelect={mockOnSelect} />);

    const card = screen.getByRole('button');
    
    fireEvent.mouseEnter(card);
    expect(card).toHaveClass('hover:shadow-lg');
  });

  it('should format price correctly', () => {
    const expensiveProduct = { ...mockProduct, price: 1250.50 };
    render(<ProductCard product={expensiveProduct} onSelect={mockOnSelect} />);

    expect(screen.getByText('$1,250.50')).toBeInTheDocument();
  });

  it('should show placeholder image when no image provided', () => {
    const noImageProduct = { ...mockProduct, image: undefined };
    render(<ProductCard product={noImageProduct} onSelect={mockOnSelect} />);

    const image = screen.getByAltText('Espresso');
    expect(image).toHaveAttribute('src', expect.stringContaining('placeholder'));
  });

  it('should be accessible', () => {
    render(<ProductCard product={mockProduct} onSelect={mockOnSelect} />);

    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('aria-label', expect.stringContaining('Espresso'));
  });

  it('should handle keyboard navigation', () => {
    render(<ProductCard product={mockProduct} onSelect={mockOnSelect} />);

    const card = screen.getByRole('button');
    
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(mockOnSelect).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: ' ' });
    expect(mockOnSelect).toHaveBeenCalledTimes(2);
  });
});


