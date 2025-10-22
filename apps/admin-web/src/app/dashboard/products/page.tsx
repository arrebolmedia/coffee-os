'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import Image from 'next/image';
import { Plus, Search, Filter, Edit, Eye, Folder } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProductModal from '@/components/products/ProductModal';
import ProductActionsMenu from '@/components/products/ProductActionsMenu';
import CategoriesList from '@/components/products/CategoriesList';
import { apiClient } from '@/lib/api-client';
import { Product, Category } from '@/types';

export default function ProductsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [showCategories, setShowCategories] = useState(false);

  // Fetch products
  const { data, isLoading } = useQuery<{ data: Product[]; total: number }>({
    queryKey: ['products', pagination, sorting, columnFilters],
    queryFn: async () => {
      const response = await apiClient.get('/products', {
        params: {
          page: pagination.pageIndex + 1,
          limit: pagination.pageSize,
          sortBy: sorting[0]?.id,
          sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
        },
      });
      return response.data;
    },
  });

  // Fetch categories
  const { data: categoriesData } = useQuery<{ data: Category[] }>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiClient.get('/categories');
      return response.data;
    },
  });

  // Table columns
  const columns: ColumnDef<Product>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
    {
      accessorKey: 'image',
      header: 'Imagen',
      cell: ({ row }) => (
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
          {row.original.image ? (
            <Image
              src={row.original.image}
              alt={row.original.name}
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Eye className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900">{row.original.name}</div>
          {row.original.sku && (
            <div className="text-sm text-gray-500">SKU: {row.original.sku}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Categoría',
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
          {row.original.category?.name || 'Sin categoría'}
        </span>
      ),
    },
    {
      accessorKey: 'price',
      header: 'Precio',
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">
          ${row.original.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: 'stock',
      header: 'Stock',
      cell: ({ row }) => {
        const stock = row.original.stock || 0;
        const lowStock = stock < 10;
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              lowStock
                ? 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {stock} unidades
          </span>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Estado',
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.original.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {row.original.isActive ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <ProductActionsMenu
          product={row.original}
          onEdit={() => {
            setSelectedProduct(row.original);
            setIsModalOpen(true);
          }}
          onDelete={() => {
            // TODO: Implement delete
            console.log('Delete product:', row.original.id);
          }}
          onDuplicate={() => {
            // TODO: Implement duplicate
            console.log('Duplicate product:', row.original.id);
          }}
          onToggleStatus={() => {
            // TODO: Implement toggle status
            console.log('Toggle status:', row.original.id);
          }}
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
  ];

  const table = useReactTable({
    data: data?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    pageCount: Math.ceil((data?.total || 0) / pagination.pageSize),
    manualPagination: true,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona tu catálogo de productos
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCategories(!showCategories)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            >
              <Folder className="h-5 w-5" />
              Categorías
            </button>
            <button
              onClick={() => {
                setSelectedProduct(undefined);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            >
              <Plus className="h-5 w-5" />
              Nuevo Producto
            </button>
          </div>
        </div>

        {/* Categories Panel */}
        {showCategories && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
            <CategoriesList />
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">
            <Filter className="h-5 w-5" />
            Filtros
          </button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={
                              header.column.getCanSort()
                                ? 'flex cursor-pointer select-none items-center gap-2'
                                : ''
                            }
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {header.column.getCanSort() && (
                              <span className="text-gray-400">
                                {{
                                  asc: '↑',
                                  desc: '↓',
                                }[header.column.getIsSorted() as string] ?? '↕'}
                              </span>
                            )}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {isLoading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {columns.map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 animate-pulse rounded bg-gray-200" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-6 py-12 text-center text-sm text-gray-500"
                    >
                      No se encontraron productos
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="whitespace-nowrap px-6 py-4">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando{' '}
                  <span className="font-medium">
                    {pagination.pageIndex * pagination.pageSize + 1}
                  </span>{' '}
                  a{' '}
                  <span className="font-medium">
                    {Math.min(
                      (pagination.pageIndex + 1) * pagination.pageSize,
                      data?.total || 0
                    )}
                  </span>{' '}
                  de <span className="font-medium">{data?.total || 0}</span> productos
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                  <button
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                    className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20 disabled:opacity-50"
                  >
                    Primera
                  </button>
                  <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="relative inline-flex items-center border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-20 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="relative inline-flex items-center border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-20 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                  <button
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                    className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20 disabled:opacity-50"
                  >
                    Última
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Product Modal */}
        <ProductModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProduct(undefined);
          }}
          product={selectedProduct}
          categories={categoriesData?.data || []}
        />
      </div>
    </DashboardLayout>
  );
}
