/**
 * CoffeeOS POS Web - Product Card Component
 * Tarjeta de producto para el catálogo POS
 */

'use client';

import { Product, ProductStatus } from '@/types';
import { useProductCOGS, useMarginBadge } from '@/hooks/use-costing';
import Image from 'next/image';
import {
  Coffee,
  Package,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

// Allow partial product for mock data
type ProductCardProduct = Pick<
  Product,
  'id' | 'name' | 'sku' | 'price' | 'description'
> & {
  status: ProductStatus | string;
  image_url?: string | null;
  category?: { name: string };
  track_inventory?: boolean;
  current_stock?: number;
};

interface ProductCardProps {
  product: ProductCardProduct;
  onSelect: (product: ProductCardProduct) => void;
  isSelected?: boolean;
}

export function ProductCard({
  product,
  onSelect,
  isSelected = false,
}: ProductCardProps) {
  const isOutOfStock = (product as any).status === 'out_of_stock';
  const isInactive = product.status === ProductStatus.INACTIVE;
  const isDisabled = isOutOfStock || isInactive;
  const IVA_RATE = 0.16;

  // Fetch COGS data for margin display
  const { data: cogsData } = useProductCOGS(product.id, true);
  const marginBadge = useMarginBadge(cogsData?.margin_percentage || 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price);
  };

  const priceWithTax = product.price * (1 + IVA_RATE);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isDisabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(product);
    }
  };

  return (
    <button
      onClick={() => !isDisabled && onSelect(product)}
      onKeyDown={handleKeyDown}
      disabled={isDisabled}
      aria-label={`${product.name} - ${formatPrice(priceWithTax)}${isDisabled ? ' (No disponible)' : ''}`}
      aria-pressed={isSelected}
      className={`
        relative w-full rounded-xl overflow-hidden transition-all duration-200
        ${isSelected ? 'ring-4 ring-amber-500 ring-offset-2' : ''}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:scale-105 cursor-pointer'}
        ${!isDisabled && !isSelected ? 'shadow-md hover:shadow-xl' : ''}
        bg-white
      `}
    >
      {/* Image */}
      <div className="aspect-square relative bg-gradient-to-br from-amber-50 to-orange-100">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Coffee className="w-16 h-16 text-amber-300" strokeWidth={1.5} />
          </div>
        )}

        {/* Status Badge */}
        {isOutOfStock && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Agotado
          </div>
        )}

        {isInactive && (
          <div className="absolute top-2 right-2 bg-gray-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            Inactivo
          </div>
        )}

        {/* Margin Badge - Only show when product has recipe and is not out of stock/inactive */}
        {!isOutOfStock && !isInactive && cogsData && cogsData.has_recipe && (
          <div
            className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${marginBadge.bgClass}`}
            title={`COGS: ${formatPrice(cogsData.total_cost)} | Margen: ${cogsData.margin_percentage.toFixed(1)}%`}
          >
            {cogsData.margin_percentage >= 60 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {cogsData.margin_percentage.toFixed(0)}%
          </div>
        )}

        {/* Stock Indicator */}
        {product.track_inventory &&
          product.current_stock !== undefined &&
          !isOutOfStock && (
            <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm text-gray-700 text-xs px-2 py-1 rounded-lg flex items-center gap-1">
              <Package className="w-3 h-3" />
              <span className="font-medium">{product.current_stock}</span>
            </div>
          )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-left mb-1 line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-xs text-gray-500 text-left mb-2 line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-amber-600">
              {formatPrice(priceWithTax)}
            </span>
            {cogsData && cogsData.has_recipe && (
              <p className="text-xs text-gray-500 mt-0.5">
                Costo: {formatPrice(cogsData.total_cost)}
              </p>
            )}
          </div>

          {product.sku && (
            <span className="text-xs text-gray-400 font-mono">
              {product.sku}
            </span>
          )}
        </div>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-2 left-2 bg-amber-500 text-white rounded-full p-1.5">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </button>
  );
}
