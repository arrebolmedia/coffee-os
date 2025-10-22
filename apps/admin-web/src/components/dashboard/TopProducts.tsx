'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { Package } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { TopProduct } from '@/types';

export function TopProducts() {
  const { data: products, isLoading } = useQuery<TopProduct[]>({
    queryKey: ['dashboard', 'top-products'],
    queryFn: () => apiClient.get('/dashboard/top-products?limit=5'),
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-gray-200 rounded" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Productos Más Vendidos
      </h3>

      <div className="space-y-4">
        {products?.map((product, index) => (
          <div
            key={product.product_id}
            className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {/* Rank */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-amber-700 font-semibold text-sm">
                {index + 1}
              </span>
            </div>

            {/* Image */}
            <div className="flex-shrink-0">
              {product.image_url ? (
                <div className="relative h-12 w-12 rounded-lg overflow-hidden">
                  <Image
                    src={product.image_url}
                    alt={product.product_name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Package className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {product.product_name}
              </p>
              <p className="text-xs text-gray-500">
                {product.quantity_sold} vendidos
              </p>
            </div>

            {/* Revenue */}
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">
                ${product.total_revenue.toLocaleString('es-MX')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
